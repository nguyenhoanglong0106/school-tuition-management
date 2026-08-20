import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Lock, Headphones, X, Send } from 'lucide-react';
import { exerciseService } from '@/services/exerciseService';
import { useToast } from '@/contexts/ToastContext';
import { EmptyState, Skeleton, Spinner } from '@/components/common/UI';
import { Input, Textarea, Select, Checkbox } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { FileUpload } from '@/components/common/FileUpload';
import { AssignExerciseModal } from '@/admin/components/AssignExerciseModal';
import { AssignmentStatusBadge } from '@/components/common/Badge';
import { formatDateTime } from '@/utils/formatters';

const TYPE_LABELS = {
  MULTIPLE_CHOICE: 'Trắc nghiệm',
  FILL_BLANK: 'Điền từ',
  WRITING: 'Tự luận',
};

const TYPE_BADGE_CLASS = {
  MULTIPLE_CHOICE: 'badge-primary',
  FILL_BLANK: 'badge-warning',
  WRITING: 'badge-neutral',
};

export default function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [exercise, setExercise] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [assignModal, setAssignModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ex, assignmentList] = await Promise.all([
        exerciseService.getExerciseById(id),
        exerciseService.getAssignments({ exerciseId: id, pageSize: 100 }),
      ]);
      setExercise(ex);
      setAssignments(assignmentList.data);
      setLocked(assignmentList.count > 0);
    } catch (err) {
      addToast(err.message ?? 'Không thể tải bài tập', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openCreate = () => { setEditingQuestion(null); setQuestionModal(true); };
  const openEdit = (q) => { setEditingQuestion(q); setQuestionModal(true); };

  const handleDeleteQuestion = async () => {
    setDeleting(true);
    try {
      await exerciseService.deleteQuestion(deleteTarget.id);
      addToast('Đã xóa câu hỏi');
      setDeleteTarget(null);
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể xóa câu hỏi', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const move = async (question, direction) => {
    const questions = exercise.exercise_questions;
    const idx = questions.findIndex((q) => q.id === question.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= questions.length) return;
    const other = questions[swapIdx];

    setReordering(true);
    try {
      await Promise.all([
        exerciseService.updateQuestion(question.id, { order_index: other.order_index }),
        exerciseService.updateQuestion(other.id, { order_index: question.order_index }),
      ]);
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể sắp xếp lại câu hỏi', 'error');
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <div className="card p-5"><Skeleton className="h-24" /></div>
      </div>
    );
  }

  if (!exercise) return null;

  const questions = exercise.exercise_questions ?? [];
  const totalPoints = questions.reduce((s, q) => s + Number(q.points), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => navigate('/admin/exercises')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Quay lại ngân hàng bài tập
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">{exercise.title}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {exercise.subjects?.name ?? 'Chung'} · {questions.length} câu hỏi · {totalPoints} điểm
          </p>
          {exercise.description && <p className="text-slate-500 text-sm mt-1">{exercise.description}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAssignModal(true)} className="btn btn-outline"><Send size={16} /> Giao bài</button>
          <button onClick={openCreate} disabled={locked} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            <Plus size={16} /> Thêm câu hỏi
          </button>
        </div>
      </div>

      {locked && (
        <div className="card p-4 bg-amber-50 border-amber-200 flex items-center gap-3 text-amber-800 text-sm">
          <Lock size={18} className="flex-shrink-0" />
          Bài tập này đã được giao ít nhất 1 lần nên không thể sửa câu hỏi/đáp án nữa (để không làm sai lệch điểm đã chấm). Dùng nút "Nhân bản" ở trang danh sách để tạo bản sao chỉnh sửa được.
        </div>
      )}

      {questions.length === 0 ? (
        <div className="card"><EmptyState title="Chưa có câu hỏi nào" description='Nhấn "Thêm câu hỏi" để bắt đầu soạn trắc nghiệm, điền từ, tự luận, hoặc bài nghe.' /></div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="card p-4 flex items-start gap-4">
              <div className="flex flex-col items-center gap-1 pt-1">
                <button onClick={() => move(q, 'up')} disabled={locked || reordering || idx === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30" aria-label="Lên"><ChevronUp size={16} /></button>
                <span className="text-xs font-medium text-slate-400">{idx + 1}</span>
                <button onClick={() => move(q, 'down')} disabled={locked || reordering || idx === questions.length - 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30" aria-label="Xuống"><ChevronDown size={16} /></button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className={`badge ${TYPE_BADGE_CLASS[q.question_type]}`}>{TYPE_LABELS[q.question_type]}</span>
                  {q.media_type === 'AUDIO' && <span className="badge badge-neutral flex items-center gap-1"><Headphones size={12} /> Nghe</span>}
                  <span className="text-xs text-slate-400">{q.points} điểm</span>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2">{q.question_text}</p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(q)} disabled={locked} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30" aria-label="Sửa câu hỏi"><Pencil size={16} /></button>
                <button onClick={() => setDeleteTarget(q)} disabled={locked} className="p-2 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-30" aria-label="Xóa câu hỏi"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        <h3 className="font-semibold text-slate-800 mb-3">Đã giao ({assignments.length})</h3>
        {assignments.length === 0 ? (
          <div className="card"><EmptyState title="Chưa giao bài tập này cho ai" description='Nhấn "Giao bài" ở trên để chọn lớp hoặc giao toàn hệ thống.' /></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Lớp / Phạm vi</th><th>Hạn nộp</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} onClick={() => navigate(`/admin/assignments/${a.id}`)} className="cursor-pointer hover:bg-slate-50">
                    <td className="font-medium">{a.scope === 'SYSTEM' ? 'Toàn hệ thống' : (a.classes?.class_name ?? '—')}</td>
                    <td>{formatDateTime(a.due_at)}</td>
                    <td><AssignmentStatusBadge status={a.status} /></td>
                    <td className="text-primary-600 text-sm">Xem tiến độ →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {questionModal && (
        <QuestionModal
          exerciseId={id}
          question={editingQuestion}
          nextOrderIndex={questions.length}
          onClose={() => setQuestionModal(false)}
          onSaved={() => { setQuestionModal(false); load(); }}
        />
      )}

      {assignModal && (
        <AssignExerciseModal
          fixedExerciseId={id}
          onClose={() => setAssignModal(false)}
          onAssigned={() => { setAssignModal(false); load(); }}
        />
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteQuestion} loading={deleting}
        title="Xóa câu hỏi" message="Bạn có chắc muốn xóa câu hỏi này?" />
    </div>
  );
}

function QuestionModal({ exerciseId, question, nextOrderIndex, onClose, onSaved }) {
  const { addToast } = useToast();
  const isEditing = !!question;
  const key = question?.exercise_answer_keys;

  const [questionType, setQuestionType] = useState(question?.question_type ?? 'MULTIPLE_CHOICE');
  const [questionText, setQuestionText] = useState(question?.question_text ?? '');
  const [points, setPoints] = useState(question?.points ?? 1);
  const [mediaFile, setMediaFile] = useState(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState(question?.media_url ?? null);
  const [existingMediaPreview, setExistingMediaPreview] = useState(null);
  const [options, setOptions] = useState(
    question?.options?.length ? question.options : [{ id: 'a', text: '' }, { id: 'b', text: '' }]
  );
  const [correctIds, setCorrectIds] = useState(key?.correct_answer ?? []);
  const [blanks, setBlanks] = useState(
    key?.correct_answer?.length ? key.correct_answer.map((accepted) => ({ accepted: accepted.join(', ') })) : [{ accepted: '' }]
  );
  const [caseSensitive, setCaseSensitive] = useState(key?.case_sensitive ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingMediaUrl) {
      exerciseService.getMediaUrl(existingMediaUrl).then(setExistingMediaPreview);
    }
  }, [existingMediaUrl]);

  const nextOptionId = () => String.fromCharCode(97 + options.length);

  const addOption = () => setOptions((opts) => [...opts, { id: nextOptionId(), text: '' }]);
  const removeOption = (idx) => {
    const removed = options[idx];
    setOptions((opts) => opts.filter((_, i) => i !== idx));
    setCorrectIds((ids) => ids.filter((id) => id !== removed.id));
  };
  const updateOptionText = (idx, text) => setOptions((opts) => opts.map((o, i) => (i === idx ? { ...o, text } : o)));
  const toggleCorrect = (optId) => setCorrectIds((ids) => (ids.includes(optId) ? ids.filter((i) => i !== optId) : [...ids, optId]));

  const addBlank = () => setBlanks((b) => [...b, { accepted: '' }]);
  const removeBlank = (idx) => setBlanks((b) => b.filter((_, i) => i !== idx));
  const updateBlank = (idx, accepted) => setBlanks((b) => b.map((row, i) => (i === idx ? { accepted } : row)));

  const validate = () => {
    if (!questionText.trim()) return 'Vui lòng nhập nội dung câu hỏi';
    if (Number(points) <= 0) return 'Điểm phải lớn hơn 0';
    if (questionType === 'MULTIPLE_CHOICE') {
      if (options.some((o) => !o.text.trim())) return 'Vui lòng nhập đủ nội dung cho các lựa chọn';
      if (options.length < 2) return 'Cần ít nhất 2 lựa chọn';
      if (correctIds.length === 0) return 'Vui lòng chọn ít nhất 1 đáp án đúng';
    }
    if (questionType === 'FILL_BLANK') {
      if (blanks.some((b) => !b.accepted.trim())) return 'Vui lòng nhập đáp án chấp nhận được cho mỗi chỗ trống';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { addToast(err, 'error'); return; }

    setSaving(true);
    try {
      let mediaUrl = existingMediaUrl;
      let mediaType = existingMediaUrl ? 'AUDIO' : null;
      if (mediaFile) {
        mediaUrl = await exerciseService.uploadMedia(mediaFile);
        mediaType = 'AUDIO';
      }

      const payload = {
        order_index: question?.order_index ?? nextOrderIndex,
        question_type: questionType,
        question_text: questionText,
        media_url: mediaUrl,
        media_type: mediaType,
        // FILL_BLANK: options carries only { blank_count } — the accepted
        // answers stay in the answer-key table, students only need to know
        // how many blanks to render.
        options: questionType === 'MULTIPLE_CHOICE' ? options
          : questionType === 'FILL_BLANK' ? { blank_count: blanks.length }
          : null,
        points: Number(points),
      };

      const saved = isEditing
        ? await exerciseService.updateQuestion(question.id, payload)
        : await exerciseService.addQuestion(exerciseId, payload);

      if (questionType === 'MULTIPLE_CHOICE') {
        await exerciseService.upsertAnswerKey(saved.id, { correct_answer: correctIds, case_sensitive: false });
      } else if (questionType === 'FILL_BLANK') {
        const correctAnswer = blanks.map((b) => b.accepted.split(',').map((s) => s.trim()).filter(Boolean));
        await exerciseService.upsertAnswerKey(saved.id, { correct_answer: correctAnswer, case_sensitive: caseSensitive });
      }

      addToast(isEditing ? 'Đã cập nhật câu hỏi' : 'Đã thêm câu hỏi');
      onSaved();
    } catch (err2) {
      addToast(err2.message ?? 'Không thể lưu câu hỏi', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Sửa câu hỏi' : 'Thêm câu hỏi'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Loại câu hỏi" required value={questionType} onChange={(e) => setQuestionType(e.target.value)} placeholder={null}
          options={[
            { value: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm' },
            { value: 'FILL_BLANK', label: 'Điền từ' },
            { value: 'WRITING', label: 'Tự luận (chấm tay)' },
          ]}
        />

        <Textarea label="Nội dung câu hỏi" required rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)}
          placeholder={questionType === 'FILL_BLANK' ? 'VD: The capital of France is ___.' : 'Nhập đề bài...'} />

        <div>
          <label className="form-label">File nghe (không bắt buộc)</label>
          {existingMediaUrl && !mediaFile ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              {existingMediaPreview ? <audio controls src={existingMediaPreview} className="flex-1 h-9" /> : <Spinner size="sm" />}
              <button type="button" onClick={() => setExistingMediaUrl(null)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
          ) : (
            <FileUpload file={mediaFile} onFileChange={setMediaFile} accept="audio/*" maxSizeMB={15} label="Tải file audio (mp3, wav...)" />
          )}
        </div>

        {questionType === 'MULTIPLE_CHOICE' && (
          <div>
            <label className="form-label">Các lựa chọn (tick vào đáp án đúng)</label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Checkbox checked={correctIds.includes(opt.id)} onChange={() => toggleCorrect(opt.id)} />
                  <Input className="flex-1" value={opt.text} onChange={(e) => updateOptionText(idx, e.target.value)} placeholder={`Lựa chọn ${opt.id.toUpperCase()}`} />
                  {options.length > 2 && (
                    <button type="button" onClick={() => removeOption(idx)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button type="button" onClick={addOption} className="btn btn-ghost btn-sm mt-2"><Plus size={14} /> Thêm lựa chọn</button>
            )}
          </div>
        )}

        {questionType === 'FILL_BLANK' && (
          <div>
            <label className="form-label">Chỗ trống & đáp án chấp nhận được</label>
            <p className="text-xs text-slate-400 mb-2">Mỗi dòng là 1 chỗ trống theo đúng thứ tự trong câu. Cách nhau bằng dấu phẩy nếu chấp nhận nhiều cách viết (VD: "is, was").</p>
            <div className="space-y-2">
              {blanks.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-16 flex-shrink-0">Chỗ {idx + 1}</span>
                  <Input className="flex-1" value={b.accepted} onChange={(e) => updateBlank(idx, e.target.value)} placeholder="paris, Paris" />
                  {blanks.length > 1 && (
                    <button type="button" onClick={() => removeBlank(idx)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addBlank} className="btn btn-ghost btn-sm mt-2"><Plus size={14} /> Thêm chỗ trống</button>
            <Checkbox className="mt-3" label="Phân biệt chữ hoa/thường" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
          </div>
        )}

        {questionType === 'WRITING' && (
          <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">Câu tự luận không tự động chấm — giáo viên sẽ chấm điểm và nhận xét sau khi học viên nộp bài.</p>
        )}

        <Input label="Điểm" type="number" min="0.5" step="0.5" required value={points} onChange={(e) => setPoints(e.target.value)} className="w-32" />

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu câu hỏi'}</button>
        </div>
      </form>
    </Modal>
  );
}
