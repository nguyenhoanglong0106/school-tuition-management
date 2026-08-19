-- Migration 0006: RLS Hardening
-- Tightens policies from 0003_rls.sql that allowed any authenticated
-- TEACHER to write notifications/documents for classes they do NOT teach,
-- or to read every user's profile. A teacher may only send notifications
-- for, and attach documents to, their own classes.

-- ==========================================
-- PROFILES: a teacher should only see their own profile plus profiles of
-- students currently enrolled in their own classes — not every user's
-- name/phone/email in the system (previous policy let any teacher read all).
-- ==========================================
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;

CREATE POLICY "Profiles select policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.students s
                JOIN public.class_students cs ON cs.student_id = s.id
                JOIN public.classes c ON cs.class_id = c.id
                WHERE s.profile_id = profiles.id
                  AND c.teacher_id = public.get_teacher_id()
                  AND cs.status = 'ACTIVE'
            )
        )
    );

-- ==========================================
-- NOTIFICATIONS: split FOR ALL into scoped INSERT / UPDATE / DELETE
-- ==========================================
DROP POLICY IF EXISTS "Notifications write policy" ON public.notifications;

CREATE POLICY "Notifications insert policy" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.is_teacher()
            AND class_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.classes c
                WHERE c.id = notifications.class_id AND c.teacher_id = public.get_teacher_id()
            )
        )
    );

CREATE POLICY "Notifications update policy" ON public.notifications
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR created_by = auth.uid())
    WITH CHECK (public.is_admin() OR created_by = auth.uid());

CREATE POLICY "Notifications delete policy" ON public.notifications
    FOR DELETE TO authenticated
    USING (public.is_admin() OR created_by = auth.uid());

-- ==========================================
-- DOCUMENT_CLASSES: teacher may only assign documents to their own classes
-- ==========================================
DROP POLICY IF EXISTS "Document classes policy" ON public.document_classes;

CREATE POLICY "Document classes select policy" ON public.document_classes
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.classes c WHERE c.id = document_classes.class_id AND c.teacher_id = public.get_teacher_id()
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.class_students cs
            WHERE cs.class_id = document_classes.class_id AND cs.student_id = public.get_student_id() AND cs.status = 'ACTIVE'
        )
    );

CREATE POLICY "Document classes write policy" ON public.document_classes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.classes c WHERE c.id = document_classes.class_id AND c.teacher_id = public.get_teacher_id()
            )
        )
    );

CREATE POLICY "Document classes delete policy" ON public.document_classes
    FOR DELETE TO authenticated
    USING (
        public.is_admin()
        OR (
            public.is_teacher() AND EXISTS (
                SELECT 1 FROM public.classes c WHERE c.id = document_classes.class_id AND c.teacher_id = public.get_teacher_id()
            )
        )
    );

-- ==========================================
-- DOCUMENTS: teacher may upload, but only the uploader (or admin) may edit/delete
-- ==========================================
DROP POLICY IF EXISTS "Documents write policy" ON public.documents;

CREATE POLICY "Documents insert policy" ON public.documents
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_teacher());

CREATE POLICY "Documents update policy" ON public.documents
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR uploaded_by = auth.uid())
    WITH CHECK (public.is_admin() OR uploaded_by = auth.uid());

CREATE POLICY "Documents delete policy" ON public.documents
    FOR DELETE TO authenticated
    USING (public.is_admin() OR uploaded_by = auth.uid());
