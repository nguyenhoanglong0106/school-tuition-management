-- Migration 0023: Study topic situations (Tình huống giao tiếp)
--
-- A situation belongs to a study_topic and holds an AI-drafted sample
-- dialogue (generated once by the generate-dialogue Edge Function, then
-- editable/saved by the teacher like any other static content — the AI
-- is only ever used at authoring time, never per student view, to keep
-- Gemini usage cost bounded).

CREATE TABLE public.study_topic_situations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.study_topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    -- [{ "speaker": "A", "english": "...", "vietnamese": "..." }, ...]
    dialogue JSONB NOT NULL DEFAULT '[]',
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_topic_situations_topic ON public.study_topic_situations(topic_id);

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.study_topic_situations;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.study_topic_situations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.study_topic_situations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Study topic situations select policy" ON public.study_topic_situations
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Study topic situations staff write policy" ON public.study_topic_situations
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_teacher())
    WITH CHECK (public.is_admin() OR public.is_teacher());
