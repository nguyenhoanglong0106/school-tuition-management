-- Migration 0021: Closing an assignment didn't actually stop submissions.
--
-- AssignmentDetail's "Đóng lượt giao bài" button sets exercise_assignments.
-- status = 'CLOSED', but submit_exercise() (0020) never checked assignment
-- status at all -- only due_at/late_approved_by. A student could still call
-- the RPC directly and get graded on a "closed" assignment. Add the missing
-- check; everything else in the function is unchanged.

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

    IF v_assignment.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Bài tập này đã được giáo viên đóng, không thể nộp bài nữa';
    END IF;

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
