-- Migration 0010: Fix RLS Infinite Recursion (classes <-> class_students)
-- "Classes select policy" (0003) queries class_students directly, and
-- "Class students select policy" (0003) queries classes directly — each one
-- a plain subquery, NOT wrapped in a SECURITY DEFINER function. Postgres
-- detects the resulting circular dependency and raises
-- "infinite recursion detected in policy for relation class_students"
-- (error 42P17) whenever either table is scanned for a row the caller
-- doesn't directly own (e.g. a Teacher's row scan, or the new
-- "Profiles select policy" from 0006 which also touches class_students).
--
-- Fix: same pattern already used by is_admin()/is_teacher()/get_student_id()/
-- get_teacher_id() — wrap the cross-table checks in SECURITY DEFINER
-- functions, which run as the table owner and therefore bypass RLS instead
-- of re-triggering it, breaking the recursive chain.

CREATE OR REPLACE FUNCTION public.teacher_owns_class(p_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = p_class_id AND c.teacher_id = public.get_teacher_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.student_enrolled_in_class(p_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.class_students cs
        WHERE cs.class_id = p_class_id
          AND cs.student_id = public.get_student_id()
          AND cs.status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.teacher_teaches_profile(p_profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.class_students cs ON cs.student_id = s.id
        JOIN public.classes c ON cs.class_id = c.id
        WHERE s.profile_id = p_profile_id
          AND c.teacher_id = public.get_teacher_id()
          AND cs.status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-point "Classes select policy" at the helper function instead of a
-- direct class_students subquery.
DROP POLICY IF EXISTS "Classes select policy" ON public.classes;
CREATE POLICY "Classes select policy" ON public.classes
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR (public.is_teacher() AND teacher_id = public.get_teacher_id())
        OR public.student_enrolled_in_class(id)
    );

-- Re-point "Class students select policy" at the helper function instead of
-- a direct classes subquery.
DROP POLICY IF EXISTS "Class students select policy" ON public.class_students;
CREATE POLICY "Class students select policy" ON public.class_students
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR student_id = public.get_student_id()
        OR public.teacher_owns_class(class_id)
    );

-- Re-point "Profiles select policy" (0006) at the helper function too, since
-- its direct EXISTS subquery into students/class_students/classes was the
-- trigger that surfaced this bug via the login/profile-fetch path.
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_admin()
        OR (public.is_teacher() AND public.teacher_teaches_profile(id))
    );
