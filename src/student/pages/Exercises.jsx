import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Headphones } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { exerciseService } from '@/services/exerciseService';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { SubmissionStatusBadge } from '@/components/common/Badge';
import { formatDateTime } from '@/utils/formatters';

export default function StudentExercises() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (student) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await exerciseService.getMyAssignments(student.id);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  if (studentLoading || loading) {
    return <div className="space-y-3"><Skeleton className="h-6 w-32" />{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-slate-800">Bài tập</h1>

      {items.length === 0 ? (
        <EmptyState icon={<Headphones size={28} />} title="Chưa có bài tập nào được giao" />
      ) : (
        <div className="space-y-2">
          {items.map((s) => {
            const a = s.exercise_assignments;
            const overdue = ['NOT_STARTED', 'IN_PROGRESS'].includes(s.status) && new Date(a.due_at) < new Date();
            return (
              <button key={s.id} onClick={() => navigate(`/app/exercises/${s.id}`)} className="card p-4 w-full text-left flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{a.title_override ?? a.exercises?.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hạn nộp: {formatDateTime(a.due_at)}{overdue && <span className="text-red-500 font-medium"> · Quá hạn</span>}
                  </p>
                  {s.status === 'GRADED' && <p className="text-xs text-emerald-600 font-medium mt-1">{s.total_score}/{s.max_score} điểm</p>}
                </div>
                <SubmissionStatusBadge status={s.status} />
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
