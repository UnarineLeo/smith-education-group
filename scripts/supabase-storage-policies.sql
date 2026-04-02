-- Private storage model for backend/edge-function uploads.
--
-- The browser should not upload directly to storage for this project.
-- Upload and signed URL operations are expected to run through trusted
-- Supabase Edge Functions using the service role key.

alter table storage.objects enable row level security;

drop policy if exists "Allow authenticated users to upload their own documents" on storage.objects;
drop policy if exists "Allow authenticated users to read their own documents" on storage.objects;
drop policy if exists "Allow authenticated users to delete their own documents" on storage.objects;

-- No additional policies are created here.
-- With RLS enabled and no permissive policies, direct client access is denied.
-- Service role requests from edge functions bypass RLS and can perform
-- controlled uploads/signing logic server-side.
--
-- Storage path format: users/{userUid}/{documentKey}-{timestamp}-{filename}

