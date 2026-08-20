import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Download, Trash2, Pencil, Users, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { studentService } from '@/services/studentService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/common/DataTable';
import { Pagination, EmptyState, Avatar } from '@/components/common/UI';
import { SearchInput, Select, Input } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { StudentStatusBadge } from '@/components/common/Badge';
import { formatDate } from '@/utils/formatters';
import { compressImage } from '@/utils/imageCompression';
import { STUDENT_STATUS } from '@/constants';
import { exportToExcel } from '@/utils/exportExcel';

const schema = z.object({
  full_name: z.string().min(2, 'Vui lòng nhập họ tên'),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.string().optional(),
  school_name: z.string().optional(),
  school_class: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  address: z.string().optional(),
  parent_name: z.string().optional(),
  parent_phone: z.string().optional(),
  parent_email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  status: z.string(),
  notes: z.string().optional(),
});

export default function Students() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteClasses, setDeleteClasses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchFn = useCallback(
    ({ page, pageSize }) => studentService.getAll({ search, status, page, pageSize }),
    [search, status]
  );
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, [search, status]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'ACTIVE' },
  });

  const openCreate = async () => {
    setEditing(null);
    setAvatarUrl(null);
    reset({ status: 'ACTIVE' });
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setAvatarUrl(student.avatar_url ?? null);
    reset({
      full_name: student.full_name ?? '',
      date_of_birth: student.date_of_birth ?? '',
      gender: student.gender ?? '',
      school_name: student.school_name ?? '',
      school_class: student.school_class ?? '',
      phone: student.phone ?? '',
      email: student.email ?? '',
      address: student.address ?? '',
      parent_name: student.parent_name ?? '',
      parent_phone: student.parent_phone ?? '',
      parent_email: student.parent_email ?? '',
      status: student.status ?? 'ACTIVE',
      notes: student.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Instant local preview while the real upload is still in flight —
    // a fresh Supabase Storage object can take a couple of seconds to
    // start serving through the CDN, which otherwise looks broken.
    const localPreview = URL.createObjectURL(file);
    setAvatarUrl(localPreview);
    setUploadingAvatar(true);
    try {
      const blob = await compressImage(file);
      const path = `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/webp', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      URL.revokeObjectURL(localPreview);
    } catch (err) {
      addToast(err.message ?? 'Không thể tải ảnh lên', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, date_of_birth: values.date_of_birth || null, avatar_url: avatarUrl };
      if (editing) {
        await studentService.update(editing.id, payload);
        addToast('Đã cập nhật học viên');
      } else {
        const code = await studentService.generateStudentCode();
        await studentService.create({ ...payload, student_code: code, join_date: new Date().toISOString().split('T')[0] });
        addToast('Đã thêm học viên mới');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể lưu dữ liệu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = async (student) => {
    setDeleteTarget(student);
    try {
      const classes = await studentService.getActiveClasses(student.id);
      setDeleteClasses(classes);
    } catch {
      setDeleteClasses([]);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await studentService.softDelete(deleteTarget.id);
      addToast('Đã cho học viên nghỉ học và giữ lại lịch sử');
      setDeleteTarget(null);
      setDeleteClasses([]);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể xóa học viên', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    exportToExcel(
      data.map((s) => ({
        'Mã HV': s.student_code,
        'Họ tên': s.full_name,
        'Ngày sinh': formatDate(s.date_of_birth),
        Trường: s.school_name,
        Lớp: s.school_class,
        SĐT: s.phone,
        'Phụ huynh': s.parent_name,
        'SĐT Phụ huynh': s.parent_phone,
        'Trạng thái': STUDENT_STATUS[s.status]?.label,
      })),
      'danh-sach-hoc-vien',
      'Học viên'
    );
  };

  const columns = [
    {
      key: 'full_name',
      header: 'Học viên',
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.full_name} src={s.avatar_url} size={9} />
          <div>
            <p className="font-medium text-slate-800">{s.full_name}</p>
            <p className="text-xs text-slate-400">{s.student_code}</p>
          </div>
        </div>
      ),
    },
    { key: 'school', header: 'Trường / Lớp', render: (s) => <span>{s.school_name || '—'} {s.school_class ? `· ${s.school_class}` : ''}</span> },
    { key: 'phone', header: 'SĐT', render: (s) => s.phone || '—' },
    { key: 'parent', header: 'Phụ huynh', render: (s) => s.parent_name || '—' },
    { key: 'join_date', header: 'Ngày vào học', render: (s) => formatDate(s.join_date) },
    { key: 'status', header: 'Trạng thái', render: (s) => <StudentStatusBadge status={s.status} /> },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (s) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isAdmin && (
            <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Sửa">
              <Pencil size={16} />
            </button>
          )}
          {isAdmin && (
            <button onClick={() => openDeleteConfirm(s)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Xóa">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Học viên</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý danh sách học viên & phụ huynh</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-ghost">
            <Download size={16} /> Xuất Excel
          </button>
          {isAdmin && (
            <button onClick={openCreate} className="btn-primary">
              <Plus size={16} /> Thêm học viên
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên, mã HV, SĐT..." className="flex-1" />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Tất cả trạng thái"
          options={Object.entries(STUDENT_STATUS).map(([value, s]) => ({ value, label: s.label }))}
          className="sm:w-52"
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(s) => navigate(`/admin/students/${s.id}`)}
        emptyState={
          <EmptyState
            icon={<Users size={32} />}
            title="Chưa có học viên"
            description='Nhấn "Thêm học viên" để bắt đầu.'
            action={isAdmin && <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Thêm học viên</button>}
          />
        }
      />

      {!loading && data.length > 0 && (
        <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Cập nhật học viên' : 'Thêm học viên mới'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={editing?.full_name} src={avatarUrl} size={16} />
            <label className="btn btn-outline btn-sm cursor-pointer">
              <Camera size={14} /> {uploadingAvatar ? 'Đang tải lên...' : 'Chọn ảnh đại diện'}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Họ và tên" required {...register('full_name')} error={errors.full_name?.message} />
            <Input label="Ngày sinh" type="date" {...register('date_of_birth')} />
            <Select label="Giới tính" options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }, { value: 'Khác', label: 'Khác' }]} {...register('gender')} />
            <Select label="Trạng thái" options={Object.entries(STUDENT_STATUS).map(([value, s]) => ({ value, label: s.label }))} {...register('status')} />
            <Input label="Trường học" {...register('school_name')} />
            <Input label="Lớp" {...register('school_class')} />
            <Input label="Số điện thoại" {...register('phone')} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          </div>
          <Input label="Địa chỉ" {...register('address')} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Tên phụ huynh" {...register('parent_name')} />
            <Input label="SĐT phụ huynh" {...register('parent_phone')} />
            <Input label="Email phụ huynh" type="email" {...register('parent_email')} error={errors.parent_email?.message} />
          </div>
          <Input label="Ghi chú" {...register('notes')} />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost flex-1">Hủy</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteClasses([]); }}
        onConfirm={handleDelete}
        loading={deleting}
        title="Cho học viên nghỉ học"
        message={
          deleteClasses.length > 0
            ? `Học viên "${deleteTarget?.full_name}" đang học ${deleteClasses.length} lớp: ${deleteClasses.map((c) => c.classes?.class_name).join(', ')}. Các lớp này sẽ được đánh dấu đã nghỉ. Dữ liệu học phí, thanh toán và điểm danh sẽ được giữ lại.`
            : `Bạn có chắc muốn xóa học viên "${deleteTarget?.full_name}"? Dữ liệu học phí, thanh toán và điểm danh sẽ được giữ lại.`
        }
      />
    </div>
  );
}
