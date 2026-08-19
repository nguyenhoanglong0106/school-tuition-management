import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, School, Trash2, Pencil } from 'lucide-react';
import { classService } from '@/services/classService';
import { teacherService } from '@/services/teacherService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/common/DataTable';
import { Pagination, EmptyState } from '@/components/common/UI';
import { SearchInput, Select, Input, Textarea } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { ClassStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { CLASS_STATUS, FEE_CYCLE } from '@/constants';

const schema = z.object({
  class_name: z.string().min(2, 'Vui lòng nhập tên lớp'),
  subject_id: z.string().min(1, 'Vui lòng chọn môn học'),
  teacher_id: z.string().optional().or(z.literal('')),
  tuition_fee: z.coerce.number().min(0, 'Học phí không được âm'),
  session_fee: z.coerce.number().min(0, 'Phí mỗi buổi không được âm'),
  fee_cycle: z.string(),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  capacity: z.coerce.number().min(1).optional(),
  room: z.string().optional(),
  description: z.string().optional(),
  status: z.string(),
}).refine((d) => !d.end_date || !d.start_date || d.end_date >= d.start_date, {
  message: 'Ngày kết thúc phải sau ngày bắt đầu', path: ['end_date'],
});

export default function Classes() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchFn = useCallback(
    ({ page, pageSize }) => classService.getAll({ search, status, page, pageSize }),
    [search, status]
  );
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, [search, status]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'ACTIVE', fee_cycle: 'MONTHLY', capacity: 30 },
  });

  useEffect(() => {
    classService.getAllSubjects().then(setSubjects);
    teacherService.getAll({ pageSize: 100 }).then((r) => setTeachers(r.data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ status: 'ACTIVE', fee_cycle: 'MONTHLY', capacity: 30, class_name: '', subject_id: '', teacher_id: '', tuition_fee: 0, session_fee: 0 });
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    reset({
      class_name: c.class_name, subject_id: c.subject_id ?? '', teacher_id: c.teacher_id ?? '',
      tuition_fee: c.tuition_fee, session_fee: c.session_fee ?? 0, fee_cycle: c.fee_cycle, start_date: c.start_date ?? '', end_date: c.end_date ?? '',
      capacity: c.capacity ?? 30, room: c.room ?? '', description: c.description ?? '', status: c.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, teacher_id: values.teacher_id || null };
      if (editing) {
        await classService.update(editing.id, payload);
        addToast('Đã cập nhật lớp học');
      } else {
        const prefix = (subjects.find((s) => s.id === values.subject_id)?.code ?? 'LOP').toUpperCase();
        const classCode = `${prefix}-${Date.now().toString().slice(-6)}`;
        await classService.create({ ...payload, class_code: classCode });
        addToast('Đã tạo lớp học mới');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu lớp học', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await classService.softDelete(deleteTarget.id);
      addToast('Đã hủy lớp học');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể xóa lớp học', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'class_name',
      header: 'Lớp học',
      render: (c) => (
        <div>
          <p className="font-medium text-slate-800">{c.class_name}</p>
          <p className="text-xs text-slate-400">{c.class_code} · {c.subjects?.name}</p>
        </div>
      ),
    },
    { key: 'teacher', header: 'Giáo viên', render: (c) => c.teachers?.full_name || '—' },
    { key: 'room', header: 'Phòng', render: (c) => c.room || '—' },
    { key: 'tuition_fee', header: 'Học phí', render: (c) => formatCurrency(c.tuition_fee) },
    { key: 'start_date', header: 'Khai giảng', render: (c) => formatDate(c.start_date) },
    { key: 'status', header: 'Trạng thái', render: (c) => <ClassStatusBadge status={c.status} /> },
    {
      key: 'actions', header: '', className: 'w-24',
      render: (c) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isAdmin && <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={16} /></button>}
          {isAdmin && <button onClick={() => setDeleteTarget(c)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lớp học</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý danh sách lớp học</p>
        </div>
        {isAdmin && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Thêm lớp học</button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên lớp, mã lớp..." className="flex-1" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Tất cả trạng thái"
          options={Object.entries(CLASS_STATUS).map(([value, s]) => ({ value, label: s.label }))} className="sm:w-52" />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(c) => navigate(`/admin/classes/${c.id}`)}
        emptyState={<EmptyState icon={<School size={32} />} title="Chưa có lớp học" description='Nhấn "Thêm lớp học" để bắt đầu.' action={isAdmin && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Thêm lớp học</button>} />}
      />

      {!loading && data.length > 0 && <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Cập nhật lớp học' : 'Thêm lớp học mới'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Tên lớp" required {...register('class_name')} error={errors.class_name?.message} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Môn học" required options={subjects.map((s) => ({ value: s.id, label: s.name }))} {...register('subject_id')} error={errors.subject_id?.message} />
            <Select label="Giáo viên phụ trách" options={teachers.map((t) => ({ value: t.id, label: t.full_name }))} {...register('teacher_id')} />
            <Input label="Học phí" type="number" min="0" required {...register('tuition_fee')} error={errors.tuition_fee?.message} />
            <Select label="Chu kỳ thu phí" options={Object.entries(FEE_CYCLE).map(([value, label]) => ({ value, label }))} {...register('fee_cycle')} />
            <Input label="Phí mỗi buổi (nếu theo buổi)" type="number" min="0" {...register('session_fee')} error={errors.session_fee?.message} />
            <Input label="Ngày khai giảng" type="date" {...register('start_date')} />
            <Input label="Ngày kết thúc" type="date" {...register('end_date')} error={errors.end_date?.message} />
            <Input label="Sĩ số tối đa" type="number" min="1" {...register('capacity')} />
            <Input label="Phòng học" {...register('room')} />
            <Select label="Trạng thái" options={Object.entries(CLASS_STATUS).map(([value, s]) => ({ value, label: s.label }))} {...register('status')} />
          </div>
          <Textarea label="Mô tả" {...register('description')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost flex-1">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Hủy lớp học" message={`Bạn có chắc muốn hủy lớp "${deleteTarget?.class_name}"? Lịch sử học phí và điểm danh sẽ được giữ lại.`} />
    </div>
  );
}
