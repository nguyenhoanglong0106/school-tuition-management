-- Per-enrollment billing overrides and monthly attendance-based fees.
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS session_fee NUMERIC(15, 2) NOT NULL DEFAULT 0
  CHECK (session_fee >= 0);

ALTER TABLE public.class_students
  ADD COLUMN IF NOT EXISTS billing_type_override VARCHAR(20)
  CHECK (billing_type_override IS NULL OR billing_type_override IN ('MONTHLY', 'PER_SESSION')),
  ADD COLUMN IF NOT EXISTS session_fee_override NUMERIC(15, 2)
  CHECK (session_fee_override IS NULL OR session_fee_override >= 0);

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_fee_cycle_check;
ALTER TABLE public.classes
  ADD CONSTRAINT classes_fee_cycle_check
  CHECK (fee_cycle IN ('MONTHLY', 'PER_SESSION', 'COURSE', 'CUSTOM'));

CREATE OR REPLACE FUNCTION public.create_class_monthly_fees(
    p_class_id UUID,
    p_month INT,
    p_year INT,
    p_due_date DATE
)
RETURNS JSONB AS $$
DECLARE
    v_class RECORD;
    v_cs RECORD;
    v_attended_count INT;
    v_billing_type TEXT;
    v_unit_fee NUMERIC;
    v_original_amount NUMERIC;
    v_discount NUMERIC;
    v_final_amount NUMERIC;
    v_fee_code TEXT;
    v_created_count INT := 0;
    v_skipped_count INT := 0;
    v_period_label TEXT;
    v_notif_id UUID;
    v_month_start DATE := make_date(p_year, p_month, 1);
    v_next_month DATE := (make_date(p_year, p_month, 1) + INTERVAL '1 month')::DATE;
BEGIN
    IF p_month NOT BETWEEN 1 AND 12 THEN
        RAISE EXCEPTION 'Tháng không hợp lệ';
    END IF;

    SELECT * INTO v_class FROM public.classes WHERE id = p_class_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy lớp học';
    END IF;

    v_period_label := 'Tháng ' || LPAD(p_month::TEXT, 2, '0') || '/' || p_year::TEXT;

    FOR v_cs IN
        SELECT cs.*, s.full_name, s.profile_id
        FROM public.class_students cs
        JOIN public.students s ON cs.student_id = s.id
        WHERE cs.class_id = p_class_id
          AND cs.status = 'ACTIVE'
          AND s.status = 'ACTIVE'
    LOOP
        IF EXISTS (
            SELECT 1 FROM public.student_fees
            WHERE student_id = v_cs.student_id
              AND class_id = p_class_id
              AND year = p_year
              AND month = p_month
        ) THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        v_billing_type := COALESCE(v_cs.billing_type_override, v_class.fee_cycle);
        v_discount := COALESCE(v_cs.discount_amount, 0);

        IF v_billing_type = 'PER_SESSION' THEN
            SELECT COUNT(*)::INT INTO v_attended_count
            FROM public.attendance a
            JOIN public.class_sessions sess ON sess.id = a.session_id
            WHERE sess.class_id = p_class_id
              AND sess.session_date >= v_month_start
              AND sess.session_date < v_next_month
              AND a.student_id = v_cs.student_id
              AND a.status IN ('PRESENT', 'LATE');

            v_unit_fee := COALESCE(v_cs.session_fee_override, v_class.session_fee, 0);
            v_original_amount := v_attended_count * v_unit_fee;
            v_period_label := 'Tháng ' || LPAD(p_month::TEXT, 2, '0') || '/' || p_year::TEXT ||
                ' (' || v_attended_count || ' buổi)';

            IF v_attended_count = 0 OR v_original_amount = 0 THEN
                CONTINUE;
            END IF;
        ELSE
            v_original_amount := COALESCE(v_cs.custom_tuition_fee, v_class.tuition_fee);
            v_period_label := 'Tháng ' || LPAD(p_month::TEXT, 2, '0') || '/' || p_year::TEXT;
        END IF;

        v_final_amount := GREATEST(0, v_original_amount - v_discount);
        v_fee_code := public.generate_fee_code(p_month, p_year);

        INSERT INTO public.student_fees (
            fee_code, student_id, class_id, year, month, period_label,
            original_amount, discount_amount, final_amount, paid_amount,
            remaining_amount, due_date, status, note
        ) VALUES (
            v_fee_code, v_cs.student_id, p_class_id, p_year, p_month, v_period_label,
            v_original_amount, v_discount, v_final_amount, 0,
            v_final_amount, p_due_date, 'UNPAID',
            CASE WHEN v_billing_type = 'PER_SESSION'
              THEN 'Tính theo PRESENT/LATE trong tháng'
              ELSE NULL
            END
        );

        v_created_count := v_created_count + 1;

        IF v_cs.profile_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                title, message, type, class_id, created_by, created_at
            ) VALUES (
                'Thông báo học phí mới',
                'Học phí ' || v_period_label || ' lớp ' || v_class.class_name ||
                ' đã được tạo. Số tiền: ' || TO_CHAR(v_final_amount, 'FM999,999,999,999') ||
                ' đ. Hạn đóng: ' || TO_CHAR(p_due_date, 'DD/MM/YYYY'),
                'TUITION', p_class_id, auth.uid(), NOW()
            ) RETURNING id INTO v_notif_id;

            INSERT INTO public.notification_recipients (notification_id, user_id)
            VALUES (v_notif_id, v_cs.profile_id);
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'created_count', v_created_count,
        'skipped_count', v_skipped_count,
        'period_label', 'Tháng ' || LPAD(p_month::TEXT, 2, '0') || '/' || p_year::TEXT
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
