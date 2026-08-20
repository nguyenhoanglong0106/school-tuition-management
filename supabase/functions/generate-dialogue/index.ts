// Supabase Edge Function: generate-dialogue
// Drafts a short English practice dialogue (+ Vietnamese translation) for a
// "Tình huống giao tiếp" via Gemini. ADMIN/TEACHER only, called once per
// situation authored (not per student view) so Gemini usage cost stays
// bounded to content creation, not content consumption. The API key lives
// only in this function's environment (GEMINI_API_KEY secret) — it never
// reaches the client, same reasoning as VAPID keys in send-push.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.js';

// Free-tier quota for this project is far more generous on Flash-Lite (500
// requests/day, 15/min) than plain 2.5 Flash (20/day, 5/min) -- check
// Google AI Studio -> Rate Limits if this ever needs revisiting.
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Thiếu thông tin xác thực' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

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
      return jsonResponse({ error: 'Chỉ quản trị viên hoặc giáo viên mới có quyền tạo hội thoại bằng AI' }, 403);
    }

    if (!geminiApiKey) {
      return jsonResponse({ error: 'Chưa cấu hình GEMINI_API_KEY trên server (Supabase Edge Function secret). Xem scripts/setup.md.' }, 500);
    }

    const { title, topicTitle, level, notes } = await req.json();
    if (!title?.trim()) return jsonResponse({ error: 'Thiếu tên tình huống' }, 400);

    const levelText = level?.trim() || 'sơ trung cấp (A2-B1)';

    const prompt = `Bạn là giáo viên tiếng Anh soạn giáo trình. Viết một đoạn hội thoại tiếng Anh ngắn (4-6 lượt nói, luân phiên giữa người A và người B) cho tình huống giao tiếp: "${title.trim()}"${topicTitle ? ` (thuộc chủ đề: "${topicTitle}")` : ''}.

Yêu cầu:
- Tiếng Anh tự nhiên, đời thường, phù hợp trình độ ${levelText}.
- Mỗi câu có bản dịch tiếng Việt tự nhiên, sát nghĩa, không dịch máy móc.${notes?.trim() ? `\n- Lưu ý thêm từ giáo viên (ưu tiên áp dụng): ${notes.trim()}` : ''}
- Chỉ trả về JSON là một mảng, đúng schema sau, không kèm giải thích hay markdown:
[{"speaker":"A","english":"...","vietnamese":"..."}]`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errBody);
      return jsonResponse({ error: 'Không thể tạo hội thoại từ AI. Kiểm tra lại GEMINI_API_KEY hoặc thử lại sau.' }, 502);
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return jsonResponse({ error: 'AI không trả về nội dung' }, 502);

    // Defensive: strip a ```json fence if the model added one despite
    // responseMimeType asking for raw JSON.
    let raw = text.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }

    let dialogue;
    try {
      dialogue = JSON.parse(raw);
    } catch {
      return jsonResponse({ error: 'AI trả về định dạng không hợp lệ, vui lòng thử lại' }, 502);
    }

    if (!Array.isArray(dialogue) || dialogue.length === 0) {
      return jsonResponse({ error: 'AI không tạo được hội thoại hợp lệ, vui lòng thử lại' }, 502);
    }

    return jsonResponse({ success: true, dialogue });
  } catch (err) {
    return jsonResponse({ error: err.message ?? 'Lỗi hệ thống' }, 500);
  }
});
