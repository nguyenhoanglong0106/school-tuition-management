import { supabase } from '@/lib/supabase';

export const studyTopicService = {
  async getAll({ search = '', subjectId = null, page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('study_topics')
      .select(`*, subjects(id, name), study_topic_vocabulary(id)`, { count: 'exact' })
      .is('deleted_at', null)
      .order('subject_id')
      .order('order_index');

    if (search) query = query.ilike('title', `%${search}%`);
    if (subjectId) query = query.eq('subject_id', subjectId);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('study_topics')
      .select(`*, subjects(id, name), study_topic_vocabulary(*)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    data.study_topic_vocabulary?.sort((a, b) => a.order_index - b.order_index);
    return data;
  },

  async create({ subject_id, title, description }) {
    const { data, error } = await supabase
      .from('study_topics')
      .insert({ subject_id, title, description, created_by: (await supabase.auth.getUser()).data.user?.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('study_topics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async archive(id) {
    const { error } = await supabase
      .from('study_topics')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);
    if (error) throw error;
  },

  async addVocabulary(topicId, entry) {
    const { data, error } = await supabase
      .from('study_topic_vocabulary')
      .insert({ ...entry, topic_id: topicId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateVocabulary(id, updates) {
    const { data, error } = await supabase
      .from('study_topic_vocabulary')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteVocabulary(id) {
    const { error } = await supabase.from('study_topic_vocabulary').delete().eq('id', id);
    if (error) throw error;
  },

  // Student-facing: browse topics for a subject (or all subjects).
  async getForStudents({ subjectId = null } = {}) {
    let query = supabase
      .from('study_topics')
      .select(`*, subjects(id, name)`)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('subject_id')
      .order('order_index');
    if (subjectId) query = query.eq('subject_id', subjectId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },
};
