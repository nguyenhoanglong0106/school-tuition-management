// Supabase Edge Function: send-push
// Sends a Web Push notification (via VAPID) to every subscribed device of a
// list of profiles. Called by the frontend right after an in-app
// notification is created (notificationService.sendToClass / sendGeneral),
// so the caller must be ADMIN or TEACHER — same check as create-user.
// Runs with the Service Role key so it can read push_subscriptions across
// every user regardless of RLS.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';
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
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';

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
      return jsonResponse({ error: 'Chỉ quản trị viên hoặc giáo viên mới có quyền gửi thông báo' }, 403);
    }

    const { profileIds, title, body, url } = await req.json();
    if (!Array.isArray(profileIds) || profileIds.length === 0 || !title) {
      return jsonResponse({ error: 'Thiếu thông tin bắt buộc' }, 400);
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return jsonResponse({ error: 'Chưa cấu hình VAPID key cho thông báo đẩy' }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: subscriptions, error: subError } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .in('user_id', profileIds);
    if (subError) return jsonResponse({ error: subError.message }, 500);

    const payload = JSON.stringify({ title, body: body ?? '', url: url ?? '/app/notifications' });

    let sent = 0;
    let failed = 0;
    const staleIds = [];

    await Promise.all((subscriptions ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        );
        sent += 1;
      } catch (err) {
        failed += 1;
        // 404/410 = the push service says this endpoint no longer exists
        // (browser unsubscribed / app uninstalled) — stop trying it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    }));

    if (staleIds.length > 0) {
      await adminClient.from('push_subscriptions').delete().in('id', staleIds);
    }

    return jsonResponse({ success: true, sent, failed });
  } catch (err) {
    return jsonResponse({ error: err.message ?? 'Lỗi hệ thống' }, 500);
  }
});
