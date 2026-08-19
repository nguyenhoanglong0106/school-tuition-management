import { supabase } from '@/lib/supabase';

export const paymentService = {
  // List payments with filters
  async getAll({
    studentId = null,
    feeId = null,
    status = null,
    page = 1,
    pageSize = 20,
  } = {}) {
    let query = supabase
      .from('payments')
      .select(`
        *,
        students(id, student_code, full_name),
        student_fees(id, fee_code, period_label, classes(class_name))
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);
    if (feeId) query = query.eq('student_fee_id', feeId);
    if (status) query = query.eq('status', status);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        students(id, student_code, full_name, phone),
        student_fees(id, fee_code, period_label, final_amount, paid_amount, remaining_amount,
          classes(class_name))
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Create a pending payment (by student)
  async createPayment(payment) {
    const { data, error } = await supabase
      .from('payments')
      .insert({ ...payment, status: 'PENDING' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Confirm payment via transactional RPC
  async confirmPayment(paymentId) {
    const { data, error } = await supabase.rpc('confirm_payment', {
      p_payment_id: paymentId,
    });
    if (error) throw error;
    return data;
  },

  // Reject payment via RPC
  async rejectPayment(paymentId, reason) {
    const { data, error } = await supabase.rpc('reject_payment', {
      p_payment_id: paymentId,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  },

  // Upload receipt and link to payment.
  // `ownerProfileId` MUST be the uploader's own auth.uid() (profiles.id) —
  // the receipts Storage policy grants read/write access by comparing
  // auth.uid() against the first folder segment of the object path, so this
  // has to be the profile id, not the students.id row PK (a different UUID).
  async uploadReceipt(paymentId, file, ownerProfileId) {
    const maxMB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB ?? 20);
    if (file.size > maxMB * 1024 * 1024) {
      throw new Error(`File quá lớn. Tối đa ${maxMB}MB`);
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      throw new Error('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc PDF');
    }

    const ext = file.name.split('.').pop();
    const path = `${ownerProfileId}/${paymentId}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('receipts')
      .upload(path, file, { upsert: true });
    if (uploadErr) throw uploadErr;

    const { error: updateErr } = await supabase
      .from('payments')
      .update({ receipt_path: path })
      .eq('id', paymentId);
    if (updateErr) throw updateErr;

    return path;
  },

  // Get signed URL for receipt
  async getReceiptUrl(path) {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  },

  // Generate payment code (client side fallback)
  generatePaymentCode() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `PT${mm}${yyyy}${Date.now().toString().slice(-6)}`;
  },

  // Pending payment count
  async getPendingCount() {
    const { count } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');
    return count ?? 0;
  },
};
