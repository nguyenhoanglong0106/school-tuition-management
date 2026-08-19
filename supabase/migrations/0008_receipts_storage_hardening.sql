-- Migration 0008: Receipts Storage Policy Hardening
-- The original "Receipts Student Upload" INSERT policy (0004) only checked
-- bucket_id, with no ownership check on the destination folder — any
-- authenticated user could technically upload into another student's
-- receipt folder. It's also now consistent with the app writing receipts
-- under `{profile_id}/...` (see src/services/paymentService.js) rather than
-- `{students.id}/...`, which is what the SELECT policy's folder check
-- (auth.uid() vs first path segment) actually requires to work at all.

DROP POLICY IF EXISTS "Receipts Student Upload" ON storage.objects;

CREATE POLICY "Receipts Student Upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'receipts'
        AND (
            public.is_admin()
            OR (auth.uid()::text = (storage.foldername(name))[1])
        )
    );
