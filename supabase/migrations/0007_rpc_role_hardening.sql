-- Migration 0007: RPC Role Hardening
-- Three SECURITY DEFINER functions from 0002_functions.sql never checked the
-- caller's role. Because SECURITY DEFINER runs with the function owner's
-- privileges, these calls bypass Row Level Security entirely — meaning any
-- authenticated STUDENT or TEACHER could previously call them directly via
-- supabase.rpc(...) and:
--   - create_class_monthly_fees: mass-create student_fees for any class
--   - generate_sessions_from_schedule: create class_sessions for any class
--   - get_admin_dashboard_metrics: read center-wide income/expense/overdue
--     totals that must stay admin-only
-- This migration re-adds a role check identical in style to confirm_payment()
-- / reject_payment(), keeping the rest of each function body unchanged.

CREATE OR REPLACE FUNCTION public.create_class_monthly_fees(
    p_class_id UUID,
    p_month INT,
    p_year INT,
    p_due_date DATE
)
RETURNS JSONB AS $$
DECLARE
    v_caller_role VARCHAR;
    v_class RECORD;
    v_cs RECORD;
    v_student RECORD;
    v_original_amount NUMERIC;
    v_discount NUMERIC;
    v_final_amount NUMERIC;
    v_fee_code TEXT;
    v_created_count INT := 0;
    v_skipped_count INT := 0;
    v_period_label TEXT;
    v_notif_id UUID;
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền tạo học phí hàng loạt';
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

        v_original_amount := COALESCE(v_cs.custom_tuition_fee, v_class.tuition_fee);
        v_discount := COALESCE(v_cs.discount_amount, 0);
        v_final_amount := GREATEST(0, v_original_amount - v_discount);
        v_fee_code := public.generate_fee_code(p_month, p_year);

        INSERT INTO public.student_fees (
            fee_code, student_id, class_id, year, month, period_label,
            original_amount, discount_amount, final_amount, paid_amount,
            remaining_amount, due_date, status
        ) VALUES (
            v_fee_code, v_cs.student_id, p_class_id, p_year, p_month, v_period_label,
            v_original_amount, v_discount, v_final_amount, 0,
            v_final_amount, p_due_date, 'UNPAID'
        );

        v_created_count := v_created_count + 1;

        IF v_cs.profile_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                title, message, type, class_id, created_by, created_at
            ) VALUES (
                'Thông báo học phí mới',
                'Học phí ' || v_period_label || ' lớp ' || v_class.class_name || ' đã được tạo. Số tiền: ' || TO_CHAR(v_final_amount, 'FM999,999,999,999') || ' đ. Hạn đóng: ' || TO_CHAR(p_due_date, 'DD/MM/YYYY'),
                'TUITION',
                p_class_id,
                auth.uid(),
                NOW()
            ) RETURNING id INTO v_notif_id;

            INSERT INTO public.notification_recipients (notification_id, user_id)
            VALUES (v_notif_id, v_cs.profile_id);
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'created_count', v_created_count,
        'skipped_count', v_skipped_count,
        'period_label', v_period_label
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_sessions_from_schedule(
    p_class_id UUID,
    p_from_date DATE,
    p_to_date DATE
)
RETURNS JSONB AS $$
DECLARE
    v_caller_role VARCHAR;
    v_curr_date DATE;
    v_dow INT;
    v_sched RECORD;
    v_created_count INT := 0;
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền sinh buổi học';
    END IF;

    IF p_from_date > p_to_date THEN
        RAISE EXCEPTION 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc';
    END IF;

    v_curr_date := p_from_date;
    WHILE v_curr_date <= p_to_date LOOP
        v_dow := EXTRACT(DOW FROM v_curr_date)::INT;

        FOR v_sched IN
            SELECT * FROM public.class_schedules
            WHERE class_id = p_class_id
              AND day_of_week = v_dow
              AND is_active = true
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.class_sessions
                WHERE class_id = p_class_id
                  AND session_date = v_curr_date
                  AND start_time = v_sched.start_time
            ) THEN
                INSERT INTO public.class_sessions (
                    class_id, session_date, start_time, end_time, room, status
                ) VALUES (
                    p_class_id, v_curr_date, v_sched.start_time, v_sched.end_time, v_sched.room, 'SCHEDULED'
                );
                v_created_count := v_created_count + 1;
            END IF;
        END LOOP;

        v_curr_date := v_curr_date + INTERVAL '1 day';
    END LOOP;

    RETURN jsonb_build_object('success', true, 'created_count', v_created_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
    v_caller_role VARCHAR;
    v_total_students BIGINT;
    v_active_students BIGINT;
    v_total_classes BIGINT;
    v_today_sessions BIGINT;
    v_month_expected NUMERIC;
    v_month_collected NUMERIC;
    v_month_remaining NUMERIC;
    v_overdue_count BIGINT;
    v_month_income NUMERIC;
    v_month_expense NUMERIC;
    v_today_absent BIGINT;
    v_pending_payments BIGINT;
    v_current_month INT := EXTRACT(MONTH FROM CURRENT_DATE)::INT;
    v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền xem số liệu tổng quan';
    END IF;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'ACTIVE' AND deleted_at IS NULL)
    INTO v_total_students, v_active_students
    FROM public.students
    WHERE deleted_at IS NULL;

    SELECT COUNT(*) INTO v_total_classes FROM public.classes WHERE status = 'ACTIVE' AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_today_sessions
    FROM public.class_sessions
    WHERE session_date = CURRENT_DATE AND status != 'CANCELLED';

    SELECT
        COALESCE(SUM(final_amount), 0),
        COALESCE(SUM(paid_amount), 0),
        COALESCE(SUM(remaining_amount), 0),
        COUNT(*) FILTER (WHERE (status = 'OVERDUE' OR (due_date < CURRENT_DATE AND remaining_amount > 0)))
    INTO v_month_expected, v_month_collected, v_month_remaining, v_overdue_count
    FROM public.student_fees
    WHERE month = v_current_month AND year = v_current_year;

    SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0),
        COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)
    INTO v_month_income, v_month_expense
    FROM public.financial_transactions
    WHERE EXTRACT(MONTH FROM transaction_date) = v_current_month
      AND EXTRACT(YEAR FROM transaction_date) = v_current_year;

    SELECT COUNT(*) INTO v_today_absent
    FROM public.attendance a
    JOIN public.class_sessions cs ON a.session_id = cs.id
    WHERE cs.session_date = CURRENT_DATE AND a.status IN ('ABSENT', 'EXCUSED');

    SELECT COUNT(*) INTO v_pending_payments
    FROM public.payments
    WHERE status = 'PENDING';

    RETURN jsonb_build_object(
        'total_students', v_total_students,
        'active_students', v_active_students,
        'total_classes', v_total_classes,
        'today_sessions', v_today_sessions,
        'month_expected_fees', v_month_expected,
        'month_collected_fees', v_month_collected,
        'month_remaining_fees', v_month_remaining,
        'overdue_fees_count', v_overdue_count,
        'month_income', v_month_income,
        'month_expense', v_month_expense,
        'month_profit', (v_month_income - v_month_expense),
        'today_absent_count', v_today_absent,
        'pending_payments_count', v_pending_payments
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
