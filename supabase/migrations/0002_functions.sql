-- Migration 0002: Stored Procedures, Business Logic RPC, Triggers & Code Generators

-- 1. Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN (
            'profiles', 'students', 'teachers', 'subjects', 'classes', 
            'class_students', 'class_schedules', 'class_sessions', 'attendance', 
            'student_fees', 'payments', 'financial_categories', 'financial_transactions', 
            'documents', 'bank_accounts', 'system_settings'
          )
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
            CREATE TRIGGER trg_set_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
        ', t, t);
    END LOOP;
END;
$$;

-- 2. Code Generator Functions
CREATE OR REPLACE FUNCTION public.generate_student_code()
RETURNS TEXT AS $$
DECLARE
    v_next_val BIGINT;
    v_code TEXT;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(student_code FROM 3)::BIGINT), 0) + 1
    INTO v_next_val
    FROM public.students
    WHERE student_code ~ '^HS[0-9]+$';

    v_code := 'HS' || LPAD(v_next_val::TEXT, 6, '0');
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_teacher_code()
RETURNS TEXT AS $$
DECLARE
    v_next_val BIGINT;
    v_code TEXT;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(teacher_code FROM 3)::BIGINT), 0) + 1
    INTO v_next_val
    FROM public.teachers
    WHERE teacher_code ~ '^GV[0-9]+$';

    v_code := 'GV' || LPAD(v_next_val::TEXT, 6, '0');
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_fee_code(p_month INT, p_year INT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_val BIGINT;
    v_code TEXT;
BEGIN
    v_prefix := 'HP' || LPAD(p_month::TEXT, 2, '0') || p_year::TEXT;
    
    SELECT COALESCE(MAX(SUBSTRING(fee_code FROM LENGTH(v_prefix) + 1)::BIGINT), 0) + 1
    INTO v_next_val
    FROM public.student_fees
    WHERE fee_code LIKE (v_prefix || '%');

    v_code := v_prefix || LPAD(v_next_val::TEXT, 6, '0');
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_payment_code(p_month INT, p_year INT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_val BIGINT;
    v_code TEXT;
BEGIN
    v_prefix := 'PT' || LPAD(p_month::TEXT, 2, '0') || p_year::TEXT;
    
    SELECT COALESCE(MAX(SUBSTRING(payment_code FROM LENGTH(v_prefix) + 1)::BIGINT), 0) + 1
    INTO v_next_val
    FROM public.payments
    WHERE payment_code LIKE (v_prefix || '%');

    v_code := v_prefix || LPAD(v_next_val::TEXT, 6, '0');
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_transaction_code(p_type VARCHAR)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_month_year TEXT;
    v_next_val BIGINT;
    v_code TEXT;
BEGIN
    v_month_year := TO_CHAR(CURRENT_DATE, 'MMYYYY');
    IF p_type = 'INCOME' THEN
        v_prefix := 'TH' || v_month_year;
    ELSE
        v_prefix := 'CH' || v_month_year;
    END IF;
    
    SELECT COALESCE(MAX(SUBSTRING(transaction_code FROM LENGTH(v_prefix) + 1)::BIGINT), 0) + 1
    INTO v_next_val
    FROM public.financial_transactions
    WHERE transaction_code LIKE (v_prefix || '%');

    v_code := v_prefix || LPAD(v_next_val::TEXT, 6, '0');
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 3. Confirm Payment Transactional RPC
CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_caller_role VARCHAR;
    v_payment RECORD;
    v_fee RECORD;
    v_student RECORD;
    v_total_paid NUMERIC;
    v_new_remaining NUMERIC;
    v_new_status VARCHAR;
    v_cat_id UUID;
    v_trans_code TEXT;
    v_notif_id UUID;
BEGIN
    -- 1. Verify caller is ADMIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền xác nhận thanh toán';
    END IF;

    -- 2. Lock payment row
    SELECT * INTO v_payment 
    FROM public.payments 
    WHERE id = p_payment_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy giao dịch thanh toán';
    END IF;

    IF v_payment.status = 'CONFIRMED' THEN
        RAISE EXCEPTION 'Giao dịch này đã được xác nhận trước đó';
    END IF;

    IF v_payment.status IN ('REJECTED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Giao dịch đã bị từ chối hoặc đã hủy';
    END IF;

    -- 3. Lock & Fetch Fee
    SELECT * INTO v_fee 
    FROM public.student_fees 
    WHERE id = v_payment.student_fee_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy khoản học phí tương ứng';
    END IF;

    SELECT * INTO v_student FROM public.students WHERE id = v_fee.student_id;

    -- 4. Update Payment to CONFIRMED
    UPDATE public.payments
    SET status = 'CONFIRMED',
        confirmed_by = auth.uid(),
        confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- 5. Calculate new Fee amounts
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM public.payments
    WHERE student_fee_id = v_fee.id AND status = 'CONFIRMED';

    v_new_remaining := GREATEST(0, v_fee.final_amount - v_total_paid);

    IF v_total_paid >= v_fee.final_amount THEN
        v_new_status := 'PAID';
    ELSIF v_total_paid > 0 THEN
        v_new_status := 'PARTIAL';
    ELSIF v_fee.due_date < CURRENT_DATE THEN
        v_new_status := 'OVERDUE';
    ELSE
        v_new_status := 'UNPAID';
    END IF;

    UPDATE public.student_fees
    SET paid_amount = v_total_paid,
        remaining_amount = v_new_remaining,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = v_fee.id;

    -- 6. Insert Financial Transaction (Income)
    -- Find or create Tuition category
    SELECT id INTO v_cat_id FROM public.financial_categories WHERE name = 'Học phí' AND type = 'INCOME' LIMIT 1;
    IF v_cat_id IS NULL THEN
        INSERT INTO public.financial_categories (name, type) VALUES ('Học phí', 'INCOME') RETURNING id INTO v_cat_id;
    END IF;

    v_trans_code := public.generate_transaction_code('INCOME');

    INSERT INTO public.financial_transactions (
        transaction_code, type, category_id, amount, transaction_date,
        payment_method, payment_id, reference, description, created_by
    ) VALUES (
        v_trans_code, 'INCOME', v_cat_id, v_payment.amount, CURRENT_DATE,
        v_payment.payment_method, v_payment.id, v_payment.payment_code,
        'Thu học phí: ' || v_fee.fee_code || ' - Học viên: ' || COALESCE(v_student.full_name, ''),
        auth.uid()
    );

    -- 7. Send Notification to Student if linked with profile
    IF v_student.profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            title, message, type, created_by, created_at
        ) VALUES (
            'Thanh toán học phí thành công',
            'Khoản thanh toán mã ' || v_payment.payment_code || ' (Số tiền: ' || TO_CHAR(v_payment.amount, 'FM999,999,999,999') || ' đ) cho kỳ ' || v_fee.period_label || ' đã được xác nhận.',
            'PAYMENT',
            auth.uid(),
            NOW()
        ) RETURNING id INTO v_notif_id;

        INSERT INTO public.notification_recipients (notification_id, user_id)
        VALUES (v_notif_id, v_student.profile_id);
    END IF;

    -- 8. Audit Log
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, old_data, new_data)
    VALUES (
        auth.uid(),
        'CONFIRM_PAYMENT',
        'payments',
        p_payment_id,
        jsonb_build_object('status', 'PENDING', 'amount', v_payment.amount),
        jsonb_build_object('status', 'CONFIRMED', 'paid_amount', v_total_paid, 'fee_status', v_new_status)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Xác nhận thanh toán thành công',
        'payment_id', p_payment_id,
        'fee_status', v_new_status,
        'remaining_amount', v_new_remaining
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reject Payment RPC
CREATE OR REPLACE FUNCTION public.reject_payment(p_payment_id UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
    v_caller_role VARCHAR;
    v_payment RECORD;
    v_fee RECORD;
    v_student RECORD;
    v_notif_id UUID;
BEGIN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới có quyền từ chối thanh toán';
    END IF;

    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy giao dịch';
    END IF;

    IF v_payment.status = 'CONFIRMED' THEN
        RAISE EXCEPTION 'Không thể từ chối giao dịch đã được xác nhận';
    END IF;

    SELECT * INTO v_fee FROM public.student_fees WHERE id = v_payment.student_fee_id;
    SELECT * INTO v_student FROM public.students WHERE id = v_payment.student_id;

    UPDATE public.payments
    SET status = 'REJECTED',
        note = COALESCE(note, '') || ' [Từ chối: ' || COALESCE(p_reason, 'Lý do không xác định') || ']',
        updated_at = NOW()
    WHERE id = p_payment_id;

    IF v_student.profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            title, message, type, created_by, created_at
        ) VALUES (
            'Giao dịch thanh toán chưa được xác nhận',
            'Giao dịch mã ' || v_payment.payment_code || ' đã bị từ chối. Lý do: ' || COALESCE(p_reason, 'Thông tin không khớp') || '. Vui lòng liên hệ trung tâm để được hỗ trợ.',
            'PAYMENT',
            auth.uid(),
            NOW()
        ) RETURNING id INTO v_notif_id;

        INSERT INTO public.notification_recipients (notification_id, user_id)
        VALUES (v_notif_id, v_student.profile_id);
    END IF;

    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, old_data, new_data)
    VALUES (
        auth.uid(),
        'REJECT_PAYMENT',
        'payments',
        p_payment_id,
        jsonb_build_object('status', v_payment.status),
        jsonb_build_object('status', 'REJECTED', 'reason', p_reason)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Đã từ chối giao dịch');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Batch Fee Creation Function
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
        -- Check duplicate
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

        -- Notify student
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

-- 6. Generate Sessions from Recurring Schedules
CREATE OR REPLACE FUNCTION public.generate_sessions_from_schedule(
    p_class_id UUID,
    p_from_date DATE,
    p_to_date DATE
)
RETURNS JSONB AS $$
DECLARE
    v_curr_date DATE;
    v_dow INT;
    v_sched RECORD;
    v_created_count INT := 0;
BEGIN
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
            -- Check if session already exists on this day for this class & time
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

-- 7. High Performance Dashboard Metrics RPC
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
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

-- 8. Notification Mark Read RPC
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notification_recipients
    SET read_at = NOW()
    WHERE notification_id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
    UPDATE public.notification_recipients
    SET read_at = NOW()
    WHERE user_id = auth.uid() AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
