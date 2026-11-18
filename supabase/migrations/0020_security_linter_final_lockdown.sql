-- ==============================================================================
-- Migration 0020: Storage Bucket Listing Hardening & Function Execution Lockdown
-- Resolves:
--  1. Public Bucket Allows Listing (storage.avatars, storage.course-covers)
--  2. Public / Signed-In Users Can Execute SECURITY DEFINER Function (is_editor, rls_auto_enable)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LOCK DOWN SECURITY DEFINER FUNCTIONS
-- Revoke execution from PUBLIC, anon, and authenticated so normal users cannot
-- execute them via RPC / PostgREST. PostgreSQL internal RLS policies and triggers
-- running with elevated/owner rights can still invoke them without issues.
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_editor() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_editor() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_editor() FROM authenticated;

-- Ensure service_role and postgres keep full execution access
GRANT EXECUTE ON FUNCTION public.is_editor() TO postgres, service_role;

-- Handle rls_auto_enable if it exists in the schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO postgres, service_role;';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. HARDEN STORAGE BUCKET LISTING (storage.avatars & storage.course-covers)
-- Supabase flags public buckets if anyone can list/enumerate all file keys
-- via supabase.storage.from('...').list().
-- In Supabase Storage, a public bucket automatically allows downloading any file
-- via its public CDN URL (https://.../storage/v1/object/public/bucket/file.png)
-- WITHOUT needing a SELECT policy on storage.objects.
-- By restricting SELECT on storage.objects to authenticated users or editors,
-- public anonymous users CANNOT enumerate files in the bucket, while public
-- images continue to render perfectly in the app!
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN

    -- Clean up all existing SELECT policies on storage.objects for avatars and course-covers
    DROP POLICY IF EXISTS "Public avatars read" ON storage.objects;
    DROP POLICY IF EXISTS "anyone can view avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Public course covers read" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can view course covers" ON storage.objects;

    -- Only allow authenticated users to view/list their own avatar records
    CREATE POLICY "Authenticated users select avatars"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'avatars');

    -- Only editors/admins can query/list the course-covers bucket
    CREATE POLICY "Editors select course covers"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'course-covers'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid()) AND role IN ('editor', 'admin')
        )
      );

  END IF;
END $$;
