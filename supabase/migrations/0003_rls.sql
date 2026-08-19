-- Migration 0003: Row Level Security (RLS) Policies

-- 1. Helper Security Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'TEACHER' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_student_id()
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM public.students WHERE profile_id = auth.uid();
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_teacher_id()
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM public.teachers WHERE profile_id = auth.uid();
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLICIES: PROFILES
-- ==========================================
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles insert policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- ==========================================
-- POLICIES: STUDENTS
-- ==========================================
DROP POLICY IF EXISTS "Students select policy" ON public.students;
CREATE POLICY "Students select policy" ON public.students
    FOR SELECT TO authenticated
    USING (
        public.is_admin() 
        OR profile_id = auth.uid()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.class_students cs
                JOIN public.classes c ON cs.class_id = c.id
                WHERE cs.student_id = students.id 
                  AND c.teacher_id = public.get_teacher_id()
                  AND cs.status = 'ACTIVE'
            )
        )
    );

DROP POLICY IF EXISTS "Students admin write policy" ON public.students;
CREATE POLICY "Students admin write policy" ON public.students
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==========================================
-- POLICIES: TEACHERS
-- ==========================================
DROP POLICY IF EXISTS "Teachers select policy" ON public.teachers;
CREATE POLICY "Teachers select policy" ON public.teachers
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Teachers admin write policy" ON public.teachers;
CREATE POLICY "Teachers admin write policy" ON public.teachers
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==========================================
-- POLICIES: SUBJECTS
-- ==========================================
DROP POLICY IF EXISTS "Subjects select policy" ON public.subjects;
CREATE POLICY "Subjects select policy" ON public.subjects
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Subjects admin write policy" ON public.subjects;
CREATE POLICY "Subjects admin write policy" ON public.subjects
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==========================================
-- POLICIES: CLASSES
-- ==========================================
DROP POLICY IF EXISTS "Classes select policy" ON public.classes;
CREATE POLICY "Classes select policy" ON public.classes
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR (public.is_teacher() AND teacher_id = public.get_teacher_id())
        OR EXISTS (
            SELECT 1 FROM public.class_students cs
            WHERE cs.class_id = classes.id 
              AND cs.student_id = public.get_student_id()
              AND cs.status = 'ACTIVE'
        )
    );

DROP POLICY IF EXISTS "Classes admin write policy" ON public.classes;
CREATE POLICY "Classes admin write policy" ON public.classes
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==========================================
-- POLICIES: CLASS STUDENTS
-- ==========================================
DROP POLICY IF EXISTS "Class students select policy" ON public.class_students;
CREATE POLICY "Class students select policy" ON public.class_students
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR student_id = public.get_student_id()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.classes c
                WHERE c.id = class_students.class_id AND c.teacher_id = public.get_teacher_id()
            )
        )
    );

DROP POLICY IF EXISTS "Class students admin write policy" ON public.class_students;
CREATE POLICY "Class students admin write policy" ON public.class_students
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==========================================
-- POLICIES: SCHEDULES & SESSIONS
-- ==========================================
DROP POLICY IF EXISTS "Schedules select policy" ON public.class_schedules;
CREATE POLICY "Schedules select policy" ON public.class_schedules
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = class_schedules.class_id 
              AND (
                  c.teacher_id = public.get_teacher_id() 
                  OR EXISTS (
                      SELECT 1 FROM public.class_students cs 
                      WHERE cs.class_id = c.id AND cs.student_id = public.get_student_id()
                  )
              )
        )
    );

DROP POLICY IF EXISTS "Schedules admin write policy" ON public.class_schedules;
CREATE POLICY "Schedules admin write policy" ON public.class_schedules
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Sessions select policy" ON public.class_sessions;
CREATE POLICY "Sessions select policy" ON public.class_sessions
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = class_sessions.class_id 
              AND (
                  c.teacher_id = public.get_teacher_id() 
                  OR EXISTS (
                      SELECT 1 FROM public.class_students cs 
                      WHERE cs.class_id = c.id AND cs.student_id = public.get_student_id()
                  )
              )
        )
    );

DROP POLICY IF EXISTS "Sessions write policy" ON public.class_sessions;
CREATE POLICY "Sessions write policy" ON public.class_sessions
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.classes c
                WHERE c.id = class_sessions.class_id AND c.teacher_id = public.get_teacher_id()
            )
        )
    );

-- ==========================================
-- POLICIES: ATTENDANCE
-- ==========================================
DROP POLICY IF EXISTS "Attendance select policy" ON public.attendance;
CREATE POLICY "Attendance select policy" ON public.attendance
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR student_id = public.get_student_id()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.class_sessions cs
                JOIN public.classes c ON cs.class_id = c.id
                WHERE cs.id = attendance.session_id AND c.teacher_id = public.get_teacher_id()
            )
        )
    );

DROP POLICY IF EXISTS "Attendance write policy" ON public.attendance;
CREATE POLICY "Attendance write policy" ON public.attendance
    FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.class_sessions cs
                JOIN public.classes c ON cs.class_id = c.id
                WHERE cs.id = attendance.session_id AND c.teacher_id = public.get_teacher_id()
            )
        )
    );

-- ==========================================
-- POLICIES: STUDENT FEES (ADMIN & OWN STUDENT ONLY)
-- ==========================================
DROP POLICY IF EXISTS "Fees select policy" ON public.student_fees;
CREATE POLICY "Fees select policy" ON public.student_fees
    FOR SELECT TO authenticated
    USING (public.is_admin() OR student_id = public.get_student_id());

DROP POLICY IF EXISTS "Fees admin write policy" ON public.student_fees;
CREATE POLICY "Fees admin write policy" ON public.student_fees
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==========================================
-- POLICIES: PAYMENTS
-- ==========================================
DROP POLICY IF EXISTS "Payments select policy" ON public.payments;
CREATE POLICY "Payments select policy" ON public.payments
    FOR SELECT TO authenticated
    USING (public.is_admin() OR student_id = public.get_student_id());

DROP POLICY IF EXISTS "Payments student insert policy" ON public.payments;
CREATE POLICY "Payments student insert policy" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin() 
        OR (
            student_id = public.get_student_id() 
            AND status = 'PENDING'
        )
    );

DROP POLICY IF EXISTS "Payments admin write policy" ON public.payments;
CREATE POLICY "Payments admin write policy" ON public.payments
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Payments admin delete policy" ON public.payments;
CREATE POLICY "Payments admin delete policy" ON public.payments
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ==========================================
-- POLICIES: FINANCE (ADMIN ONLY)
-- ==========================================
DROP POLICY IF EXISTS "Finance categories admin policy" ON public.financial_categories;
CREATE POLICY "Finance categories admin policy" ON public.financial_categories
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Finance transactions admin policy" ON public.financial_transactions;
CREATE POLICY "Finance transactions admin policy" ON public.financial_transactions
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==========================================
-- POLICIES: DOCUMENTS
-- ==========================================
DROP POLICY IF EXISTS "Documents select policy" ON public.documents;
CREATE POLICY "Documents select policy" ON public.documents
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR visibility = 'ALL'
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.document_classes dc
                JOIN public.classes c ON dc.class_id = c.id
                WHERE dc.document_id = documents.id AND c.teacher_id = public.get_teacher_id()
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.document_classes dc
            JOIN public.class_students cs ON dc.class_id = cs.class_id
            WHERE dc.document_id = documents.id 
              AND cs.student_id = public.get_student_id() 
              AND cs.status = 'ACTIVE'
        )
    );

DROP POLICY IF EXISTS "Documents write policy" ON public.documents;
CREATE POLICY "Documents write policy" ON public.documents
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_teacher())
    WITH CHECK (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "Document classes policy" ON public.document_classes;
CREATE POLICY "Document classes policy" ON public.document_classes
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_teacher())
    WITH CHECK (public.is_admin() OR public.is_teacher());

-- ==========================================
-- POLICIES: NOTIFICATIONS
-- ==========================================
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
CREATE POLICY "Notifications select policy" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR class_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.class_students cs
            WHERE cs.class_id = notifications.class_id 
              AND cs.student_id = public.get_student_id() 
              AND cs.status = 'ACTIVE'
        )
        OR EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = notifications.class_id AND c.teacher_id = public.get_teacher_id()
        )
    );

DROP POLICY IF EXISTS "Notifications write policy" ON public.notifications;
CREATE POLICY "Notifications write policy" ON public.notifications
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_teacher())
    WITH CHECK (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "Notification recipients policy" ON public.notification_recipients;
CREATE POLICY "Notification recipients policy" ON public.notification_recipients
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ==========================================
-- POLICIES: BANK ACCOUNTS & SYSTEM SETTINGS
-- ==========================================
DROP POLICY IF EXISTS "Bank accounts select policy" ON public.bank_accounts;
CREATE POLICY "Bank accounts select policy" ON public.bank_accounts
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Bank accounts admin write policy" ON public.bank_accounts;
CREATE POLICY "Bank accounts admin write policy" ON public.bank_accounts
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "System settings select policy" ON public.system_settings;
CREATE POLICY "System settings select policy" ON public.system_settings
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "System settings admin write policy" ON public.system_settings;
CREATE POLICY "System settings admin write policy" ON public.system_settings
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==========================================
-- POLICIES: AUDIT LOGS
-- ==========================================
DROP POLICY IF EXISTS "Audit logs admin policy" ON public.audit_logs;
CREATE POLICY "Audit logs admin policy" ON public.audit_logs
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
