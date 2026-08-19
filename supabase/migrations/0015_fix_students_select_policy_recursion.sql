-- Migration 0015: Fix infinite recursion in "Students select policy".
--
-- Migration 0010 fixed the classes <-> class_students <-> profiles recursion
-- by moving cross-table RLS checks into SECURITY DEFINER helper functions
-- (which bypass RLS internally, breaking the cycle). "Students select
-- policy" (0003) was never migrated to that pattern — it still runs a plain
-- correlated EXISTS subquery into class_students/classes directly inside
-- the USING clause. Postgres is not guaranteed to short-circuit past that
-- subquery just because an earlier OR branch (is_admin()) is true, so any
-- query that needs to evaluate this policy (e.g. `.insert(...).select()`
-- when creating a student, which re-selects the row to return it) can hit
-- the same "infinite recursion detected in policy for relation
-- class_students" error (42P17) that 0010 already fixed once elsewhere.
--
-- Fix: same pattern as teacher_owns_class()/student_enrolled_in_class() —
-- wrap the cross-table check in a SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION public.teacher_teaches_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.class_students cs
        JOIN public.classes c ON cs.class_id = c.id
        WHERE cs.student_id = p_student_id
          AND c.teacher_id = public.get_teacher_id()
          AND cs.status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Students select policy" ON public.students;
CREATE POLICY "Students select policy" ON public.students
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR profile_id = auth.uid()
        OR (public.is_teacher() AND public.teacher_teaches_student(id))
    );
