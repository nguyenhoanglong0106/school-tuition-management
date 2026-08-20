import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Layers } from 'lucide-react';
import { studyTopicService } from '@/services/studyTopicService';
import { Skeleton, EmptyState } from '@/components/common/UI';

export default function StudyTopicsList() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studyTopicService.getForStudents().then(setTopics).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-6 w-32" />{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;
  }

  const bySubject = topics.reduce((acc, t) => {
    const name = t.subjects?.name ?? 'Khác';
    (acc[name] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-slate-800">Chuyên đề học</h1>

      {topics.length === 0 ? (
        <EmptyState icon={<Layers size={28} />} title="Chưa có chuyên đề nào" />
      ) : (
        Object.entries(bySubject).map(([subjectName, items]) => (
          <div key={subjectName} className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase px-1">{subjectName}</p>
            {items.map((t) => (
              <button key={t.id} onClick={() => navigate(`/app/study-topics/${t.id}`)} className="card p-4 w-full text-left flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0"><Layers size={18} className="text-primary-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{t.title}</p>
                  {t.description && <p className="text-xs text-slate-400 truncate">{t.description}</p>}
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
