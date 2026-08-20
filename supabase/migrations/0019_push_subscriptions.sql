-- Migration 0019: Web Push subscriptions
--
-- Adds storage for browser Push API subscriptions so the app can send OS-level
-- push notifications to students' phones (via the PWA service worker) in
-- addition to the existing in-app notification list. Each row is one
-- subscribed device/browser for a profile; a user may have several (phone +
-- laptop, or after reinstalling the PWA — old endpoints are cleaned up by the
-- send-push Edge Function when the push service reports them as gone).

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_push_subscription UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLICIES: PUSH SUBSCRIPTIONS
-- ==========================================

DROP POLICY IF EXISTS "Push subscriptions policy" ON public.push_subscriptions;
CREATE POLICY "Push subscriptions policy" ON public.push_subscriptions
    FOR ALL TO authenticated
    USING (public.is_admin() OR user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
