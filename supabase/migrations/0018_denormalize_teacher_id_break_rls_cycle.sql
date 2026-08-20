-- Migration 0018: Break the classes <-> class_students RLS cycle for real.
--
-- 0016 (SET row_security = off) was a no-op — that GUC doesn't bypass RLS.
-- 0017 (grant BYPASSRLS) is blocked by Supabase: "Only superusers can alter
-- privileged roles" — the hosted "postgres" role can't self-elevate.
--
-- Root cause, confirmed: "Class students select policy" checks teacher
-- ownership via teacher_owns_class(class_id), which queries classes. That
-- re-triggers "Classes select policy", which checks student enrollment via
-- student_enrolled_in_class(id), which queries class_students again — an
-- infinite loop between the two tables' policies, regardless of caller role.
--
-- Fix: denormalize classes.teacher_id onto class_students (kept in sync by
-- trigger) so "Class students select policy" never needs to read classes at
-- all. That removes the class_students -> classes edge of the cycle
-- entirely — "Classes select policy" can still safely read class_students
-- (via student_enrolled_in_class) since that policy no longer reads back.

ALTER TABLE public.class_students
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;

UPDATE public.class_students cs
SET teacher_id = c.teacher_id
FROM public.classes c
WHERE c.id = cs.class_id AND cs.teacher_id IS DISTINCT FROM c.teacher_id;

-- Keep teacher_id in sync when a class_students row is created or moved to
-- a different class.
CREATE OR REPLACE FUNCTION public.sync_class_students_teacher_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.teacher_id := (SELECT teacher_id FROM public.classes WHERE id = NEW.class_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_class_students_teacher_id ON public.class_students;
CREATE TRIGGER trg_sync_class_students_teacher_id
  BEFORE INSERT OR UPDATE OF class_id ON public.class_students
  FOR EACH ROW EXECUTE FUNCTION public.sync_class_students_teacher_id();

-- Keep it in sync when a class's teacher assignment changes.
CREATE OR REPLACE FUNCTION public.sync_class_students_teacher_id_on_class_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.teacher_id IS DISTINCT FROM OLD.teacher_id THEN
        UPDATE public.class_students SET teacher_id = NEW.teacher_id WHERE class_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_classes_sync_teacher_id ON public.classes;
CREATE TRIGGER trg_classes_sync_teacher_id
  AFTER UPDATE OF teacher_id ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.sync_class_students_teacher_id_on_class_update();

-- Re-point "Class students select policy" at the denormalized column
-- instead of the classes-querying teacher_owns_class() helper.
DROP POLICY IF EXISTS "Class students select policy" ON public.class_students;
CREATE POLICY "Class students select policy" ON public.class_students
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR student_id = public.get_student_id()
        OR (public.is_teacher() AND teacher_id = public.get_teacher_id())
    );
