import { supabase } from '@/lib/supabase';

export const financeService = {
  async getAll({
    type = null,
    categoryId = null,
    dateFrom = null,
    dateTo = null,
    page = 1,
    pageSize = 20,
  } = {}) {
    let query = supabase
      .from('financial_transactions')
      .select(`
        *,
        financial_categories(id, name, type)
      `, { count: 'exact' })
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (dateFrom) query = query.gte('transaction_date', dateFrom);
    if (dateTo) query = query.lte('transaction_date', dateTo);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  // Create manual expense
  async createTransaction(tx) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert(tx)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Summary for a date range
  async getSummary(dateFrom, dateTo) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('type, amount')
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo);
    if (error) throw error;

    const txs = data ?? [];
    const income = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);

    return { income, expense, profit: income - expense };
  },

  // Monthly chart data (last 12 months)
  async getMonthlyChartData() {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: `T${d.getMonth() + 1}/${d.getFullYear()}`,
      });
    }

    const fromDate = `${months[0].year}-${String(months[0].month).padStart(2, '0')}-01`;
    const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('financial_transactions')
      .select('type, amount, transaction_date')
      .gte('transaction_date', fromDate)
      .lte('transaction_date', toDate);

    if (error) throw error;

    return months.map((m) => {
      const inMonth = (data ?? []).filter((t) => {
        const d = new Date(t.transaction_date);
        return d.getMonth() + 1 === m.month && d.getFullYear() === m.year;
      });
      const income = inMonth.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
      const expense = inMonth.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
      return { ...m, income, expense, profit: income - expense };
    });
  },

  // Categories
  async getCategories(type = null) {
    let query = supabase
      .from('financial_categories')
      .select('*')
      .eq('is_active', true)
      .order('type')
      .order('name');
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async createCategory(cat) {
    const { data, error } = await supabase
      .from('financial_categories')
      .insert(cat)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Generate transaction code client-side
  generateTransactionCode(type) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const prefix = type === 'INCOME' ? 'TH' : 'CH';
    return `${prefix}${mm}${yyyy}${Date.now().toString().slice(-6)}`;
  },
};
