-- Migration 0004: Supabase Storage Buckets and Storage Security Policies

-- Create storage buckets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('branding', 'branding', true),
    ('documents', 'documents', false),
    ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (Supabase standard)
-- Note: storage.objects usually has RLS enabled by default in Supabase.

-- 1. Avatars Bucket Policies
DROP POLICY IF EXISTS "Avatars Public Read" ON storage.objects;
CREATE POLICY "Avatars Public Read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars Authenticated Upload" ON storage.objects;
CREATE POLICY "Avatars Authenticated Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars Authenticated Update" ON storage.objects;
CREATE POLICY "Avatars Authenticated Update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars Authenticated Delete" ON storage.objects;
CREATE POLICY "Avatars Authenticated Delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars');

-- 2. Branding Bucket Policies
DROP POLICY IF EXISTS "Branding Public Read" ON storage.objects;
CREATE POLICY "Branding Public Read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Branding Admin Manage" ON storage.objects;
CREATE POLICY "Branding Admin Manage" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'branding' AND public.is_admin())
    WITH CHECK (bucket_id = 'branding' AND public.is_admin());

-- 3. Documents Bucket Policies (Private: Admin & Teacher upload, signed url for students)
DROP POLICY IF EXISTS "Documents Admin/Teacher Upload" ON storage.objects;
CREATE POLICY "Documents Admin/Teacher Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'documents' 
        AND (public.is_admin() OR public.is_teacher())
    );

DROP POLICY IF EXISTS "Documents Admin/Teacher Update" ON storage.objects;
CREATE POLICY "Documents Admin/Teacher Update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'documents' 
        AND (public.is_admin() OR public.is_teacher())
    );

DROP POLICY IF EXISTS "Documents Admin/Teacher Delete" ON storage.objects;
CREATE POLICY "Documents Admin/Teacher Delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'documents' 
        AND (public.is_admin() OR public.is_teacher())
    );

DROP POLICY IF EXISTS "Documents Authorized Read" ON storage.objects;
CREATE POLICY "Documents Authorized Read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'documents'
        AND (
            public.is_admin() 
            OR public.is_teacher()
            OR EXISTS (
                SELECT 1 FROM public.documents d
                WHERE d.file_path = storage.objects.name
            )
        )
    );

-- 4. Receipts Bucket Policies (Private: Student upload own receipts, Admin view all)
DROP POLICY IF EXISTS "Receipts Student Upload" ON storage.objects;
CREATE POLICY "Receipts Student Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'receipts'
    );

DROP POLICY IF EXISTS "Receipts Authorized Read" ON storage.objects;
CREATE POLICY "Receipts Authorized Read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'receipts'
        AND (
            public.is_admin()
            OR (auth.uid()::text = (storage.foldername(name))[1])
        )
    );

DROP POLICY IF EXISTS "Receipts Admin Manage" ON storage.objects;
CREATE POLICY "Receipts Admin Manage" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'receipts' AND public.is_admin())
    WITH CHECK (bucket_id = 'receipts' AND public.is_admin());
