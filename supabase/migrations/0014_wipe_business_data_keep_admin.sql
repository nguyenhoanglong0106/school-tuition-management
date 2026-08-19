-- Migration 0014: Full data wipe, keep only ADMIN accounts.
-- DESTRUCTIVE. Irreversible without a prior backup. Run only when intended.
--
-- Deletes all business/historical data (students, teachers, classes,
-- schedules, sessions, attendance, fees, payments, financial records,
-- documents, notifications, audit logs, bank accounts) and removes every
-- auth.users / public.profiles account that is not role = 'ADMIN'.
-- Keeps: auth.users + public.profiles rows with role = 'ADMIN', and the
-- public.system_settings row (school config), whose default_bank_account_id
-- is nulled automatically when bank_accounts is cleared.
--
-- NOTE: this does NOT remove files already uploaded to Supabase Storage
-- (avatars, documents, payment receipts). Storage objects must be cleaned
-- up separately (Storage dashboard or Admin API) if desired.

-- 1. Temporarily disable the historical-data delete guard (migration 0013)
--    on every table it protects, so this migration can hard-delete rows.
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'subjects', 'teachers', 'students', 'classes', 'class_students',
        'class_schedules', 'class_sessions', 'attendance', 'student_fees',
        'payments', 'financial_categories', 'financial_transactions',
        'documents', 'bank_accounts'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER trg_prevent_core_delete', tbl);
    END LOOP;
END;
$$;

-- 2. Delete business data, leaf tables first to satisfy RESTRICT/FK order.
DELETE FROM public.notification_recipients;
DELETE FROM public.notifications;
DELETE FROM public.document_classes;
DELETE FROM public.attendance;
DELETE FROM public.class_sessions;
DELETE FROM public.documents;
DELETE FROM public.class_schedules;
DELETE FROM public.class_students;
DELETE FROM public.financial_transactions;
DELETE FROM public.payments;
DELETE FROM public.student_fees;
DELETE FROM public.classes;
DELETE FROM public.financial_categories;
DELETE FROM public.subjects;
DELETE FROM public.teachers;
DELETE FROM public.students;
DELETE FROM public.audit_logs;
DELETE FROM public.bank_accounts;

-- 3. Re-enable the delete guard so future accidental deletes are still blocked.
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'subjects', 'teachers', 'students', 'classes', 'class_students',
        'class_schedules', 'class_sessions', 'attendance', 'student_fees',
        'payments', 'financial_categories', 'financial_transactions',
        'documents', 'bank_accounts'
    ] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER trg_prevent_core_delete', tbl);
    END LOOP;
END;
$$;

-- 4. Remove every account that is not an ADMIN. Deleting from auth.users
--    cascades to public.profiles (profiles.id REFERENCES auth.users(id)
--    ON DELETE CASCADE), so profiles do not need a separate DELETE.
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles WHERE role = 'ADMIN');

-- 5. Report what is left.
DO $$
DECLARE
    v_admins INT;
BEGIN
    SELECT COUNT(*) INTO v_admins FROM public.profiles WHERE role = 'ADMIN';
    RAISE NOTICE 'Wipe complete. Remaining ADMIN accounts: %', v_admins;
END;
$$;
