import { supabase } from '@/lib/supabase';

export const studentService = {
  async getAll({ search = '', status = '', page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,student_code.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    if (status) query = query.eq('status', status);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) throw error;
    return data;
  },

  async getByProfileId(profileId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('profile_id', profileId)
      .is('deleted_at', null)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async create(student) {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const { error } = await supabase
      .from('students')
      .update({ deleted_at: new Date().toISOString(), status: 'STOPPED' })
      .eq('id', id);
    if (error) throw error;

    const { error: classError } = await supabase
      .from('class_students')
      .update({ status: 'STOPPED', left_date: new Date().toISOString().split('T')[0] })
      .eq('student_id', id)
      .eq('status', 'ACTIVE');
    if (classError) throw classError;
  },

  async getActiveClasses(studentId) {
    const { data, error } = await supabase
      .from('class_students')
      .select(`id, class_id, classes ( id, class_name )`)
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE');
    if (error) throw error;
    return data ?? [];
  },

  async getStudentClasses(studentId) {
    const { data, error } = await supabase
      .from('class_students')
      .select(`
        *,
        classes (
          id, class_code, class_name, status, room,
          subjects ( name ),
          teachers ( full_name )
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE');
    if (error) throw error;
    return data ?? [];
  },

  async getStudentFees(studentId, { status = '', page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('student_fees')
      .select(`*, classes(class_name)`, { count: 'exact' })
      .eq('student_id', studentId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (status) query = query.eq('status', status);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getStudentAttendance(studentId, { month, year } = {}) {
    let query = supabase
      .from('attendance')
      .select(`
        *,
        class_sessions (
          id, session_date, start_time, end_time, room, status,
          classes (class_name)
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query
        .gte('class_sessions.session_date', startDate)
        .lte('class_sessions.session_date', endDate);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;
    return data ?? [];
  },

  async generateStudentCode() {
    const { data, error } = await supabase.rpc('generate_student_code');
    if (error) throw error;
    return data;
  },
};
