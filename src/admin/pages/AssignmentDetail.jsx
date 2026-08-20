import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, FileCheck } from 'lucide-react';
import { exerciseService } from '@/services/exerciseService';
import { useToast } from '@/contexts/ToastContext';
import { Skeleton, EmptyState, Avatar, Spinner } from '@/components/common/UI';
import { Input } from '@/components/common/Form';
import { Modal } from '@/components/common/Modal';
import { AssignmentStatusBadge, SubmissionStatusBadge } from '@/components/common/Badge';
import { formatDateTime } from '@/utils/formatters';

const TYPE_LABELS = { MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ', WRITING: 'Tự luận' };

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [gradingSubmissionId, setGradingSubmissionId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, subs] = await Promise.all([
        exerciseService.getAssignmentById(id),
        exerciseService.getSubmissionsForAssignment(id),
      ]);
      setAssignment(a);
      setSubmissions(subs);
    } catch (err) {
      addToast(err.message ?? 'Không thể tải lượt giao bài', 'error');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleApproveLate = async (submissionId) => {
    setApprovingId(submissionId);
    try {
      await exerciseService.approveLateSubmission(submissionId);
      addToast('Đã cho phép học viên nộp trễ');
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể thực hiện', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleClose = async () => {
    try {
      await exerciseService.closeAssignment(id);
      addToast('Đã đóng lượt giao bài — học viên không thể nộp bài thêm');
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể đóng lượt giao bài', 'error');
    }
  };

  const handleReopen = async () => {
    try {
      await exerciseService.reopenAssignment(id);
      addToast('Đã mở lại lượt giao bài');
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể mở lại lượt giao bài', 'error');
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><div className="card p-6"><Skeleton className="h-32" /></div></div>;
  if (!assignment) return null;

  const submittedCount = submissions.filter((s) => ['SUBMITTED', 'LATE', 'GRADED'].includes(s.status)).length;
  const gradedCount = submissions.filter((s) => s.status === 'GRADED').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{assignment.title_override ?? assignment.exercises?.title}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {assignment.scope === 'SYSTEM' ? 'Toàn hệ thống' : assignment.classes?.class_name} · Hạn nộp {formatDateTime(assignment.due_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AssignmentStatusBadge status={assignment.status} />
            {assignment.status === 'ACTIVE' && (
              <button onClick={handleClose} className="btn btn-ghost btn-sm">Đóng lượt giao bài</button>
            )}
            {assignment.status === 'CLOSED' && (
              <button onClick={handleReopen} className="btn btn-ghost btn-sm">Mở lại</button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 text-sm">
          <div><p className="text-slate-400 text-xs">Tổng học viên</p><p className="font-semibold text-slate-700 text-lg">{submissions.length}</p></div>
          <div><p className="text-slate-400 text-xs">Đã nộp</p><p className="font-semibold text-slate-700 text-lg">{submittedCount}</p></div>
          <div><p className="text-slate-400 text-xs">Đã chấm xong</p><p className="font-semibold text-slate-700 text-lg">{gradedCount}</p></div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="card"><EmptyState title="Chưa có học viên nào trong lượt giao bài này" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Học viên</th><th>Trạng thái</th><th>Điểm</th><th>Nộp lúc</th><th></th></tr></thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar src={s.students?.avatar_url} name={s.students?.full_name} size={8} />
                      <div>
                        <p className="font-medium text-slate-700">{s.students?.full_name}</p>
                        <p className="text-xs text-slate-400">{s.students?.student_code}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <SubmissionStatusBadge status={s.status} />
                    {['NOT_STARTED', 'IN_PROGRESS'].includes(s.status) && new Date(assignment.due_at) < new Date() && (
                      <span className="text-xs text-red-500 font-medium ml-1.5">Quá hạn</span>
                    )}
                  </td>
                  <td>{s.total_score !== null ? `${s.total_score}/${s.max_score}` : (s.auto_score !== null ? `${s.auto_score}/${s.max_score} (tự động)` : '—')}</td>
                  <td>{s.submitted_at ? formatDateTime(s.submitted_at) : '—'}</td>
                  <td>
                    {['SUBMITTED', 'LATE', 'GRADED'].includes(s.status) && (
                      <button onClick={() => setGradingSubmissionId(s.id)} className="btn btn-ghost btn-sm">
                        <FileCheck size={14} /> {s.status === 'GRADED' ? 'Xem bài làm' : 'Chấm bài'}
                      </button>
                    )}
                    {['NOT_STARTED', 'IN_PROGRESS'].includes(s.status) && !s.late_approved_by && (
                      <button onClick={() => handleApproveLate(s.id)} disabled={approvingId === s.id} className="btn btn-ghost btn-sm">
                        <Clock size={14} /> Cho phép nộp trễ
                      </button>
                    )}
                    {s.late_approved_by && ['NOT_STARTED', 'IN_PROGRESS'].includes(s.status) && (
                      <span className="text-xs text-slate-400">Đã cho phép nộp trễ</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {gradingSubmissionId && (
        <GradeSubmissionModal
          submissionId={gradingSubmissionId}
          onClose={() => setGradingSubmissionId(null)}
          onGraded={load}
        />
      )}
    </div>
  );
}

function GradeSubmissionModal({ submissionId, onClose, onGraded }) {
  const { addToast } = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await exerciseService.getSubmissionDetail(submissionId);
      setDetail(d);
      const sc = {};
      const cm = {};
      d.answers.forEach((a) => {
        if (a.exercise_questions.question_type === 'WRITING') {
          sc[a.id] = a.points_earned ?? '';
          cm[a.id] = a.teacher_comment ?? '';
        }
      });
      setScores(sc);
      setComments(cm);
    } catch (err) {
      addToast(err.message ?? 'Không thể tải bài làm', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  const handleGrade = async (answer) => {
    const maxPoints = answer.exercise_questions.points;
    const points = Number(scores[answer.id]);
    if (scores[answer.id] === '' || Number.isNaN(points) || points < 0 || points > maxPoints) {
      addToast(`Điểm phải từ 0 đến ${maxPoints}`, 'error');
      return;
    }
    setSavingId(answer.id);
    try {
      await exerciseService.gradeWritingAnswer(answer.id, points, comments[answer.id] || null);
      addToast('Đã lưu điểm câu này');
      await load();
      onGraded();
    } catch (err) {
      addToast(err.message ?? 'Không thể chấm điểm', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const optionText = (q, id) => q.options?.find((o) => o.id === id)?.text ?? id;

  return (
    <Modal isOpen onClose={onClose} title={detail ? `Chấm bài — ${detail.students?.full_name}` : 'Chấm bài'} size="xl">
      {loading || !detail ? (
        <div className="py-10"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          {detail.answers.map((a, idx) => {
            const q = a.exercise_questions;
            return (
              <div key={a.id} className="p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs text-slate-400">Câu {idx + 1}</span>
                  <span className="badge badge-neutral">{TYPE_LABELS[q.question_type]}</span>
                  <span className="text-xs text-slate-400 ml-auto">{q.points} điểm</span>
                </div>
                <p className="text-sm font-medium text-slate-700 mb-2">{q.question_text}</p>

                {q.question_type === 'WRITING' ? (
                  <>
                    <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 whitespace-pre-line mb-3">
                      {a.student_answer || <em className="text-slate-400">Học viên chưa trả lời</em>}
                    </div>
                    <div className="flex gap-3 items-end flex-wrap">
                      <Input label={`Điểm (tối đa ${q.points})`} type="number" min="0" max={q.points} step="0.5" value={scores[a.id] ?? ''}
                        onChange={(e) => setScores((s) => ({ ...s, [a.id]: e.target.value }))} className="w-36" />
                      <Input label="Nhận xét (không bắt buộc)" value={comments[a.id] ?? ''}
                        onChange={(e) => setComments((c) => ({ ...c, [a.id]: e.target.value }))} className="flex-1 min-w-[180px]" />
                      <button onClick={() => handleGrade(a)} disabled={savingId === a.id} className="btn-primary btn-sm">
                        {savingId === a.id ? 'Đang lưu...' : 'Lưu điểm'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3 text-sm flex-wrap">
                    <span className="text-slate-500">
                      Trả lời: {q.question_type === 'MULTIPLE_CHOICE'
                        ? (a.student_answer ?? []).map((id) => optionText(q, id)).join(', ') || '—'
                        : (a.student_answer ?? []).join(', ') || '—'}
                    </span>
                    <span className={a.is_correct ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                      {a.is_correct ? `Đúng (+${a.points_earned})` : 'Sai (0đ)'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
