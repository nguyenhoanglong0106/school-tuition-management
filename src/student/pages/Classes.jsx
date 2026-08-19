import { useEffect, useState } from 'react';
import { School } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { studentService } from '@/services/studentService';
import { classService } from '@/services/classService';
import { Skeleton, EmptyState } from '@/components/common/UI';
import { getDayOfWeekLabel, formatTime } from '@/utils/formatters';

export default function StudentClasses() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (student) load();
  }, [student]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await studentService.getStudentClasses(student.id);
      setClasses(list);
      const scheduleMap = {};
      await Promise.all(list.map(async (cs) => {
        scheduleMap[cs.class_id] = await classService.getSchedules(cs.class_id);
      }));
      setSchedules(scheduleMap);
    } finally {
      setLoading(false);
    }
  };

  if (studentLoading || loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card p-5"><Skeleton className="h-24" /></div>)}</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-bold text-slate-800">Lớp đang học</h1>

      {classes.length === 0 ? (
        <EmptyState icon={<School size={32} />} title="Chưa tham gia lớp học nào" />
      ) : (
        <div className="space-y-3">
          {classes.map((cs) => (
            <div key={cs.id} className="card p-5">
              <p className="font-bold text-slate-800">{cs.classes?.class_name}</p>
              <p className="text-sm text-slate-500 mt-1">Giáo viên: {cs.classes?.teachers?.full_name ?? '—'}</p>
              <p className="text-sm text-slate-500">Phòng: {cs.classes?.room ?? '—'}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {(schedules[cs.class_id] ?? []).map((sc) => (
                  <span key={sc.id} className="badge badge-primary">
                    {getDayOfWeekLabel(sc.day_of_week)} · {formatTime(sc.start_time)}-{formatTime(sc.end_time)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
