import { supabase } from '@/lib/supabase';

export const settingsService = {
  async getSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*, bank_accounts(*)')
      .order('id')
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateSettings(updates) {
    const { data, error } = await supabase
      .from('system_settings')
      .update(updates)
      .eq('id', (await settingsService.getSettings()).id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDefaultBankAccount() {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();
    if (error && error.code !== 'PGRST116') return null;
    return data;
  },

  async getAllBankAccounts() {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createBankAccount(account) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert(account)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBankAccount(id, updates) {
    if (updates.is_active === false) {
      const { data: current } = await supabase
        .from('bank_accounts')
        .select('is_default')
        .eq('id', id)
        .single();
      if (current?.is_default) {
        throw new Error('Không thể tắt tài khoản đang đặt làm mặc định. Vui lòng đặt tài khoản khác làm mặc định trước.');
      }
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setDefaultBankAccount(id) {
    // Remove all defaults first
    await supabase
      .from('bank_accounts')
      .update({ is_default: false })
      .neq('id', id);

    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
