import { supabase } from '@/lib/supabase';
import { computeEffectiveFeeStatus } from '@/utils/feeCalculations';

export const feeService = {
  // Create monthly fees for a class via RPC
  async createMonthlyFees(classId, month, year, dueDate) {
    const { data, error } = await supabase.rpc('create_class_monthly_fees', {
      p_class_id: classId,
      p_month: month,
      p_year: year,
      p_due_date: dueDate,
    });
    if (error) throw error;
    return data;
  },

  // List fees with filters
  async getAll({
    studentId = null,
    classId = null,
    month = null,
    year = null,
    status = null,
    search = '',
    page = 1,
    pageSize = 20,
  } = {}) {
    let query = supabase
      .from('student_fees')
      // `!inner` lets .or() below filter on the embedded students columns too
      // (PostgREST only applies embedded-resource filters through an inner join).
      // Safe unconditionally since student_id is a NOT NULL FK — every fee always
      // has a matching student row, so this never silently drops results.
      .select(`
        *,
        students!inner(id, student_code, full_name, phone),
        classes(id, class_code, class_name)
      `, { count: 'exact' })
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);
    if (classId) query = query.eq('class_id', classId);
    if (month) query = query.eq('month', month);
    if (year) query = query.eq('year', year);
    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(
        `fee_code.ilike.%${search}%,students.full_name.ilike.%${search}%,students.student_code.ilike.%${search}%`
      );
    }

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('student_fees')
      .select(`
        *,
        students(id, student_code, full_name, phone, parent_phone),
        classes(id, class_code, class_name, subjects(name))
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async updateFee(id, updates) {
    const { data, error } = await supabase
      .from('student_fees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async waiveFee(id, note) {
    const { data, error } = await supabase
      .from('student_fees')
      .update({ status: 'WAIVED', remaining_amount: 0, note })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Fee summary totals
  async getMonthSummary(month, year) {
    const { data, error } = await supabase
      .from('student_fees')
      .select('final_amount, paid_amount, remaining_amount, status')
      .eq('month', month)
      .eq('year', year);
    if (error) throw error;

    const fees = data ?? [];
    return {
      total_expected: fees.reduce((s, f) => s + Number(f.final_amount), 0),
      total_collected: fees.reduce((s, f) => s + Number(f.paid_amount), 0),
      total_remaining: fees.reduce((s, f) => s + Number(f.remaining_amount), 0),
      count_unpaid: fees.filter((f) => f.status === 'UNPAID').length,
      count_partial: fees.filter((f) => f.status === 'PARTIAL').length,
      count_paid: fees.filter((f) => f.status === 'PAID').length,
      count_overdue: fees.filter((f) => f.status === 'OVERDUE' || (f.status !== 'PAID' && f.status !== 'WAIVED' && new Date(f.due_date) < new Date())).length,
    };
  },

  // Compute effective status
  computeEffectiveStatus(fee) {
    return computeEffectiveFeeStatus(fee);
  },
};
