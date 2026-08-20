import { supabase } from '@/lib/supabase';
import { sanitizeFileName } from '@/utils/formatters';

export const exerciseService = {
  // ==========================================
  // NGÂN HÀNG BÀI TẬP (admin/teacher)
  // ==========================================

  async getExercises({ search = '', subjectId = null, page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('exercises')
      .select(`*, subjects(id, name), exercise_questions(id)`, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('title', `%${search}%`);
    if (subjectId) query = query.eq('subject_id', subjectId);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getExerciseById(id) {
    const { data, error } = await supabase
      .from('exercises')
      .select(`
        *,
        subjects(id, name),
        exercise_questions(*, exercise_answer_keys(*))
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    data.exercise_questions?.sort((a, b) => a.order_index - b.order_index);
    return data;
  },

  async createExercise({ title, description, subject_id }) {
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        title,
        description,
        subject_id,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateExercise(id, updates) {
    const { data, error } = await supabase
      .from('exercises')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Soft delete only — hard DELETE is blocked server-side (prevent_core_delete).
  async archiveExercise(id) {
    const { error } = await supabase
      .from('exercises')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);
    if (error) throw error;
  },

  // Duplicate an exercise (+ its questions/answer keys) into a fresh, editable
  // one. Required because once an exercise has ≥1 assignment its questions
  // and answer keys are locked server-side — this is the only way to edit.
  async cloneExercise(id) {
    const source = await this.getExerciseById(id);

    const clone = await this.createExercise({
      title: `${source.title} (bản sao)`,
      description: source.description,
      subject_id: source.subject_id,
    });

    for (const q of source.exercise_questions ?? []) {
      const newQuestion = await this.addQuestion(clone.id, {
        order_index: q.order_index,
        question_type: q.question_type,
        question_text: q.question_text,
        media_url: q.media_url,
        media_type: q.media_type,
        options: q.options,
        points: q.points,
      });

      if (q.exercise_answer_keys) {
        await this.upsertAnswerKey(newQuestion.id, {
          correct_answer: q.exercise_answer_keys.correct_answer,
          case_sensitive: q.exercise_answer_keys.case_sensitive,
        });
      }
    }

    return clone;
  },

  // ==========================================
  // CÂU HỎI & ĐÁP ÁN (admin/teacher)
  // ==========================================

  async addQuestion(exerciseId, question) {
    const { data, error } = await supabase
      .from('exercise_questions')
      .insert({ ...question, exercise_id: exerciseId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateQuestion(id, updates) {
    const { data, error } = await supabase
      .from('exercise_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteQuestion(id) {
    const { error } = await supabase.from('exercise_questions').delete().eq('id', id);
    if (error) throw error;
  },

  // correct_answer shape depends on question_type — see 0020 migration header.
  async upsertAnswerKey(questionId, { correct_answer, case_sensitive = false }) {
    const { data, error } = await supabase
      .from('exercise_answer_keys')
      .upsert({ question_id: questionId, correct_answer, case_sensitive }, { onConflict: 'question_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ==========================================
  // MEDIA (audio nghe)
  // ==========================================

  async uploadMedia(file) {
    const maxMB = 15;
    if (file.size > maxMB * 1024 * 1024) {
      throw new Error(`File quá lớn. Tối đa ${maxMB}MB`);
    }
    const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const path = `audio/${fileName}`;

    const { error } = await supabase.storage.from('exercise-media').upload(path, file);
    if (error) throw error;
    return path;
  },

  async getMediaUrl(path) {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from('exercise-media')
      .createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  },

  // ==========================================
  // GIAO BÀI (admin/teacher)
  // ==========================================

  async getAssignments({ exerciseId = null, classId = null, status = null, page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('exercise_assignments')
      .select(`*, exercises(id, title), classes(id, class_name)`, { count: 'exact' })
      .order('due_at', { ascending: false });

    if (exerciseId) query = query.eq('exercise_id', exerciseId);
    if (classId) query = query.eq('class_id', classId);
    if (status) query = query.eq('status', status);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  // Once >=1, this exercise's questions/answer keys are locked server-side
  // (see prevent_question_mutation_if_assigned in 0020) — used to disable
  // edit actions in the UI before the user hits that error.
  async countAssignments(exerciseId) {
    const { count, error } = await supabase
      .from('exercise_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('exercise_id', exerciseId);
    if (error) throw error;
    return count ?? 0;
  },

  // Creates the assignment AND fans out one submission per eligible student
  // (server-side, see create_exercise_assignment in 0020).
  async createAssignment({ exerciseId, scope, classId = null, dueAt, sessionId = null, titleOverride = null }) {
    const { data, error } = await supabase.rpc('create_exercise_assignment', {
      p_exercise_id: exerciseId,
      p_scope: scope,
      p_class_id: classId,
      p_due_at: dueAt,
      p_session_id: sessionId,
      p_title_override: titleOverride,
    });
    if (error) throw error;
    return data;
  },

  async getAssignmentById(id) {
    const { data, error } = await supabase
      .from('exercise_assignments')
      .select(`*, exercises(id, title, description), classes(id, class_name)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async closeAssignment(id) {
    const { error } = await supabase
      .from('exercise_assignments')
      .update({ status: 'CLOSED' })
      .eq('id', id);
    if (error) throw error;
  },

  async reopenAssignment(id) {
    const { error } = await supabase
      .from('exercise_assignments')
      .update({ status: 'ACTIVE' })
      .eq('id', id);
    if (error) throw error;
  },

  // Progress list for one assignment: every student's submission status/score.
  async getSubmissionsForAssignment(assignmentId) {
    const { data, error } = await supabase
      .from('exercise_submissions')
      .select(`*, students(id, student_code, full_name, avatar_url)`)
      .eq('assignment_id', assignmentId)
      .order('students(full_name)');
    if (error) throw error;
    return data ?? [];
  },

  // Submission + every answer, joined with question text (for grading UI).
  // Never selects exercise_answer_keys directly — that stays server-side.
  async getSubmissionDetail(submissionId) {
    const { data: submission, error: subErr } = await supabase
      .from('exercise_submissions')
      .select(`*, students(id, student_code, full_name), exercise_assignments(*, exercises(title))`)
      .eq('id', submissionId)
      .single();
    if (subErr) throw subErr;

    const { data: answers, error: ansErr } = await supabase
      .from('exercise_answers')
      .select(`*, exercise_questions(id, order_index, question_type, question_text, media_url, media_type, options, points)`)
      .eq('submission_id', submissionId);
    if (ansErr) throw ansErr;

    answers?.sort((a, b) => a.exercise_questions.order_index - b.exercise_questions.order_index);
    return { ...submission, answers: answers ?? [] };
  },

  async gradeWritingAnswer(answerId, pointsEarned, teacherComment = null) {
    const { data, error } = await supabase.rpc('grade_writing_answer', {
      p_answer_id: answerId,
      p_points_earned: pointsEarned,
      p_teacher_comment: teacherComment,
    });
    if (error) throw error;
    return data;
  },

  async approveLateSubmission(submissionId) {
    const { data, error } = await supabase.rpc('approve_late_submission', {
      p_submission_id: submissionId,
    });
    if (error) throw error;
    return data;
  },

  // ==========================================
  // HỌC VIÊN LÀM BÀI
  // ==========================================

  async getMyAssignments(studentId, { status = null } = {}) {
    let query = supabase
      .from('exercise_submissions')
      .select(`*, exercise_assignments(*, exercises(id, title, description))`)
      .eq('student_id', studentId)
      .order('exercise_assignments(due_at)', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  // Safe columns only — exercise_answer_keys is never reachable from here.
  async getExerciseQuestionsForStudent(exerciseId) {
    const { data, error } = await supabase
      .from('exercise_questions')
      .select('id, order_index, question_type, question_text, media_url, media_type, options, points')
      .eq('exercise_id', exerciseId)
      .order('order_index');
    if (error) throw error;
    return data ?? [];
  },

  async startSubmission(submissionId) {
    const { error } = await supabase.rpc('start_exercise_submission', {
      p_submission_id: submissionId,
    });
    if (error) throw error;
  },

  // answers: [{ question_id, student_answer }, ...]
  async submitExercise(submissionId, answers) {
    const { data, error } = await supabase.rpc('submit_exercise', {
      p_submission_id: submissionId,
      p_answers: answers,
    });
    if (error) throw error;
    return data;
  },
};
