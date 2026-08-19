import { supabase } from '@/lib/supabase';

export const notificationService = {
  async getAll({ userId, page = 1, pageSize = 20 } = {}) {
    const { data: user } = await supabase.auth.getUser();
    const uid = userId || user?.user?.id;
    if (!uid) return { data: [], count: 0 };

    const { data, error, count } = await supabase
      .from('notification_recipients')
      .select(`
        *,
        notifications(id, title, message, type, created_at)
      `, { count: 'exact' })
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getUnreadCount() {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) return 0;

    const { count } = await supabase
      .from('notification_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.user.id)
      .is('read_at', null);

    return count ?? 0;
  },

  async markRead(notificationId) {
    const { error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });
    if (error) throw error;
  },

  async markAllRead() {
    const { error } = await supabase.rpc('mark_all_notifications_read');
    if (error) throw error;
  },

  // Send notification to all students in a class (admin/teacher)
  async sendToClass(classId, { title, message, type = 'CLASS' }) {
    const { data: classStudents } = await supabase
      .from('class_students')
      .select('students(profile_id)')
      .eq('class_id', classId)
      .eq('status', 'ACTIVE');

    const profileIds = (classStudents ?? [])
      .map((cs) => cs.students?.profile_id)
      .filter(Boolean);

    if (profileIds.length === 0) return;

    const { data: notif, error } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        type,
        class_id: classId,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();
    if (error) throw error;

    const { error: recErr } = await supabase.from('notification_recipients').insert(
      profileIds.map((uid) => ({ notification_id: notif.id, user_id: uid }))
    );
    if (recErr) throw recErr;

    return notif;
  },

  // Send a general notification to every active student (Admin only)
  async sendGeneral({ title, message }) {
    const { data: students } = await supabase
      .from('students')
      .select('profile_id')
      .not('profile_id', 'is', null)
      .eq('status', 'ACTIVE');

    const profileIds = (students ?? []).map((s) => s.profile_id).filter(Boolean);

    const { data: notif, error } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        type: 'GENERAL',
        class_id: null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();
    if (error) throw error;

    if (profileIds.length > 0) {
      const { error: recErr } = await supabase.from('notification_recipients').insert(
        profileIds.map((uid) => ({ notification_id: notif.id, user_id: uid }))
      );
      if (recErr) throw recErr;
    }

    return notif;
  },

  // Recent notifications created by admins/teachers (management list view)
  async getSentHistory({ page = 1, pageSize = 20 } = {}) {
    const { data, error, count } = await supabase
      .from('notifications')
      .select('*, classes(class_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  // Subscribe to realtime notifications
  subscribeToNotifications(userId, callback) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  },

  unsubscribe(channel) {
    if (channel) supabase.removeChannel(channel);
  },
};
