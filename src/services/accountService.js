import { supabase, getFunctionErrorMessage } from '@/lib/supabase';

/**
 * Privileged account operations. These call secure Supabase Edge Functions
 * (supabase/functions/create-user, reset-user-password) which run with the
 * Service Role key server-side and re-verify the caller is ADMIN — the
 * Service Role key itself never reaches the frontend.
 */
export const accountService = {
  async createUserAccount({ email, loginName, password, fullName, role, phone, studentId }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Phiên đăng nhập đã hết hạn');

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, loginName, password, fullName, role, phone, studentId },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) throw new Error(await getFunctionErrorMessage(error, 'Không thể tạo tài khoản đăng nhập'));
    if (data?.error) throw new Error(data.error);
    return data;
  },

  async resetUserPassword(profileId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Phiên đăng nhập đã hết hạn');

    const { data, error } = await supabase.functions.invoke('reset-user-password', {
      body: { profileId },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) throw new Error(await getFunctionErrorMessage(error, 'Không thể đặt lại mật khẩu'));
    if (data?.error) throw new Error(data.error);
    return data; // { tempPassword }
  },

  async setAccountActive(profileId, isActive) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', profileId);
    if (error) throw error;
  },

  // Generates a readable random temp password client-side as a fallback
  // suggestion shown to the admin before the Edge Function call.
  generateTempPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  },
};
