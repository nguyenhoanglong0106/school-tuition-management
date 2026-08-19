-- Migration 0009: Storage Bucket Size & MIME Type Limits
-- The original bucket creation (0004) only set public/private — file type and
-- size validation lived entirely in the frontend (documentService.js,
-- paymentService.js), which a direct API call bypasses. Supabase Storage
-- enforces `file_size_limit` and `allowed_mime_types` server-side regardless
-- of what the client claims, so this is the real defense here.
--
-- 20MB matches the app's documented default (VITE_MAX_FILE_SIZE_MB=20 in
-- .env.example) — if you raise that env var, raise file_size_limit here too.

UPDATE storage.buckets SET
    file_size_limit = 20971520, -- 20MB
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg', 'image/png', 'image/webp'
    ]
WHERE id = 'documents';

UPDATE storage.buckets SET
    file_size_limit = 20971520, -- 20MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'receipts';

UPDATE storage.buckets SET
    file_size_limit = 5242880, -- 5MB — avatars never need to be large
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';

UPDATE storage.buckets SET
    file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
WHERE id = 'branding';
