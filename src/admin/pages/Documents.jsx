import { useCallback, useEffect, useState } from 'react';
import { FileText, Upload, Trash2, Download, Plus } from 'lucide-react';
import { documentService } from '@/services/documentService';
import { classService } from '@/services/classService';
import { useDataList } from '@/hooks/useDataList';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Pagination, EmptyState, Skeleton } from '@/components/common/UI';
import { Select, Input, Textarea, SearchInput } from '@/components/common/Form';
import { Modal, ConfirmDialog } from '@/components/common/Modal';
import { FileUpload } from '@/components/common/FileUpload';
import { formatDate, formatFileSize } from '@/utils/formatters';

export default function AdminDocuments() {
  const { addToast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [uploadModal, setUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    classService.getAllSubjects().then(setSubjects);
  }, []);

  const fetchFn = useCallback(
    ({ page, pageSize }) => documentService.getAll({ search, subjectId: subjectId || null, page, pageSize }),
    [search, subjectId]
  );
  const { data, count, page, setPage, pageSize, setPageSize, loading, reload } = useDataList(fetchFn, [search, subjectId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await documentService.softDelete(deleteTarget.id);
      addToast('Đã xóa tài liệu');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      addToast(err.message ?? 'Không thể xóa tài liệu', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (doc) => {
    const url = await documentService.getSignedUrl(doc.file_path);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tài liệu</h1>
          <p className="text-slate-500 text-sm mt-1">Kho tài liệu học tập cho học viên</p>
        </div>
        <button onClick={() => setUploadModal(true)} className="btn-primary"><Upload size={16} /> Tải lên tài liệu</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên tài liệu..." className="flex-1" />
        <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Tất cả môn học" options={subjects.map((s) => ({ value: s.id, label: s.name }))} className="sm:w-52" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5"><Skeleton className="h-24" /></div>)}</div>
      ) : data.length === 0 ? (
        <div className="card"><EmptyState icon={<FileText size={32} />} title="Chưa có tài liệu nào" description='Nhấn "Tải lên tài liệu" để bắt đầu.' /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((doc) => (
            <div key={doc.id} className="card p-5 flex flex-col">
              <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center mb-3"><FileText size={20} className="text-primary-600" /></div>
              <p className="font-semibold text-slate-800 line-clamp-2">{doc.title}</p>
              <p className="text-xs text-slate-400 mt-1">{doc.subjects?.name ?? 'Chung'} · {formatFileSize(doc.file_size)}</p>
              <p className="text-xs text-slate-400">{formatDate(doc.created_at)}</p>
              <div className="flex-1" />
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                <button onClick={() => handleDownload(doc)} className="btn btn-ghost btn-sm flex-1"><Download size={14} /> Tải xuống</button>
                <button onClick={() => setDeleteTarget(doc)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data.length > 0 && <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />}

      {uploadModal && (
        <UploadModal subjects={subjects} uploadedBy={profile?.id} onClose={() => setUploadModal(false)} onDone={() => { setUploadModal(false); reload(); }} />
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Xóa tài liệu" message={`Bạn có chắc muốn xóa tài liệu "${deleteTarget?.title}"?`} />
    </div>
  );
}

function UploadModal({ subjects, onClose, onDone }) {
  const { addToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [visibility, setVisibility] = useState('CLASS');
  const [classIds, setClassIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    classService.getAll({ pageSize: 100, status: 'ACTIVE' }).then((r) => setClasses(r.data));
  }, []);

  const toggleClass = (id) => setClassIds((ids) => ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    if (visibility === 'CLASS' && classIds.length === 0) {
      addToast('Vui lòng chọn ít nhất một lớp học', 'error');
      return;
    }
    setSaving(true);
    try {
      await documentService.upload(file, { title, description, subject_id: subjectId || null, visibility }, visibility === 'CLASS' ? classIds : []);
      addToast('Đã tải lên tài liệu');
      onDone();
    } catch (err) {
      addToast(err.message ?? 'Không thể tải lên tài liệu', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Tải lên tài liệu mới" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FileUpload file={file} onFileChange={setFile} label="Chọn tệp tài liệu (PDF, Word, Excel, ảnh)" />
        <Input label="Tiêu đề" required value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select label="Môn học" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Không thuộc môn cụ thể" options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Phạm vi hiển thị" value={visibility} onChange={(e) => setVisibility(e.target.value)} placeholder={null}
          options={[{ value: 'CLASS', label: 'Chỉ định lớp cụ thể' }, { value: 'ALL', label: 'Tất cả học viên' }]} />
        {visibility === 'CLASS' && (
          <div>
            <label className="form-label">Chọn lớp</label>
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <button type="button" key={c.id} onClick={() => toggleClass(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${classIds.includes(c.id) ? 'bg-primary-600 text-white border-primary-600' : 'border-slate-200 text-slate-600'}`}>
                  {c.class_name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Hủy</button>
          <button type="submit" disabled={saving || !file} className="btn-primary flex-1"><Plus size={16} /> {saving ? 'Đang tải lên...' : 'Tải lên'}</button>
        </div>
      </form>
    </Modal>
  );
}
