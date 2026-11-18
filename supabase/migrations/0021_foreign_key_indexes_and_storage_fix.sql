-- ==============================================================================
-- Migration 0021: Foreign Key Indexing & Storage Listing Elimination
-- Resolves:
--  1. Unindexed foreign keys on relational tables
--  2. Public Bucket Allows Listing on storage.avatars
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. INDEX ALL UNINDEXED FOREIGN KEYS
-- Speeds up JOIN operations and CASCADE DELETES across the platform
-- ------------------------------------------------------------------------------

-- public.content_reports (user_id, question_id, topic_id)
CREATE INDEX IF NOT EXISTS idx_content_reports_user_id ON public.content_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_question_id ON public.content_reports(question_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_topic_id ON public.content_reports(topic_id);

-- public.flashcards (topic_id)
CREATE INDEX IF NOT EXISTS idx_flashcards_topic_id ON public.flashcards(topic_id);

-- public.notes (user_id, topic_id)
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON public.notes(topic_id);

-- public.notifications (target_user_id) - if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'target_user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON public.notifications(target_user_id);
  END IF;
END $$;

-- public.payment_requests (reviewed_by, user_id)
CREATE INDEX IF NOT EXISTS idx_payment_requests_reviewed_by ON public.payment_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);

-- public.quiz_attempts (user_id, course_id)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course_id ON public.quiz_attempts(course_id);

-- public.study_plans (course_id)
CREATE INDEX IF NOT EXISTS idx_study_plans_course_id ON public.study_plans(course_id);

-- public.user_flashcards (user_id, flashcard_id)
CREATE INDEX IF NOT EXISTS idx_user_flashcards_user_id ON public.user_flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flashcards_flashcard_id ON public.user_flashcards(flashcard_id);

-- public.user_notification_reads (user_id, notification_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notification_reads') THEN
    CREATE INDEX IF NOT EXISTS idx_user_notif_reads_user_id ON public.user_notification_reads(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_notif_reads_notif_id ON public.user_notification_reads(notification_id);
  END IF;
END $$;

-- public.user_progress (user_id, topic_id)
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_topic_id ON public.user_progress(topic_id);

-- ------------------------------------------------------------------------------
-- 2. RESOLVE "Public Bucket Allows Listing on storage.avatars"
-- Completely remove any lingering permissive SELECT policy on storage.objects for avatars
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DROP POLICY IF EXISTS "Authenticated users select avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Public avatars read" ON storage.objects;
    DROP POLICY IF EXISTS "anyone can view avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;

    -- Strict policy: users can only select (read metadata / list) their OWN uploaded avatar files in 'avatars' bucket
    CREATE POLICY "Users can only select their own avatar"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (owner = auth.uid() OR (storage.foldername(name))[1] = auth.uid()::text)
      );
  END IF;
END $$;
