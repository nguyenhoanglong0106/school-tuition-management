-- Store a student-facing login name separately from contact email.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS login_name VARCHAR(50);

UPDATE public.students
SET login_name = student_code
WHERE login_name IS NULL;

ALTER TABLE public.students
  ALTER COLUMN login_name DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_login_name
  ON public.students (LOWER(login_name))
  WHERE login_name IS NOT NULL;
