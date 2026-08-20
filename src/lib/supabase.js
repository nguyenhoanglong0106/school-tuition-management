import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Thiếu biến môi trường Supabase. Vui lòng kiểm tra file .env:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// supabase.functions.invoke() puts a generic "Edge Function returned a
// non-2xx status code" in error.message on failure — the actual
// { error: "..." } body our edge functions return is only reachable via
// error.context (the raw fetch Response). Prefer that when available.
export async function getFunctionErrorMessage(error, fallback) {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    // context wasn't JSON (e.g. network-level failure) — fall through
  }
  return error?.message || fallback;
}

export default supabase;
