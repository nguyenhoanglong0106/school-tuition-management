// Supabase Edge Function: create-user
// Privileged operation — creates a Supabase Auth user + linked profile row for
// a Student or Teacher. Runs with the Service Role key (server-side only,
// never exposed to the frontend) and re-verifies the caller is an ADMIN
// before doing anything, so a forged frontend role can never trigger this.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Thiếu thông tin xác thực' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Client scoped to the caller's own JWT — used only to verify identity & role.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return jsonResponse({ error: 'Phiên đăng nhập không hợp lệ' }, 401);

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!['ADMIN', 'TEACHER'].includes(callerProfile?.role)) {
      return jsonResponse({ error: 'Chỉ quản trị viên hoặc giáo viên mới có quyền tạo tài khoản' }, 403);
    }

    const { email, loginName, password, fullName, role, phone, studentId } = await req.json();

    if (!password || !fullName || !['STUDENT', 'TEACHER'].includes(role)) {
      return jsonResponse({ error: 'Thiếu thông tin bắt buộc hoặc vai trò không hợp lệ' }, 400);
    }
    if (role === 'TEACHER' && !email) {
      return jsonResponse({ error: 'Tài khoản giáo viên cần có email' }, 400);
    }
    if (role === 'STUDENT' && (!loginName || !studentId)) {
      return jsonResponse({ error: 'Tài khoản học viên không được để trống' }, 400);
    }
    if (role === 'STUDENT' && !/^[a-zA-Z0-9._-]+$/.test(loginName.trim())) {
      return jsonResponse({ error: 'Tài khoản chỉ được dùng chữ cái, số, dấu chấm, gạch ngang hoặc gạch dưới' }, 400);
    }
    if (password.length < 6) {
      return jsonResponse({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, 400);
    }

    // Privileged client — Service Role key lives only in this server-side function.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const normalizedLoginName = loginName?.trim().toLowerCase();
    const authEmail = role === 'STUDENT'
      ? `${normalizedLoginName}@student.internal`
      : email.trim().toLowerCase();

    if (role === 'STUDENT') {
      const { data: existingStudent } = await adminClient
        .from('students')
        .select('id')
        .ilike('login_name', normalizedLoginName)
        .maybeSingle();
      if (existingStudent) return jsonResponse({ error: 'Tài khoản học viên đã tồn tại' }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) return jsonResponse({ error: createError.message }, 400);

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: created.user.id,
      role,
      full_name: fullName,
      phone: phone ?? null,
      email: authEmail,
      is_active: true,
      must_change_password: true,
    });

    if (profileError) {
      // Roll back the auth user so we don't leave an orphaned account behind.
      await adminClient.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: profileError.message }, 400);
    }

    if (role === 'STUDENT') {
      const { error: studentError } = await adminClient
        .from('students')
        .update({ profile_id: created.user.id, login_name: normalizedLoginName })
        .eq('id', studentId)
        .is('deleted_at', null);
      if (studentError) {
        await adminClient.from('profiles').delete().eq('id', created.user.id);
        await adminClient.auth.admin.deleteUser(created.user.id);
        return jsonResponse({ error: studentError.message }, 400);
      }
    }

    return jsonResponse({ success: true, userId: created.user.id });
  } catch (err) {
    return jsonResponse({ error: err.message ?? 'Lỗi hệ thống' }, 500);
  }
});
