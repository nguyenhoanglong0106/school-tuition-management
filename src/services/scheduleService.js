import { supabase } from '@/lib/supabase';

export const scheduleService = {
  // Generate sessions from schedules for a date range
  async generateSessions(classId, fromDate, toDate) {
    const { data, error } = await supabase.rpc('generate_sessions_from_schedule', {
      p_class_id: classId,
      p_from_date: fromDate,
      p_to_date: toDate,
    });
    if (error) throw error;
    return data;
  },

  // Get sessions with optional filters
  async getSessions({
    classId = null,
    teacherId = null,
    dateFrom = null,
    dateTo = null,
    status = null,
    page = 1,
    pageSize = 50,
  } = {}) {
    let query = supabase
      .from('class_sessions')
      .select(`
        *,
        classes (
          id, class_name, class_code, room,
          teachers(id, full_name),
          subjects(id, name)
        )
      `, { count: 'exact' })
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (classId) query = query.eq('class_id', classId);
    if (status) query = query.eq('status', status);
    if (dateFrom) query = query.gte('session_date', dateFrom);
    if (dateTo) query = query.lte('session_date', dateTo);

    if (teacherId) {
      query = query.eq('classes.teacher_id', teacherId);
    }

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getSessionById(id) {
    const { data, error } = await supabase
      .from('class_sessions')
      .select(`
        *,
        classes(id, class_name, subjects(name), teachers(full_name))
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async updateSession(id, updates) {
    const { data, error } = await supabase
      .from('class_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async cancelSession(id, note = '') {
    const { data, error } = await supabase
      .from('class_sessions')
      .update({ status: 'CANCELLED', notes: note })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async completeSession(id) {
    const { data, error } = await supabase
      .from('class_sessions')
      .update({ status: 'COMPLETED' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createMakeupSession(session) {
    const { data, error } = await supabase
      .from('class_sessions')
      .insert({ ...session, status: 'MAKEUP' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Get today's sessions
  async getTodaySessions() {
    const today = new Date().toISOString().split('T')[0];
    return scheduleService.getSessions({ dateFrom: today, dateTo: today, pageSize: 100 });
  },

  // Get upcoming sessions (next 7 days)
  async getUpcomingSessions(days = 7) {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    return scheduleService.getSessions({ dateFrom: today, dateTo: future, pageSize: 100 });
  },
};
