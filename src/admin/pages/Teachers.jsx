import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Pencil, UserCog } from 'lucide-react';
import { teacherService } from '@/services/teacherService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { DataTable } from '@/components/common/DataTable';
import { Pagination, EmptyState, Avatar } from '@/components/common/UI';
import { SearchInput, Select, Input } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { StudentStatusBadge } from '@/components/common/Badge';
import { STUDENT_STATUS } from '@/constants';

const schema = z.object({
  full_name: z.string().min(2, 'Vui lòng nhập họ tên'),
  phone: z.string().optional(),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  address: z.string().optional(),
  status: z.string(),
  notes: z.string().optional(),
});

export default function Teachers() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteActiveClasses, setDeleteActiveClasses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchFn = useCallback(
    ({ page, pageSize }) => teacherService.getAll({ search, status, page, pageSize }),
    [search, status]
  );
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, [search, status]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'ACTIVE' },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ status: 'ACTIVE' });
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    reset({ full_name: t.full_name, phone: t.phone ?? '', email: t.email ?? '', address: t.address ?? '', status: t.status, notes: t.notes ?? '' });
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await teacherService.update(editing.id, values);
        addToast('Đã cập nhật giáo viên');
      } else {
        const code = await teacherService.generateTeacherCode();
        await teacherService.create({ ...values, teacher_code: code });
        addToast('Đã thêm giáo viên mới');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu dữ liệu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (t) => {
    setDeleteTarget(t);
    try {
      const classes = await teacherService.getTeacherClasses(t.id);
      setDeleteActiveClasses(classes.filter((c) => c.status === 'ACTIVE' || c.status === 'PAUSED'));
    } catch {
      setDeleteActiveClasses([]);
    }
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
    setDeleteActiveClasses([]);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await teacherService.softDelete(deleteTarget.id);
      addToast('Đã ngừng hoạt động giáo viên và giữ lại lịch sử');
      closeDeleteConfirm();
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể xóa giáo viên', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteMessage = deleteActiveClasses.length > 0
    ? `Giáo viên "${deleteTarget?.full_name}" đang phụ trách ${deleteActiveClasses.length} lớp: ${deleteActiveClasses.map((c) => c.class_name).join(', ')}. Các lớp này sẽ mất người phụ trách nếu tiếp tục.`
    : `Giáo viên "${deleteTarget?.full_name}" sẽ được ngừng hoạt động và giữ lại lịch sử.`;

  const columns = [
    {
      key: 'full_name',
      header: 'Giáo viên',
      render: (t) => (
        <div className="flex items-center gap-3">
          <Avatar name={t.full_name} src={t.avatar_url} size={9} />
          <div>
            <p className="font-medium text-slate-800">{t.full_name}</p>
            <p className="text-xs text-slate-400">{t.teacher_code}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'SĐT', render: (t) => t.phone || '—' },
    { key: 'email', header: 'Email', render: (t) => t.email || '—' },
    { key: 'status', header: 'Trạng thái', render: (t) => <StudentStatusBadge status={t.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (t) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil size={16} /></button>
          <button onClick={() => confirmDelete(t)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Giáo viên</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý danh sách giáo viên</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Thêm giáo viên</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên, mã GV, SĐT..." className="flex-1" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Tất cả trạng thái"
          options={Object.entries(STUDENT_STATUS).map(([value, s]) => ({ value, label: s.label }))} className="sm:w-52" />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(t) => navigate(`/admin/teachers/${t.id}`)}
        emptyState={<EmptyState icon={<UserCog size={32} />} title="Chưa có giáo viên" description='Nhấn "Thêm giáo viên" để bắt đầu.' action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Thêm giáo viên</button>} />}
      />

      {!loading && data.length > 0 && <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Cập nhật giáo viên' : 'Thêm giáo viên mới'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Họ và tên" required {...register('full_name')} error={errors.full_name?.message} />
          <Input label="Số điện thoại" {...register('phone')} />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Địa chỉ" {...register('address')} />
          <Select label="Trạng thái" options={Object.entries(STUDENT_STATUS).map(([value, s]) => ({ value, label: s.label }))} {...register('status')} />
          <Input label="Ghi chú" {...register('notes')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost flex-1">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={closeDeleteConfirm} onConfirm={handleDelete} loading={deleting}
        title="Ngừng hoạt động giáo viên" message={deleteMessage} />
    </div>
  );
}
