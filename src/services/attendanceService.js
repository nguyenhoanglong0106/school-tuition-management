import { supabase } from '@/lib/supabase';

export const attendanceService = {
  // Get attendance for a session
  async getSessionAttendance(sessionId) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        students(id, student_code, full_name, avatar_url)
      `)
      .eq('session_id', sessionId)
      .order('students(full_name)');
    if (error) throw error;
    return data ?? [];
  },

  // Get students enrolled in a session's class (for marking)
  async getSessionStudentsForAttendance(sessionId) {
    // First get the class_id of this session
    const { data: session, error: sessError } = await supabase
      .from('class_sessions')
      .select('class_id')
      .eq('id', sessionId)
      .single();
    if (sessError) throw sessError;

    // Get enrolled students
    const { data: enrolled, error: enrError } = await supabase
      .from('class_students')
      .select(`students(id, student_code, full_name, avatar_url)`)
      .eq('class_id', session.class_id)
      .eq('status', 'ACTIVE');
    if (enrError) throw enrError;

    // Get existing attendance
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', sessionId);

    const attendanceMap = {};
    (existing ?? []).forEach((a) => {
      attendanceMap[a.student_id] = a;
    });

    return (enrolled ?? []).map(({ students: s }) => ({
      student: s,
      attendance: attendanceMap[s.id] || null,
    }));
  },

  // Upsert single attendance
  async markAttendance(sessionId, studentId, status, note = '') {
    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          session_id: sessionId,
          student_id: studentId,
          status,
          note,
          marked_by: (await supabase.auth.getUser()).data.user?.id,
        },
        { onConflict: 'session_id,student_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Bulk upsert attendance for entire class
  async bulkMarkAttendance(sessionId, records) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const upsertData = records.map((r) => ({
      session_id: sessionId,
      student_id: r.student_id,
      status: r.status,
      note: r.note || '',
      marked_by: userId,
    }));

    const { data, error } = await supabase
      .from('attendance')
      .upsert(upsertData, { onConflict: 'session_id,student_id' })
      .select();
    if (error) throw error;
    return data ?? [];
  },

  // Student's own attendance
  async getMyAttendance(studentId, { month, year } = {}) {
    let query = supabase
      .from('attendance')
      .select(`
        *,
        class_sessions(
          id, session_date, start_time, end_time, room, status,
          classes(class_name, subjects(name))
        )
      `)
      .eq('student_id', studentId)
      .order('class_sessions(session_date)', { ascending: false });

    if (month && year) {
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      // We have to filter on the related table - use separate query
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('id')
        .gte('session_date', from)
        .lte('session_date', to);

      const sessionIds = (sessions ?? []).map((s) => s.id);
      if (sessionIds.length > 0) {
        query = query.in('session_id', sessionIds);
      } else {
        return [];
      }
    }

    const { data, error } = await query.limit(200);
    if (error) throw error;
    return data ?? [];
  },

  // Summary counts
  async getAttendanceSummary(studentId, month, year) {
    const attendance = await attendanceService.getMyAttendance(studentId, { month, year });
    return {
      total: attendance.length,
      present: attendance.filter((a) => a.status === 'PRESENT').length,
      absent: attendance.filter((a) => a.status === 'ABSENT').length,
      excused: attendance.filter((a) => a.status === 'EXCUSED').length,
      late: attendance.filter((a) => a.status === 'LATE').length,
    };
  },
};
