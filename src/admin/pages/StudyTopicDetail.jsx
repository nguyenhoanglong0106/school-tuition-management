import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Layers, MessageSquare, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { studyTopicService } from '@/services/studyTopicService';
import { classService } from '@/services/classService';
import { useToast } from '@/contexts/ToastContext';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { Input, Textarea, Select } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';

const WORD_TYPES = ['Danh từ (n)', 'Động từ (v)', 'Tính từ (adj)', 'Trạng từ (adv)', 'Cụm từ (phrase)', 'Giới từ (prep)', 'Đại từ (pron)', 'Liên từ (conj)'];

let tempKeySeq = 0;
const newRow = () => ({ key: `new-${tempKeySeq++}`, id: null, term: '', word_type: WORD_TYPES[0], meaning: '', example_sentence: '' });
const newDialogueLine = (speaker) => ({ key: `new-${tempKeySeq++}`, speaker, english: '', vietnamese: '' });

export default function StudyTopicDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [vocab, setVocab] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [situations, setSituations] = useState([]);
  const [situationModal, setSituationModal] = useState(false);
  const [editingSituation, setEditingSituation] = useState(null);
  const [deleteSituationTarget, setDeleteSituationTarget] = useState(null);
  const [deletingSituation, setDeletingSituation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [t, subs] = await Promise.all([studyTopicService.getById(id), classService.getAllSubjects()]);
      setTitle(t.title);
      setDescription(t.description ?? '');
      setSubjectId(t.subject_id);
      setVocab((t.study_topic_vocabulary ?? []).map((v) => ({ key: v.id, ...v })));
      setSituations(t.study_topic_situations ?? []);
      setSubjects(subs);
    } catch (err) {
      addToast(err.message ?? 'Không tìm thấy chuyên đề', 'error');
      navigate('/admin/study-topics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addVocabRow = () => setVocab((v) => [...v, newRow()]);
  const removeVocabRow = (key, rowId) => {
    setVocab((v) => v.filter((row) => row.key !== key));
    if (rowId) setRemovedIds((ids) => [...ids, rowId]);
  };
  const updateVocabField = (key, field, value) => setVocab((v) => v.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  const handleSave = async () => {
    if (!title.trim() || !subjectId) { addToast('Vui lòng nhập tên và chọn môn học', 'error'); return; }
    if (vocab.some((v) => !v.term.trim() || !v.meaning.trim())) { addToast('Vui lòng nhập đủ Tiếng Anh và Tiếng Việt cho mỗi từ vựng', 'error'); return; }

    setSaving(true);
    try {
      await studyTopicService.update(id, { title, description, subject_id: subjectId });

      await Promise.all(removedIds.map((rid) => studyTopicService.deleteVocabulary(rid)));

      await Promise.all(vocab.map((row, idx) => {
        const payload = { term: row.term, word_type: row.word_type, meaning: row.meaning, example_sentence: row.example_sentence, order_index: idx };
        return row.id ? studyTopicService.updateVocabulary(row.id, payload) : studyTopicService.addVocabulary(id, payload);
      }));

      addToast('Đã lưu chuyên đề');
      setRemovedIds([]);
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu chuyên đề', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <div className="card p-5"><Skeleton className="h-32" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => navigate('/admin/study-topics')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Quay lại danh sách chuyên đề
      </button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Chỉnh sửa chuyên đề</h1>
          <p className="text-slate-500 text-sm mt-1">Cập nhật nội dung chuyên đề</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu chuyên đề'}</button>
      </div>

      <div className="card p-5 space-y-4">
        <Select label="Môn học" required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        <Input label="Tên chuyên đề" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Mô tả ngắn" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Từ vựng ({vocab.length})</h3>
          <button onClick={addVocabRow} className="btn btn-outline btn-sm"><Plus size={14} /> Thêm từ vựng</button>
        </div>

        {vocab.length === 0 ? (
          <EmptyState icon={<Layers size={24} />} title="Chưa có từ vựng nào" description='Nhấn "Thêm từ vựng" để bắt đầu.' />
        ) : (
          <div className="space-y-4">
            {vocab.map((row) => (
              <div key={row.key} className="p-4 rounded-2xl border border-slate-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                  <Input label="Tiếng Anh" value={row.term} onChange={(e) => updateVocabField(row.key, 'term', e.target.value)} />
                  <Select label="Từ loại" value={row.word_type} onChange={(e) => updateVocabField(row.key, 'word_type', e.target.value)} placeholder={null}
                    options={WORD_TYPES.map((w) => ({ value: w, label: w }))} />
                  <div className="flex gap-2">
                    <Input label="Tiếng Việt" className="flex-1" value={row.meaning} onChange={(e) => updateVocabField(row.key, 'meaning', e.target.value)} />
                    <button onClick={() => removeVocabRow(row.key, row.id)} className="p-2.5 mt-6 rounded-lg hover:bg-red-50 text-red-500 flex-shrink-0"><X size={16} /></button>
                  </div>
                </div>
                <Input label="Câu ví dụ" value={row.example_sentence ?? ''} onChange={(e) => updateVocabField(row.key, 'example_sentence', e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Tình huống hội thoại ({situations.length})</h3>
          <button onClick={() => { setEditingSituation(null); setSituationModal(true); }} className="btn btn-outline btn-sm">
            <Plus size={14} /> Thêm tình huống
          </button>
        </div>

        {situations.length === 0 ? (
          <EmptyState icon={<MessageSquare size={24} />} title="Chưa có tình huống hội thoại nào" description='Nhấn "Thêm tình huống" — AI sẽ soạn nháp hội thoại cho bạn.' />
        ) : (
          <div className="space-y-3">
            {situations.map((s) => (
              <div key={s.id} className="p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-400">{s.dialogue?.length ?? 0} lượt nói</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setEditingSituation(s); setSituationModal(true); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={16} /></button>
                    <button onClick={() => setDeleteSituationTarget(s)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {situationModal && (
        <SituationModal
          topicId={id}
          topicTitle={title}
          situation={editingSituation}
          onClose={() => setSituationModal(false)}
          onSaved={() => { setSituationModal(false); load(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteSituationTarget}
        onClose={() => setDeleteSituationTarget(null)}
        loading={deletingSituation}
        title="Xóa tình huống"
        message={`Bạn có chắc muốn xóa tình huống "${deleteSituationTarget?.title}"?`}
        onConfirm={async () => {
          setDeletingSituation(true);
          try {
            await studyTopicService.deleteSituation(deleteSituationTarget.id);
            addToast('Đã xóa tình huống');
            setDeleteSituationTarget(null);
            load();
          } catch (err) {
            addToast(err.message ?? 'Không thể xóa tình huống', 'error');
          } finally {
            setDeletingSituation(false);
          }
        }}
      />
    </div>
  );
}

function SituationModal({ topicId, topicTitle, situation, onClose, onSaved }) {
  const { addToast } = useToast();
  const isEditing = !!situation;
  const [title, setTitle] = useState(situation?.title ?? '');
  const [dialogue, setDialogue] = useState(
    (situation?.dialogue ?? []).map((l) => ({ key: `line-${tempKeySeq++}`, ...l }))
  );
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!title.trim()) { addToast('Nhập tên tình huống trước đã', 'error'); return; }
    setGenerating(true);
    try {
      const lines = await studyTopicService.generateDialogue(title, topicTitle);
      setDialogue(lines.map((l) => ({ key: `ai-${tempKeySeq++}`, speaker: l.speaker === 'B' ? 'B' : 'A', english: l.english ?? '', vietnamese: l.vietnamese ?? '' })));
      addToast('AI đã soạn xong, bạn xem lại và chỉnh sửa nếu cần');
    } catch (err) {
      addToast(err.message ?? 'Không thể tạo hội thoại bằng AI', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const addLine = () => setDialogue((d) => [...d, newDialogueLine(d.length % 2 === 0 ? 'A' : 'B')]);
  const removeLine = (key) => setDialogue((d) => d.filter((l) => l.key !== key));
  const updateLine = (key, field, value) => setDialogue((d) => d.map((l) => (l.key === key ? { ...l, [field]: value } : l)));

  const handleSave = async () => {
    if (!title.trim()) { addToast('Vui lòng nhập tên tình huống', 'error'); return; }
    if (dialogue.length === 0) { addToast('Vui lòng thêm ít nhất 1 câu hội thoại', 'error'); return; }
    if (dialogue.some((l) => !l.english.trim())) { addToast('Vui lòng nhập đủ nội dung tiếng Anh cho mỗi câu', 'error'); return; }

    setSaving(true);
    try {
      const payload = { title, dialogue: dialogue.map(({ speaker, english, vietnamese }) => ({ speaker, english, vietnamese })) };
      if (isEditing) await studyTopicService.updateSituation(situation.id, payload);
      else await studyTopicService.addSituation(topicId, payload);
      addToast(isEditing ? 'Đã cập nhật tình huống' : 'Đã thêm tình huống');
      onSaved();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu tình huống', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Sửa tình huống' : 'Thêm tình huống'} size="xl">
      <div className="space-y-4">
        <div className="flex gap-2 items-end">
          <Input label="Tên tình huống" required className="flex-1" placeholder="VD: Nhờ vả và giúp đỡ" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button onClick={handleGenerate} disabled={generating} className="btn-primary btn-sm flex-shrink-0">
            <Sparkles size={14} /> {generating ? 'Đang tạo...' : dialogue.length > 0 ? 'Tạo lại bằng AI' : 'Tạo bằng AI'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="form-label mb-0">Đoạn hội thoại</label>
          <button onClick={addLine} className="btn btn-ghost btn-sm"><Plus size={14} /> Thêm câu</button>
        </div>

        {dialogue.length === 0 ? (
          <EmptyState icon={<MessageSquare size={24} />} title="Chưa có nội dung" description='Bấm "Tạo bằng AI" hoặc "Thêm câu" để soạn thủ công.' />
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {dialogue.map((line) => (
              <div key={line.key} className="p-3 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                  <Select value={line.speaker} onChange={(e) => updateLine(line.key, 'speaker', e.target.value)} placeholder={null}
                    options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }]} className="w-20" />
                  <button onClick={() => removeLine(line.key)} className="ml-auto p-1.5 rounded-lg hover:bg-red-50 text-red-500"><X size={14} /></button>
                </div>
                <Input placeholder="Tiếng Anh" value={line.english} onChange={(e) => updateLine(line.key, 'english', e.target.value)} />
                <Input placeholder="Tiếng Việt" value={line.vietnamese} onChange={(e) => updateLine(line.key, 'vietnamese', e.target.value)} />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu tình huống'}</button>
        </div>
      </div>
    </Modal>
  );
}
