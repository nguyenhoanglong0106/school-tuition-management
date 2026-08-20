-- Migration 0020: Homework / Exercises (bài tập tiếng Anh)
--
-- Three independent layers, matching the confirmed design:
--   exercises + exercise_questions      -> ngân hàng bài tập (reusable, authored once)
--   exercise_assignments                -> hành động "giao bài" (1 exercise x 1 lớp/toàn hệ thống x 1 hạn nộp)
--   exercise_submissions + exercise_answers -> bài làm thực tế của từng học viên
--
-- Key decisions baked into this schema (see chat for full rationale):
--   1. Correct answers live in a SEPARATE table (exercise_answer_keys) with RLS
--      that grants staff-only access and NO policy at all for students, so a
--      student's Supabase client can never read the answer key under any
--      circumstance -- not even by accident in future app code. Grading always
--      runs server-side inside SECURITY DEFINER RPCs (submit_exercise,
--      grade_writing_answer), which bypass RLS the same way confirm_payment()
--      does in 0002.
--   2. "Nghe" (listening) is NOT a separate question_type -- it's an optional
--      media_url/media_type on a MULTIPLE_CHOICE or FILL_BLANK question.
--   3. exercise_submissions/exercise_answers have NO client-writable RLS
--      policy at all (SELECT only). All mutation goes through RPCs so a score
--      can never be set/edited by a raw client .update() call, by student or
--      admin alike.
--   4. "Toàn hệ thống" (SYSTEM scope) fans out to every ACTIVE student who is
--      currently enrolled (ACTIVE) in at least one class -- i.e. computed
--      "theo lớp" via class_students, not the raw students.status flag alone.
--   5. Once an exercise has >=1 assignment, its questions/answer keys are
--      locked (see prevent_question_mutation_if_assigned below) -- editing
--      after the fact would silently corrupt already-graded history, so the
--      only path forward is cloning into a new exercise.
--   6. Late submission is NOT a blanket per-assignment toggle -- it's a
--      teacher-approved exception per student (exercise_submissions.late_approved_by),
--      matching "cho phép nộp trễ nếu gv đồng ý".
--
-- RLS recursion note (see 0010/0015/0018 for the history of this exact class
-- of bug): the only two tables here that reference each other across policies
-- are exercise_assignments and exercise_submissions. That mutual reference is
-- broken by routing the assignments->submissions direction through
-- teacher_owns_exercise_assignment(), a SECURITY DEFINER function, which
-- bypasses RLS internally instead of re-entering exercise_submissions' policy.
-- Do not replace that helper with a plain correlated subquery.

-- ==========================================
-- TABLES
-- ==========================================

CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Student-safe fields only. No correct answer lives here.
CREATE TABLE public.exercise_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 0,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('MULTIPLE_CHOICE', 'FILL_BLANK', 'WRITING')),
    question_text TEXT NOT NULL,
    media_url TEXT,
    media_type VARCHAR(20) CHECK (media_type IS NULL OR media_type IN ('AUDIO', 'IMAGE')),
    options JSONB, -- MULTIPLE_CHOICE only: [{ "id": "a", "text": "..." }, ...] -- safe to show, doesn't reveal which is correct
    points NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (points > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The secret half. 1:1 with exercise_questions, absent for WRITING questions.
CREATE TABLE public.exercise_answer_keys (
    question_id UUID PRIMARY KEY REFERENCES public.exercise_questions(id) ON DELETE CASCADE,
    -- MULTIPLE_CHOICE: ["a"] or ["a","c"] (option id(s))
    -- FILL_BLANK: [["paris","Paris"], ["is","was"]] -- one accepted-answers array per blank, in order
    correct_answer JSONB NOT NULL,
    case_sensitive BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.exercise_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
    scope VARCHAR(10) NOT NULL CHECK (scope IN ('CLASS', 'SYSTEM')),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,
    title_override VARCHAR(255),
    due_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_assignment_scope CHECK (
        (scope = 'CLASS' AND class_id IS NOT NULL) OR (scope = 'SYSTEM' AND class_id IS NULL)
    )
);

CREATE TABLE public.exercise_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.exercise_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'LATE', 'GRADED')),
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    auto_score NUMERIC(6,2),
    manual_score NUMERIC(6,2),
    total_score NUMERIC(6,2),
    max_score NUMERIC(6,2) NOT NULL DEFAULT 0,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    late_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    late_approved_at TIMESTAMPTZ,
    teacher_feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assignment_student UNIQUE (assignment_id, student_id)
);

CREATE TABLE public.exercise_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.exercise_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.exercise_questions(id) ON DELETE CASCADE,
    student_answer JSONB,
    is_correct BOOLEAN,
    points_earned NUMERIC(6,2),
    teacher_comment TEXT,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_submission_question UNIQUE (submission_id, question_id)
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_exercise_questions_exercise ON public.exercise_questions(exercise_id);
CREATE INDEX idx_exercise_assignments_exercise ON public.exercise_assignments(exercise_id);
CREATE INDEX idx_exercise_assignments_class ON public.exercise_assignments(class_id);
CREATE INDEX idx_exercise_assignments_due ON public.exercise_assignments(due_at);
CREATE INDEX idx_exercise_submissions_assignment ON public.exercise_submissions(assignment_id);
CREATE INDEX idx_exercise_submissions_student ON public.exercise_submissions(student_id);
CREATE INDEX idx_exercise_submissions_status ON public.exercise_submissions(status);
CREATE INDEX idx_exercise_answers_submission ON public.exercise_answers(submission_id);

-- ==========================================
-- updated_at TRIGGERS
-- ==========================================
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'exercises', 'exercise_questions', 'exercise_answer_keys',
        'exercise_assignments', 'exercise_submissions', 'exercise_answers'
    ] LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
            CREATE TRIGGER trg_set_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
        ', t, t);
    END LOOP;
END;
$$;

-- ==========================================
-- GUARD RAILS
-- ==========================================

-- Protect graded history from hard deletion (same pattern as 0013).
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['exercises', 'exercise_assignments', 'exercise_submissions'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_core_delete ON public.%I', t);
        EXECUTE format(
            'CREATE TRIGGER trg_prevent_core_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_core_delete()',
            t
        );
    END LOOP;
END;
$$;

-- Lock a question's content/answer key once its exercise has been assigned
-- at least once -- editing history-affecting data in place would silently
-- change already-graded scores. Teachers must clone the exercise instead.
CREATE OR REPLACE FUNCTION public.prevent_question_mutation_if_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_exercise_id UUID := COALESCE(NEW.exercise_id, OLD.exercise_id);
BEGIN
    IF EXISTS (SELECT 1 FROM public.exercise_assignments WHERE exercise_id = v_exercise_id) THEN
        RAISE EXCEPTION 'Bài tập này đã được giao — không thể thêm/sửa/xóa câu hỏi. Hãy nhân bản thành bài tập mới để chỉnh sửa.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_question_mutation ON public.exercise_questions;
CREATE TRIGGER trg_prevent_question_mutation
    BEFORE INSERT OR UPDATE OR DELETE ON public.exercise_questions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_question_mutation_if_assigned();

CREATE OR REPLACE FUNCTION public.prevent_answer_key_mutation_if_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_exercise_id UUID;
BEGIN
    SELECT exercise_id INTO v_exercise_id
    FROM public.exercise_questions WHERE id = COALESCE(NEW.question_id, OLD.question_id);

    IF EXISTS (SELECT 1 FROM public.exercise_assignments WHERE exercise_id = v_exercise_id) THEN
        RAISE EXCEPTION 'Bài tập này đã được giao — không thể sửa đáp án. Hãy nhân bản thành bài tập mới để chỉnh sửa.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_answer_key_mutation ON public.exercise_answer_keys;
CREATE TRIGGER trg_prevent_answer_key_mutation
    BEFORE INSERT OR UPDATE OR DELETE ON public.exercise_answer_keys
    FOR EACH ROW EXECUTE FUNCTION public.prevent_answer_key_mutation_if_assigned();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

CREATE OR REPLACE FUNCTION public.teacher_owns_exercise_assignment(p_assignment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.exercise_assignments ea
        JOIN public.classes c ON c.id = ea.class_id
        WHERE ea.id = p_assignment_id AND ea.scope = 'CLASS' AND c.teacher_id = public.get_teacher_id()
    ) OR EXISTS (
        SELECT 1 FROM public.exercise_assignments WHERE id = p_assignment_id AND created_by = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_answers ENABLE ROW LEVEL SECURITY;

-- EXERCISES: ngân hàng bài tập -- staff only, students never browse it directly.
CREATE POLICY "Exercises staff select policy" ON public.exercises
    FOR SELECT TO authenticated USING (public.is_admin() OR public.is_teacher());
CREATE POLICY "Exercises insert policy" ON public.exercises
    FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_teacher());
CREATE POLICY "Exercises update policy" ON public.exercises
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR created_by = auth.uid())
    WITH CHECK (public.is_admin() OR created_by = auth.uid());
CREATE POLICY "Exercises delete policy" ON public.exercises
    FOR DELETE TO authenticated USING (public.is_admin() OR created_by = auth.uid());

-- EXERCISE_QUESTIONS: staff manage; a student may read (safe columns only)
-- once they have a submission for an assignment of this exercise.
CREATE POLICY "Exercise questions staff policy" ON public.exercise_questions
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_teacher())
    WITH CHECK (public.is_admin() OR public.is_teacher());

CREATE POLICY "Exercise questions student select policy" ON public.exercise_questions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.exercise_submissions es
            JOIN public.exercise_assignments ea ON ea.id = es.assignment_id
            WHERE ea.exercise_id = exercise_questions.exercise_id
              AND es.student_id = public.get_student_id()
        )
    );

-- EXERCISE_ANSWER_KEYS: staff only, NO policy at all for students -> default
-- deny. This is the actual security boundary, not app-code discipline.
CREATE POLICY "Exercise answer keys staff only policy" ON public.exercise_answer_keys
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_teacher())
    WITH CHECK (public.is_admin() OR public.is_teacher());

-- EXERCISE_ASSIGNMENTS: no direct INSERT policy -- creation always goes
-- through create_exercise_assignment() so the submission fan-out + notify
-- step can never be skipped by a raw client insert.
CREATE POLICY "Exercise assignments select policy" ON public.exercise_assignments
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR public.teacher_owns_exercise_assignment(id)
        OR EXISTS (
            SELECT 1 FROM public.exercise_submissions es
            WHERE es.assignment_id = exercise_assignments.id AND es.student_id = public.get_student_id()
        )
    );

CREATE POLICY "Exercise assignments update policy" ON public.exercise_assignments
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR created_by = auth.uid())
    WITH CHECK (public.is_admin() OR created_by = auth.uid());

-- EXERCISE_SUBMISSIONS / EXERCISE_ANSWERS: SELECT only. Every write (start,
-- submit, auto-grade, manual-grade, late approval) goes through a SECURITY
-- DEFINER RPC below -- nobody, including admin, writes these tables directly.
CREATE POLICY "Exercise submissions select policy" ON public.exercise_submissions
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR student_id = public.get_student_id()
        OR public.teacher_owns_exercise_assignment(assignment_id)
    );

CREATE POLICY "Exercise answers select policy" ON public.exercise_answers
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.exercise_submissions es
            WHERE es.id = exercise_answers.submission_id
              AND (es.student_id = public.get_student_id() OR public.teacher_owns_exercise_assignment(es.assignment_id))
        )
    );

-- ==========================================
-- FILL_BLANK GRADING HELPER
-- ==========================================
-- All-or-nothing per question: every blank must match one of its accepted
-- answers. p_correct: [["paris","Paris"], ["is"]], p_student: ["Paris","is"].
CREATE OR REPLACE FUNCTION public.grade_fill_blank(p_correct JSONB, p_student JSONB, p_case_sensitive BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
    v_i INT;
    v_student_text TEXT;
BEGIN
    IF p_student IS NULL OR jsonb_typeof(p_student) != 'array'
       OR jsonb_array_length(p_correct) != jsonb_array_length(p_student) THEN
        RETURN false;
    END IF;

    FOR v_i IN 0 .. jsonb_array_length(p_correct) - 1 LOOP
        v_student_text := trim(p_student ->> v_i);
        IF NOT p_case_sensitive THEN
            v_student_text := lower(v_student_text);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(p_correct -> v_i) AS accepted(val)
            WHERE (CASE WHEN p_case_sensitive THEN trim(accepted.val) ELSE lower(trim(accepted.val)) END) = v_student_text
        ) THEN
            RETURN false;
        END IF;
    END LOOP;

    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==========================================
-- RPCs
-- ==========================================

-- Create an assignment and fan out one exercise_submissions row per eligible
-- student, mirroring create_class_monthly_fees()'s fan-out + notify pattern.
CREATE OR REPLACE FUNCTION public.create_exercise_assignment(
    p_exercise_id UUID,
    p_scope VARCHAR,
    p_class_id UUID,
    p_due_at TIMESTAMPTZ,
    p_session_id UUID DEFAULT NULL,
    p_title_override VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_assignment_id UUID;
    v_max_score NUMERIC;
    v_created_count INT := 0;
    v_student RECORD;
    v_notif_id UUID;
    v_exercise RECORD;
    v_notif_title TEXT;
BEGIN
    IF p_scope = 'SYSTEM' AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Chỉ quản trị viên mới được giao bài tập cho toàn hệ thống';
    END IF;

    IF p_scope = 'CLASS' AND NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.classes WHERE id = p_class_id AND teacher_id = public.get_teacher_id()
    ) THEN
        RAISE EXCEPTION 'Bạn không có quyền giao bài tập cho lớp này';
    END IF;

    SELECT * INTO v_exercise FROM public.exercises WHERE id = p_exercise_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy bài tập trong ngân hàng';
    END IF;

    SELECT COALESCE(SUM(points), 0) INTO v_max_score
    FROM public.exercise_questions WHERE exercise_id = p_exercise_id;

    INSERT INTO public.exercise_assignments (exercise_id, scope, class_id, session_id, title_override, due_at, created_by)
    VALUES (p_exercise_id, p_scope, p_class_id, p_session_id, p_title_override, p_due_at, auth.uid())
    RETURNING id INTO v_assignment_id;

    v_notif_title := COALESCE(p_title_override, v_exercise.title) || ' — hạn nộp: ' || TO_CHAR(p_due_at, 'DD/MM/YYYY HH24:MI');

    FOR v_student IN
        SELECT DISTINCT s.id AS student_id, s.profile_id
        FROM public.students s
        JOIN public.class_students cs ON cs.student_id = s.id AND cs.status = 'ACTIVE'
        WHERE s.status = 'ACTIVE'
          AND (p_scope = 'SYSTEM' OR cs.class_id = p_class_id)
    LOOP
        INSERT INTO public.exercise_submissions (assignment_id, student_id, max_score)
        VALUES (v_assignment_id, v_student.student_id, v_max_score)
        ON CONFLICT (assignment_id, student_id) DO NOTHING;
        v_created_count := v_created_count + 1;

        IF v_student.profile_id IS NOT NULL THEN
            INSERT INTO public.notifications (title, message, type, class_id, created_by)
            VALUES ('Bài tập mới', v_notif_title, 'CLASS', CASE WHEN p_scope = 'CLASS' THEN p_class_id ELSE NULL END, auth.uid())
            RETURNING id INTO v_notif_id;

            INSERT INTO public.notification_recipients (notification_id, user_id)
            VALUES (v_notif_id, v_student.profile_id);
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 'assignment_id', v_assignment_id,
        'student_count', v_created_count, 'max_score', v_max_score
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.start_exercise_submission(p_submission_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.exercise_submissions
    SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
    WHERE id = p_submission_id AND student_id = public.get_student_id() AND status = 'NOT_STARTED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The only path that ever reads exercise_answer_keys on a student's behalf.
-- p_answers: [{ "question_id": "...", "student_answer": ... }, ...]
CREATE OR REPLACE FUNCTION public.submit_exercise(p_submission_id UUID, p_answers JSONB)
RETURNS JSONB AS $$
DECLARE
    v_submission RECORD;
    v_assignment RECORD;
    v_answer JSONB;
    v_question RECORD;
    v_key RECORD;
    v_is_correct BOOLEAN;
    v_points NUMERIC;
    v_auto_score NUMERIC := 0;
    v_has_writing BOOLEAN := false;
    v_status VARCHAR;
BEGIN
    SELECT * INTO v_submission FROM public.exercise_submissions WHERE id = p_submission_id FOR UPDATE;
    IF NOT FOUND OR v_submission.student_id != public.get_student_id() THEN
        RAISE EXCEPTION 'Không tìm thấy bài làm hoặc bạn không có quyền nộp bài này';
    END IF;

    IF v_submission.status IN ('SUBMITTED', 'LATE', 'GRADED') THEN
        RAISE EXCEPTION 'Bài tập này đã được nộp rồi';
    END IF;

    SELECT * INTO v_assignment FROM public.exercise_assignments WHERE id = v_submission.assignment_id;

    IF NOW() > v_assignment.due_at AND v_submission.late_approved_by IS NULL THEN
        RAISE EXCEPTION 'Đã quá hạn nộp bài. Vui lòng liên hệ giáo viên nếu cần nộp trễ.';
    END IF;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        SELECT * INTO v_question FROM public.exercise_questions
        WHERE id = (v_answer ->> 'question_id')::UUID AND exercise_id = v_assignment.exercise_id;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_is_correct := NULL;
        v_points := NULL;

        IF v_question.question_type = 'WRITING' THEN
            v_has_writing := true;
        ELSE
            SELECT * INTO v_key FROM public.exercise_answer_keys WHERE question_id = v_question.id;
            IF FOUND THEN
                IF v_question.question_type = 'MULTIPLE_CHOICE' THEN
                    -- Set-equality via containment (not raw `=`) so a
                    -- multi-select answer ["a","c"] still matches ["c","a"] --
                    -- JSONB array equality is order-sensitive and would wrongly
                    -- mark that WRONG.
                    v_is_correct := COALESCE(
                        v_key.correct_answer @> (v_answer -> 'student_answer')
                        AND v_key.correct_answer <@ (v_answer -> 'student_answer'),
                        false
                    );
                ELSE -- FILL_BLANK
                    v_is_correct := public.grade_fill_blank(v_key.correct_answer, v_answer -> 'student_answer', v_key.case_sensitive);
                END IF;
                v_points := CASE WHEN v_is_correct THEN v_question.points ELSE 0 END;
                v_auto_score := v_auto_score + COALESCE(v_points, 0);
            END IF;
        END IF;

        INSERT INTO public.exercise_answers (submission_id, question_id, student_answer, is_correct, points_earned)
        VALUES (p_submission_id, v_question.id, v_answer -> 'student_answer', v_is_correct, v_points)
        ON CONFLICT (submission_id, question_id) DO UPDATE
        SET student_answer = EXCLUDED.student_answer,
            is_correct = EXCLUDED.is_correct,
            points_earned = EXCLUDED.points_earned,
            answered_at = NOW(), updated_at = NOW();
    END LOOP;

    v_status := CASE
        WHEN v_has_writing THEN 'SUBMITTED'
        WHEN NOW() > v_assignment.due_at THEN 'LATE'
        ELSE 'GRADED'
    END;

    UPDATE public.exercise_submissions
    SET status = v_status,
        submitted_at = NOW(),
        auto_score = v_auto_score,
        total_score = CASE WHEN v_has_writing THEN NULL ELSE v_auto_score END,
        graded_at = CASE WHEN v_has_writing THEN NULL ELSE NOW() END,
        updated_at = NOW()
    WHERE id = p_submission_id;

    RETURN jsonb_build_object('success', true, 'status', v_status, 'auto_score', v_auto_score, 'pending_manual_grading', v_has_writing);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Teacher grades one WRITING answer; submission flips to GRADED once every
-- WRITING answer in it has been scored.
CREATE OR REPLACE FUNCTION public.grade_writing_answer(
    p_answer_id UUID, p_points_earned NUMERIC, p_teacher_comment TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_answer RECORD;
    v_submission RECORD;
    v_assignment RECORD;
    v_remaining_ungraded INT;
    v_manual_total NUMERIC;
    v_auto_total NUMERIC;
BEGIN
    SELECT ea.*, eq.points AS max_points, eq.question_type INTO v_answer
    FROM public.exercise_answers ea
    JOIN public.exercise_questions eq ON eq.id = ea.question_id
    WHERE ea.id = p_answer_id;

    IF NOT FOUND OR v_answer.question_type != 'WRITING' THEN
        RAISE EXCEPTION 'Câu trả lời không hợp lệ để chấm tay';
    END IF;

    SELECT * INTO v_submission FROM public.exercise_submissions WHERE id = v_answer.submission_id FOR UPDATE;
    SELECT * INTO v_assignment FROM public.exercise_assignments WHERE id = v_submission.assignment_id;

    IF NOT public.is_admin() AND NOT public.teacher_owns_exercise_assignment(v_assignment.id) THEN
        RAISE EXCEPTION 'Bạn không có quyền chấm bài này';
    END IF;

    IF p_points_earned < 0 OR p_points_earned > v_answer.max_points THEN
        RAISE EXCEPTION 'Điểm chấm phải từ 0 đến % điểm', v_answer.max_points;
    END IF;

    UPDATE public.exercise_answers
    SET points_earned = p_points_earned, teacher_comment = p_teacher_comment, updated_at = NOW()
    WHERE id = p_answer_id;

    SELECT COUNT(*) INTO v_remaining_ungraded
    FROM public.exercise_answers ea
    JOIN public.exercise_questions eq ON eq.id = ea.question_id
    WHERE ea.submission_id = v_submission.id AND eq.question_type = 'WRITING' AND ea.points_earned IS NULL;

    SELECT
        COALESCE(SUM(ea.points_earned) FILTER (WHERE eq.question_type = 'WRITING'), 0),
        COALESCE(SUM(ea.points_earned) FILTER (WHERE eq.question_type != 'WRITING'), 0)
    INTO v_manual_total, v_auto_total
    FROM public.exercise_answers ea JOIN public.exercise_questions eq ON eq.id = ea.question_id
    WHERE ea.submission_id = v_submission.id;

    UPDATE public.exercise_submissions
    SET manual_score = v_manual_total,
        total_score = v_auto_total + v_manual_total,
        status = CASE WHEN v_remaining_ungraded = 0 THEN 'GRADED' ELSE status END,
        graded_by = CASE WHEN v_remaining_ungraded = 0 THEN auth.uid() ELSE graded_by END,
        graded_at = CASE WHEN v_remaining_ungraded = 0 THEN NOW() ELSE graded_at END,
        updated_at = NOW()
    WHERE id = v_submission.id;

    RETURN jsonb_build_object('success', true, 'fully_graded', v_remaining_ungraded = 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- "Cho phép nộp trễ nếu gv đồng ý": a per-student exception, not a blanket
-- per-assignment flag. Only the class's own teacher (or admin) may grant it.
CREATE OR REPLACE FUNCTION public.approve_late_submission(p_submission_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_assignment_id UUID;
BEGIN
    SELECT assignment_id INTO v_assignment_id FROM public.exercise_submissions WHERE id = p_submission_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy bài làm';
    END IF;

    IF NOT public.is_admin() AND NOT public.teacher_owns_exercise_assignment(v_assignment_id) THEN
        RAISE EXCEPTION 'Bạn không có quyền cho phép nộp trễ bài này';
    END IF;

    UPDATE public.exercise_submissions
    SET late_approved_by = auth.uid(), late_approved_at = NOW(), updated_at = NOW()
    WHERE id = p_submission_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STORAGE: exercise-media (listening audio)
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-media', 'exercise-media', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET
    file_size_limit = 15728640, -- 15MB
    allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']
WHERE id = 'exercise-media';

DROP POLICY IF EXISTS "Exercise media staff upload" ON storage.objects;
CREATE POLICY "Exercise media staff upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'exercise-media' AND (public.is_admin() OR public.is_teacher()));

DROP POLICY IF EXISTS "Exercise media staff manage" ON storage.objects;
CREATE POLICY "Exercise media staff manage" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'exercise-media' AND (public.is_admin() OR public.is_teacher()));

DROP POLICY IF EXISTS "Exercise media staff delete" ON storage.objects;
CREATE POLICY "Exercise media staff delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'exercise-media' AND (public.is_admin() OR public.is_teacher()));

-- Audio content itself isn't the secret (only the answer key is), so any
-- authenticated user may play it back -- keeps storage RLS simple.
DROP POLICY IF EXISTS "Exercise media authenticated read" ON storage.objects;
CREATE POLICY "Exercise media authenticated read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'exercise-media');
