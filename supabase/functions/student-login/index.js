import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { loginName, studentCode, password } = await req.json();
    const identifier = (loginName || studentCode || '').trim().toLowerCase();
    if (!identifier || !password) {
      return jsonResponse({ error: 'Vui lòng nhập tài khoản và mật khẩu' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: student, error: studentError } = await adminClient
      .from('students')
      .select('profile_id')
      .or(`login_name.ilike.${identifier},student_code.ilike.${identifier}`)
      .is('deleted_at', null)
      .single();

    if (studentError || !student?.profile_id) {
      return jsonResponse({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, role, is_active')
      .eq('id', student.profile_id)
      .eq('role', 'STUDENT')
      .single();

    if (profileError || !profile?.email || profile.is_active === false) {
      return jsonResponse({ error: 'Tài khoản học viên không hoạt động' }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const { data, error } = await authClient.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (error || !data.session) {
      return jsonResponse({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, 401);
    }

    return jsonResponse({ session: data.session, user: data.user });
  } catch (err) {
    return jsonResponse({ error: err.message ?? 'Lỗi đăng nhập' }, 500);
  }
});
