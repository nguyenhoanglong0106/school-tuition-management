import { supabase } from '@/lib/supabase';

export const teacherService = {
  async getAll({ search = '', status = '', page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('teachers')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,teacher_code.ilike.%${search}%,phone.ilike.%${search}%`
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
      .from('teachers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getByProfileId(profileId) {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('profile_id', profileId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async create(teacher) {
    const { data, error } = await supabase
      .from('teachers')
      .insert(teacher)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('teachers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const { error } = await supabase
      .from('teachers')
      .update({ deleted_at: new Date().toISOString(), status: 'STOPPED' })
      .eq('id', id);
    if (error) throw error;
  },

  async generateTeacherCode() {
    const { data, error } = await supabase.rpc('generate_teacher_code');
    if (error) throw error;
    return data;
  },

  async getTeacherClasses(teacherId) {
    const { data, error } = await supabase
      .from('classes')
      .select(`*, subjects(name)`)
      .eq('teacher_id', teacherId)
      .is('deleted_at', null)
      .order('status', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};
