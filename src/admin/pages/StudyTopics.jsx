import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Layers } from 'lucide-react';
import { studyTopicService } from '@/services/studyTopicService';
import { classService } from '@/services/classService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { Pagination, EmptyState, Skeleton } from '@/components/common/UI';
import { Select, Input, Textarea, SearchInput } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';

export default function StudyTopics() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    classService.getAllSubjects().then(setSubjects);
  }, []);

  const fetchFn = useCallback(
    ({ page, pageSize }) => studyTopicService.getAll({ search, subjectId: subjectId || null, page, pageSize }),
    [search, subjectId]
  );
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, [search, subjectId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await studyTopicService.archive(deleteTarget.id);
      addToast('Đã xóa chuyên đề');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể xóa chuyên đề', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chuyên đề học</h1>
          <p className="text-slate-500 text-sm mt-1">Nội dung bài học để học viên xem lại — không chấm điểm</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary"><Plus size={16} /> Thêm chuyên đề</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên chuyên đề..." className="flex-1" />
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Tất cả môn học" options={subjects.map((s) => ({ value: s.id, label: s.name }))} className="sm:w-52" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5"><Skeleton className="h-24" /></div>)}</div>
      ) : data.length === 0 ? (
        <div className="card"><EmptyState icon={<Layers size={32} />} title="Chưa có chuyên đề nào" description='Nhấn "Thêm chuyên đề" để soạn nội dung bài học đầu tiên.' /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((t) => (
            <div key={t.id} onClick={() => navigate(`/admin/study-topics/${t.id}`)} className="card p-5 flex flex-col cursor-pointer hover:shadow-elevated transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center mb-3"><Layers size={20} className="text-primary-600" /></div>
              <p className="font-semibold text-slate-800 line-clamp-2">{t.title}</p>
              <p className="text-xs text-slate-400 mt-1">{t.subjects?.name} · {t.study_topic_vocabulary?.length ?? 0} từ vựng</p>
              <div className="flex-1" />
              <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-100">
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data.length > 0 && <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      {createModal && (
        <CreateModal subjects={subjects} onClose={() => setCreateModal(false)} onCreated={(t) => navigate(`/admin/study-topics/${t.id}`)} />
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Xóa chuyên đề" message={`Bạn có chắc muốn xóa chuyên đề "${deleteTarget?.title}"?`} />
    </div>
  );
}

function CreateModal({ subjects, onClose, onCreated }) {
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) { addToast('Vui lòng nhập tên và chọn môn học', 'error'); return; }
    setSaving(true);
    try {
      const t = await studyTopicService.create({ subject_id: subjectId, title, description });
      addToast('Đã tạo chuyên đề, giờ thêm từ vựng');
      onCreated(t);
    } catch (err) {
      addToast(err.message ?? 'Không thể tạo chuyên đề', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Thêm chuyên đề mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Môn học" required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        <Input label="Tên chuyên đề" required placeholder="VD: Môi trường & Thiên nhiên" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Mô tả ngắn" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang tạo...' : 'Tạo & thêm từ vựng'}</button>
        </div>
      </form>
    </Modal>
  );
}
