import { supabase, getFunctionErrorMessage } from '@/lib/supabase';

export const pushSubscriptionService = {
  async save(userId, subscription) {
    const json = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth_key: json.keys.auth,
      },
      { onConflict: 'user_id,endpoint' }
    );
    if (error) throw error;
  },

  async remove(endpoint) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) throw error;
  },

  // Notify subscribed devices of the given profiles. Best-effort: failures
  // here should never block the in-app notification that was already saved.
  async sendPush({ profileIds, title, body, url }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    const { data, error } = await supabase.functions.invoke('send-push', {
      body: { profileIds, title, body, url },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) throw new Error(await getFunctionErrorMessage(error, 'Không thể gửi thông báo đẩy'));
    if (data?.error) throw new Error(data.error);
    return data;
  },
};
