import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { classService } from '@/services/classService';
import { useToast } from '@/contexts/ToastContext';
import { EmptyState, Skeleton } from '@/components/common/UI';
import { Input, Checkbox } from '@/components/common/Form';
import { ConfirmDialog, Modal } from '@/components/common/Modal';

const schema = z.object({
  code: z.string().min(1, 'Bắt buộc').toUpperCase(),
  name: z.string().min(1, 'Vui lòng nhập tên môn học'),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export default function Subjects() {
  const { addToast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await classService.getAllSubjects();
      setSubjects(data);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    reset({ code: '', name: '', description: '', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    reset({ code: s.code, name: s.name, description: s.description ?? '', is_active: s.is_active });
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await classService.updateSubject(editing.id, values);
        addToast('Đã cập nhật môn học');
      } else {
        await classService.createSubject(values);
        addToast('Đã thêm môn học');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu môn học', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await classService.deactivateSubject(deleteTarget.id);
      addToast('Đã ngừng hoạt động môn học');
      setDeleteTarget(null);
      load();
    } catch (err) {
      addToast(err.message ?? 'Không thể xóa môn học', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Môn học</h1>
          <p className="text-slate-500 text-sm mt-1">Danh mục các môn học đang giảng dạy</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Thêm môn học</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5"><Skeleton className="h-20" /></div>)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="card"><EmptyState icon={<BookOpen size={32} />} title="Chưa có môn học" description='Nhấn "Thêm môn học" để bắt đầu.' /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge badge-primary">{s.code}</span>
                  <h3 className="font-semibold text-slate-800 mt-2">{s.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Sửa môn học"><Pencil size={16} /></button>
                  {s.is_active && <button onClick={() => setDeleteTarget(s)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" aria-label="Xóa môn học"><Trash2 size={16} /></button>}
                </div>
              </div>
              {s.description && <p className="text-sm text-slate-500 mt-2">{s.description}</p>}
              {!s.is_active && <span className="badge badge-neutral mt-3">Ngừng hoạt động</span>}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Cập nhật môn học' : 'Thêm môn học'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Mã môn học" required placeholder="VD: TOAN" {...register('code')} error={errors.code?.message} />
          <Input label="Tên môn học" required {...register('name')} error={errors.name?.message} />
          <Input label="Mô tả" {...register('description')} />
          <Checkbox label="Đang hoạt động" {...register('is_active')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost flex-1">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Ngừng hoạt động môn học"
        message={`Môn học "${deleteTarget?.name}" sẽ được ngừng hoạt động và không còn xuất hiện khi tạo lớp mới. Dữ liệu lớp học cũ vẫn được giữ lại.`}
        confirmLabel="Ngừng hoạt động"
      />
    </div>
  );
}
