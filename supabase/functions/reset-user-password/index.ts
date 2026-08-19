import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.js';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Thiếu thông tin xác thực' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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
      return jsonResponse({ error: 'Chỉ quản trị viên hoặc giáo viên mới có quyền đặt lại mật khẩu' }, 403);
    }

    const { profileId } = await req.json();
    if (!profileId) return jsonResponse({ error: 'Thiếu profileId' }, 400);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const tempPassword = generateTempPassword();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(profileId, {
      password: tempPassword,
    });
    if (updateError) return jsonResponse({ error: updateError.message }, 400);

    await adminClient.from('profiles').update({ must_change_password: true }).eq('id', profileId);
    return jsonResponse({ success: true, tempPassword });
  } catch (err) {
    return jsonResponse({ error: err.message ?? 'Lỗi hệ thống' }, 500);
  }
});
