-- Migration 0022: Study topics (Chuyên đề học) — reviewable lesson content,
-- separate from the graded exercises/homework in 0020-0021.
--
-- Design note: subject_id is the extension point for future subjects (Toán,
-- Tiếng Việt) — subjects already exist as a plain table, so adding a new
-- subject there is all that's needed to start attaching topics to it, no
-- schema change here. study_topic_vocabulary's column names are deliberately
-- neutral (term/word_type/meaning/example_sentence, not "english_"/
-- "vietnamese_") because that vocabulary shape (term + type + meaning +
-- example) works for a Vietnamese-language subject too, not just English.
-- Math will likely need a structurally different content table when it's
-- actually built (formulas/worked examples, not vocabulary) — deliberately
-- not guessed at here; add it as its own table alongside this one when that
-- work starts, same pattern as this migration.

CREATE TABLE public.study_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE public.study_topic_vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.study_topics(id) ON DELETE CASCADE,
    term VARCHAR(255) NOT NULL,
    word_type VARCHAR(50),
    meaning VARCHAR(500) NOT NULL,
    example_sentence TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_topics_subject ON public.study_topics(subject_id);
CREATE INDEX idx_study_topic_vocabulary_topic ON public.study_topic_vocabulary(topic_id);

-- updated_at triggers (same handle_updated_at() from 0002)
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.study_topics;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.study_topics
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.study_topic_vocabulary;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.study_topic_vocabulary
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Protect from hard delete, same as documents/exercises (soft delete via
-- deleted_at instead).
DROP TRIGGER IF EXISTS trg_prevent_core_delete ON public.study_topics;
CREATE TRIGGER trg_prevent_core_delete BEFORE DELETE ON public.study_topics
    FOR EACH ROW EXECUTE FUNCTION public.prevent_core_delete();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.study_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_topic_vocabulary ENABLE ROW LEVEL SECURITY;

-- Reference material: readable by every authenticated user (students,
-- teachers, admin alike), same simplicity as "Subjects select policy" in
-- 0003 — write restricted to staff.
CREATE POLICY "Study topics select policy" ON public.study_topics
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Study topics insert policy" ON public.study_topics
    FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_teacher());
CREATE POLICY "Study topics update policy" ON public.study_topics
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR created_by = auth.uid())
    WITH CHECK (public.is_admin() OR created_by = auth.uid());
CREATE POLICY "Study topics delete policy" ON public.study_topics
    FOR DELETE TO authenticated USING (public.is_admin() OR created_by = auth.uid());

CREATE POLICY "Study topic vocabulary select policy" ON public.study_topic_vocabulary
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Study topic vocabulary staff write policy" ON public.study_topic_vocabulary
    FOR ALL TO authenticated
    USING (public.is_admin() OR public.is_teacher())
    WITH CHECK (public.is_admin() OR public.is_teacher());
