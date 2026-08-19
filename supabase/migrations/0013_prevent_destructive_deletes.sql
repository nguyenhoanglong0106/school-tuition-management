-- Protect historical records from accidental hard deletion.
CREATE OR REPLACE FUNCTION public.prevent_core_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Không được xóa dữ liệu lịch sử trong bảng %. Hãy chuyển sang trạng thái ngừng hoạt động hoặc hủy.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'subjects',
        'teachers',
        'students',
        'classes',
        'class_students',
        'class_schedules',
        'class_sessions',
        'attendance',
        'student_fees',
        'payments',
        'financial_categories',
        'financial_transactions',
        'documents',
        'bank_accounts'
    ] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_core_delete ON public.%I', table_name);
        EXECUTE format(
            'CREATE TRIGGER trg_prevent_core_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_core_delete()',
            table_name
        );
    END LOOP;
END;
$$;
