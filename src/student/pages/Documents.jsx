import { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { studentService } from '@/services/studentService';
import { documentService } from '@/services/documentService';
import { useToast } from '@/contexts/ToastContext';
import { Select, SearchInput } from '@/components/common/Form';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { formatDate, formatFileSize } from '@/utils/formatters';
import { openInNewTab } from '@/utils/openInNewTab';

export default function StudentDocuments() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const { addToast } = useToast();
  const [classIds, setClassIds] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (student) {
      studentService.getStudentClasses(student.id).then((cs) => {
        setClassIds(cs.map((c) => c.class_id));
        setClasses(cs.map((c) => ({ value: c.class_id, label: c.classes?.class_name })));
      });
    }
  }, [student]);

  useEffect(() => {
    if (classIds.length >= 0 && student) load();
  }, [classIds, search, student]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await documentService.getStudentDocuments(classIds, { search, pageSize: 50 });
      setDocs(data);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (doc) => {
    openInNewTab(
      documentService.getSignedUrl(doc.file_path),
      (err) => addToast(err.message ?? 'Không thể tải tài liệu, vui lòng thử lại', 'error')
    );
  };

  const filtered = filterClass ? docs.filter((d) => (d.document_classes ?? []).some((dc) => dc.class_id === filterClass)) : docs;

  if (studentLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-slate-800">Tài liệu</h1>

      <SearchInput value={search} onChange={setSearch} placeholder="Tìm tài liệu..." />
      <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} placeholder="Tất cả lớp học" options={classes} />

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FileText size={32} />} title="Chưa có tài liệu nào" />
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div key={doc.id} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0"><FileText size={18} className="text-primary-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{doc.title}</p>
                <p className="text-xs text-slate-400">{doc.subjects?.name ?? 'Chung'} · {formatFileSize(doc.file_size)} · {formatDate(doc.created_at)}</p>
              </div>
              <button onClick={() => handleView(doc)} className="p-2 rounded-lg hover:bg-slate-100 text-primary-600 flex-shrink-0"><Download size={18} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
