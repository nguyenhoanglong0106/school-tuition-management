import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Layers } from 'lucide-react';
import { studyTopicService } from '@/services/studyTopicService';
import { classService } from '@/services/classService';
import { useToast } from '@/contexts/ToastContext';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { Input, Textarea, Select } from '@/components/common/Form';

const WORD_TYPES = ['Danh từ (n)', 'Động từ (v)', 'Tính từ (adj)', 'Trạng từ (adv)', 'Cụm từ (phrase)', 'Giới từ (prep)', 'Đại từ (pron)', 'Liên từ (conj)'];

let tempKeySeq = 0;
const newRow = () => ({ key: `new-${tempKeySeq++}`, id: null, term: '', word_type: WORD_TYPES[0], meaning: '', example_sentence: '' });

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
    </div>
  );
}
