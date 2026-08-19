import { supabase } from '@/lib/supabase';

export const classService = {
  async getAll({ search = '', status = '', subjectId = '', page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('classes')
      .select(`
        *, 
        subjects(id, name), 
        teachers(id, full_name, teacher_code)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`class_name.ilike.%${search}%,class_code.ilike.%${search}%`);
    }
    if (status) query = query.eq('status', status);
    if (subjectId) query = query.eq('subject_id', subjectId);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        subjects(id, name, code),
        teachers(id, full_name, teacher_code, phone)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(cls) {
    const { data, error } = await supabase
      .from('classes')
      .insert(cls)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const { error } = await supabase
      .from('classes')
      .update({ deleted_at: new Date().toISOString(), status: 'CANCELLED' })
      .eq('id', id);
    if (error) throw error;
  },

  // Class Students
  async getClassStudents(classId) {
    const { data, error } = await supabase
      .from('class_students')
      .select(`
        *,
        students(id, student_code, full_name, phone, status, avatar_url)
      `)
      .eq('class_id', classId)
      .order('joined_date', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async addStudentToClass(classId, studentId, options = {}) {
    // Check for duplicate active enrollment
    const { data: existing } = await supabase
      .from('class_students')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE')
      .single();

    if (existing) throw new Error('Học viên đã được thêm vào lớp này');

    const { data, error } = await supabase
      .from('class_students')
      .insert({
        class_id: classId,
        student_id: studentId,
        ...options,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeStudentFromClass(classStudentId, leftDate) {
    const { error } = await supabase
      .from('class_students')
      .update({ status: 'STOPPED', left_date: leftDate || new Date().toISOString().split('T')[0] })
      .eq('id', classStudentId);
    if (error) throw error;
  },

  // Class Schedules
  async getSchedules(classId) {
    const { data, error } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('class_id', classId)
      .eq('is_active', true)
      .order('day_of_week');
    if (error) throw error;
    return data ?? [];
  },

  async createSchedule(schedule) {
    const { data, error } = await supabase
      .from('class_schedules')
      .insert(schedule)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSchedule(scheduleId) {
    const { error } = await supabase
      .from('class_schedules')
      .update({ is_active: false })
      .eq('id', scheduleId);
    if (error) throw error;
  },

  // Subjects
  async getAllSubjects() {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async createSubject(subject) {
    const { data, error } = await supabase
      .from('subjects')
      .insert(subject)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSubject(id, updates) {
    const { data, error } = await supabase
      .from('subjects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
