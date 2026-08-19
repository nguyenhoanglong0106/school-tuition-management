import { useEffect, useState } from 'react';
import { studentService } from '@/services/studentService';
import { useAuth } from '@/contexts/AuthContext';

// Resolves the students row linked to the logged-in profile (student/parent account).
export function useCurrentStudent() {
  const { profile } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    setLoading(true);
    studentService
      .getByProfileId(profile.id)
      .then((s) => { if (!cancelled) setStudent(s); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile?.id]);

  return { student, loading };
}
