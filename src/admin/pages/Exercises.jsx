import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, NotebookPen, Copy } from 'lucide-react';
import { exerciseService } from '@/services/exerciseService';
import { classService } from '@/services/classService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { Pagination, EmptyState, Skeleton } from '@/components/common/UI';
import { Select, Input, Textarea, SearchInput } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { formatDate } from '@/utils/formatters';

export default function Exercises() {
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
    ({ page, pageSize }) => exerciseService.getExercises({ search, subjectId: subjectId || null, page, pageSize }),
    [search, subjectId]
  );
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, [search, subjectId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await exerciseService.archiveExercise(deleteTarget.id);
      addToast('Đã xóa bài tập');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể xóa bài tập', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleClone = async (ex, e) => {
    e.stopPropagation();
    try {
      const clone = await exerciseService.cloneExercise(ex.id);
      addToast('Đã nhân bản bài tập');
      navigate(`/admin/exercises/${clone.id}`);
    } catch (err) {
      addToast(err.message ?? 'Không thể nhân bản bài tập', 'error');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ngân hàng bài tập</h1>
          <p className="text-slate-500 text-sm mt-1">Soạn bài tập trước, sau đó giao cho lớp hoặc toàn hệ thống</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary"><Plus size={16} /> Thêm bài tập</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên bài tập..." className="flex-1" />
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Tất cả môn học" options={subjects.map((s) => ({ value: s.id, label: s.name }))} className="sm:w-52" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5"><Skeleton className="h-24" /></div>)}</div>
      ) : data.length === 0 ? (
        <div className="card"><EmptyState icon={<NotebookPen size={32} />} title="Chưa có bài tập nào" description='Nhấn "Thêm bài tập" để bắt đầu soạn bài tập tiếng Anh (nghe/nói/đọc/viết).' /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((ex) => (
            <div key={ex.id} onClick={() => navigate(`/admin/exercises/${ex.id}`)} className="card p-5 flex flex-col cursor-pointer hover:shadow-elevated transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center mb-3"><NotebookPen size={20} className="text-primary-600" /></div>
              <p className="font-semibold text-slate-800 line-clamp-2">{ex.title}</p>
              <p className="text-xs text-slate-400 mt-1">{ex.subjects?.name ?? 'Chung'} · {ex.exercise_questions?.length ?? 0} câu hỏi</p>
              <p className="text-xs text-slate-400">{formatDate(ex.created_at)}</p>
              <div className="flex-1" />
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                <button onClick={(e) => handleClone(ex, e)} className="btn btn-ghost btn-sm flex-1"><Copy size={14} /> Nhân bản</button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(ex); }} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data.length > 0 && <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      {createModal && (
        <CreateModal subjects={subjects} onClose={() => setCreateModal(false)} onCreated={(ex) => navigate(`/admin/exercises/${ex.id}`)} />
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Xóa bài tập" message={`Bạn có chắc muốn xóa bài tập "${deleteTarget?.title}"? Các lượt giao bài trước đó vẫn được giữ lại.`} />
    </div>
  );
}

function CreateModal({ subjects, onClose, onCreated }) {
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const ex = await exerciseService.createExercise({ title, description, subject_id: subjectId || null });
      addToast('Đã tạo bài tập, giờ thêm câu hỏi cho bài này');
      onCreated(ex);
    } catch (err) {
      addToast(err.message ?? 'Không thể tạo bài tập', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Thêm bài tập mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Tên bài tập" required placeholder="VD: Unit 5 - Present Perfect" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Mô tả" placeholder="Ghi chú cho giáo viên (không hiển thị cho học viên)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select label="Môn học" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Không thuộc môn cụ thể" options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving || !title.trim()} className="btn-primary flex-1">{saving ? 'Đang tạo...' : 'Tạo & thêm câu hỏi'}</button>
        </div>
      </form>
    </Modal>
  );
}
