import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { exerciseService } from '@/services/exerciseService';
import { useToast } from '@/contexts/ToastContext';
import { Skeleton } from '@/components/common/UI';
import { Textarea, Checkbox } from '@/components/common/Form';
import { ConfirmDialog } from '@/components/common/Modal';
import { SubmissionStatusBadge } from '@/components/common/Badge';
import { formatDateTime } from '@/utils/formatters';

const TYPE_LABELS = { MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ', WRITING: 'Tự luận' };

export default function ExerciseTake() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [audioUrls, setAudioUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const sub = await exerciseService.getSubmissionDetail(submissionId);
      const exerciseId = sub.exercise_assignments.exercise_id;
      const qs = await exerciseService.getExerciseQuestionsForStudent(exerciseId);
      setSubmission(sub);
      setQuestions(qs);

      if (sub.answers?.length) {
        const initial = {};
        sub.answers.forEach((a) => { initial[a.question_id] = a.student_answer; });
        setAnswers(initial);
      }

      const withAudio = qs.filter((q) => q.media_url);
      if (withAudio.length) {
        const entries = await Promise.all(withAudio.map(async (q) => [q.id, await exerciseService.getMediaUrl(q.media_url)]));
        setAudioUrls(Object.fromEntries(entries));
      }

      if (sub.status === 'NOT_STARTED') {
        await exerciseService.startSubmission(submissionId);
      }
    } catch (err) {
      addToast(err.message ?? 'Không thể tải bài tập', 'error');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  if (!submission) return null;

  const assignment = submission.exercise_assignments;
  const isEditable = ['NOT_STARTED', 'IN_PROGRESS'].includes(submission.status);
  const isClosed = assignment.status !== 'ACTIVE';
  const isOverdue = new Date(assignment.due_at) < new Date();
  const canSubmit = isEditable && !isClosed && (!isOverdue || !!submission.late_approved_by);
  const answersById = Object.fromEntries((submission.answers ?? []).map((a) => [a.question_id, a]));
  const unansweredCount = questions.filter((q) => {
    const v = answers[q.id];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.every((x) => !x));
  }).length;

  const setAnswer = (questionId, value) => setAnswers((a) => ({ ...a, [questionId]: value }));

  const toggleMcOption = (question, optionId) => {
    const current = answers[question.id] ?? [];
    setAnswer(question.id, current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]);
  };

  const setBlank = (question, idx, value) => {
    const count = question.options?.blank_count ?? 1;
    const current = answers[question.id] ?? Array(count).fill('');
    const next = [...current];
    next[idx] = value;
    setAnswer(question.id, next);
  };

  const doSubmit = async () => {
    setConfirmSubmit(false);
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({ question_id: q.id, student_answer: answers[q.id] ?? null }));
      const result = await exerciseService.submitExercise(submissionId, payload);
      addToast(result.pending_manual_grading ? 'Đã nộp bài, chờ giáo viên chấm phần tự luận' : `Đã nộp bài — ${result.auto_score}/${submission.max_score} điểm`);
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể nộp bài', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    if (unansweredCount > 0) setConfirmSubmit(true);
    else doSubmit();
  };

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{assignment.title_override ?? assignment.exercises?.title}</h1>
            <p className="text-xs text-slate-400 mt-1">Hạn nộp: {formatDateTime(assignment.due_at)}</p>
          </div>
          <SubmissionStatusBadge status={submission.status} />
        </div>
        {submission.status === 'GRADED' && (
          <p className="text-sm font-semibold text-emerald-600 mt-3">Điểm: {submission.total_score}/{submission.max_score}</p>
        )}
        {isEditable && isClosed && (
          <p className="text-sm text-red-500 mt-3">Bài tập này đã được giáo viên đóng, không thể nộp bài nữa.</p>
        )}
        {isEditable && !isClosed && isOverdue && !submission.late_approved_by && (
          <p className="text-sm text-red-500 mt-3">Đã quá hạn nộp bài. Liên hệ giáo viên nếu cần nộp trễ.</p>
        )}
        {isEditable && !isClosed && isOverdue && submission.late_approved_by && (
          <p className="text-sm text-amber-600 mt-3">Giáo viên đã cho phép bạn nộp trễ.</p>
        )}
      </div>

      {questions.map((q, idx) => {
        const savedAnswer = answersById[q.id];
        return (
          <div key={q.id} className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400">Câu {idx + 1}</span>
              <span className="badge badge-neutral">{TYPE_LABELS[q.question_type]}</span>
              <span className="text-xs text-slate-400 ml-auto">{q.points} điểm</span>
            </div>
            <p className="text-sm font-medium text-slate-800 mb-3">{q.question_text}</p>

            {q.media_url && audioUrls[q.id] && (
              <audio controls src={audioUrls[q.id]} className="w-full mb-3 h-10" />
            )}

            {q.question_type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {(q.options ?? []).map((opt) => (
                  <label key={opt.id} className={`flex items-center gap-2.5 p-3 rounded-xl border ${isEditable ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-100'}`}>
                    <Checkbox
                      checked={(answers[q.id] ?? []).includes(opt.id)}
                      disabled={!isEditable}
                      onChange={() => toggleMcOption(q, opt.id)}
                    />
                    <span className="text-sm text-slate-700">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}

            {q.question_type === 'FILL_BLANK' && (
              <div className="space-y-2">
                {Array.from({ length: q.options?.blank_count ?? 1 }).map((_, blankIdx) => (
                  <input
                    key={blankIdx}
                    className="form-input"
                    placeholder={`Chỗ trống ${blankIdx + 1}`}
                    disabled={!isEditable}
                    value={(answers[q.id] ?? [])[blankIdx] ?? ''}
                    onChange={(e) => setBlank(q, blankIdx, e.target.value)}
                  />
                ))}
              </div>
            )}

            {q.question_type === 'WRITING' && (
              <Textarea rows={5} disabled={!isEditable} value={answers[q.id] ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)} placeholder="Nhập câu trả lời của bạn..." />
            )}

            {!isEditable && q.question_type !== 'WRITING' && savedAnswer && (
              <div className={`flex items-center gap-1.5 mt-3 text-sm font-medium ${savedAnswer.is_correct ? 'text-emerald-600' : 'text-red-500'}`}>
                {savedAnswer.is_correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {savedAnswer.is_correct ? `Đúng (+${savedAnswer.points_earned} điểm)` : 'Chưa đúng'}
              </div>
            )}
            {!isEditable && q.question_type === 'WRITING' && savedAnswer?.points_earned !== null && savedAnswer?.points_earned !== undefined && (
              <div className="mt-3 text-sm">
                <p className="font-medium text-emerald-600">Điểm: {savedAnswer.points_earned}/{q.points}</p>
                {savedAnswer.teacher_comment && <p className="text-slate-500 mt-1">Nhận xét: {savedAnswer.teacher_comment}</p>}
              </div>
            )}
          </div>
        );
      })}

      {isEditable && (
        <div className="sticky bottom-20 pt-2">
          <button onClick={handleSubmitClick} disabled={submitting || !canSubmit} className="btn-primary w-full disabled:opacity-40">
            {submitting ? 'Đang nộp...' : `Nộp bài${unansweredCount > 0 ? ` (còn ${unansweredCount} câu chưa làm)` : ''}`}
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={doSubmit}
        loading={submitting}
        title="Còn câu chưa trả lời"
        message={`Bạn còn ${unansweredCount} câu chưa trả lời. Vẫn muốn nộp bài?`}
        confirmLabel="Nộp bài"
      />
    </div>
  );
}
