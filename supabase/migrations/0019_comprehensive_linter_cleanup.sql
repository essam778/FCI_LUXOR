-- ==============================================================================
-- Migration 0019: Comprehensive Database Hardening & Linter Cleanup
-- Resolves ALL Supabase Database Linter & Security Advisor Warnings:
--  1. Duplicate Index: drop duplicate idx_topics_chapter_pos
--  2. Function Search Path Mutable: set search_path = public on all functions
--  3. Restrict SECURITY DEFINER Function execution from public / anon
--  4. Storage bucket listing hardening (remove public list)
--  5. RLS InitPlan & Multiple Permissive Policies consolidation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP DUPLICATE INDEX
-- ------------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_topics_chapter_pos;

-- ------------------------------------------------------------------------------
-- 2. FIX FUNCTION SEARCH PATH MUTABILITY (0011_function_search_path_mutable)
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.get_course_tree(text) SET search_path = public;
ALTER FUNCTION public.review_flashcard(uuid, int) SET search_path = public;
ALTER FUNCTION public.start_quiz(uuid, int) SET search_path = public;
ALTER FUNCTION public.finish_quiz(uuid, jsonb) SET search_path = public;
ALTER FUNCTION public.search_topics(text) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Re-declare with explicit search_path
CREATE OR REPLACE FUNCTION public.sync_user_avatar()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
  SET avatar_url = NEW.image_data
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role IN ('editor', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. SECURE SECURITY DEFINER FUNCTIONS (Revoke execution from public / anon)
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_avatar() FROM PUBLIC, anon, authenticated;

-- For rls_auto_enable (if created by any Supabase extension)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon;';
    EXECUTE 'ALTER FUNCTION public.rls_auto_enable() SET search_path = public;';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. HARDEN STORAGE BUCKET POLICIES (Prevent public directory listing)
-- ------------------------------------------------------------------------------
-- Public can download objects by name, but cannot enumerate/list the whole bucket
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    -- Drop wide-open storage SELECT policies if they allow arbitrary bucket listing
    DROP POLICY IF EXISTS "anyone can view avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Public avatars read" ON storage.objects;
    DROP POLICY IF EXISTS "Public course covers read" ON storage.objects;

    -- Replace with precise read policies
    CREATE POLICY "Public avatars read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');

    CREATE POLICY "Public course covers read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'course-covers');
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES & OPTIMIZE INITPLAN
-- Tables: courses, chapters, topics, questions, flashcards, study_plans, resources, profiles
-- ------------------------------------------------------------------------------

-- courses
DROP POLICY IF EXISTS "read published courses" ON courses;
DROP POLICY IF EXISTS "editors write courses" ON courses;
CREATE POLICY "courses_read_policy" ON courses FOR SELECT
  USING (status = 'published' OR (SELECT is_editor()));
CREATE POLICY "courses_insert_policy" ON courses FOR INSERT
  WITH CHECK ((SELECT is_editor()));
CREATE POLICY "courses_update_policy" ON courses FOR UPDATE
  USING ((SELECT is_editor())) WITH CHECK ((SELECT is_editor()));
CREATE POLICY "courses_delete_policy" ON courses FOR DELETE
  USING ((SELECT is_editor()));

-- chapters
DROP POLICY IF EXISTS "read published chapters" ON chapters;
DROP POLICY IF EXISTS "editors write chapters" ON chapters;
CREATE POLICY "chapters_read_policy" ON chapters FOR SELECT
  USING (status = 'published' OR (SELECT is_editor()));
CREATE POLICY "chapters_insert_policy" ON chapters FOR INSERT
  WITH CHECK ((SELECT is_editor()));
CREATE POLICY "chapters_update_policy" ON chapters FOR UPDATE
  USING ((SELECT is_editor())) WITH CHECK ((SELECT is_editor()));
CREATE POLICY "chapters_delete_policy" ON chapters FOR DELETE
  USING ((SELECT is_editor()));

-- topics
DROP POLICY IF EXISTS "read published topics" ON topics;
DROP POLICY IF EXISTS "editors write topics" ON topics;
CREATE POLICY "topics_read_policy" ON topics FOR SELECT
  USING (status = 'published' OR (SELECT is_editor()));
CREATE POLICY "topics_insert_policy" ON topics FOR INSERT
  WITH CHECK ((SELECT is_editor()));
CREATE POLICY "topics_update_policy" ON topics FOR UPDATE
  USING ((SELECT is_editor())) WITH CHECK ((SELECT is_editor()));
CREATE POLICY "topics_delete_policy" ON topics FOR DELETE
  USING ((SELECT is_editor()));

-- questions
DROP POLICY IF EXISTS "read published questions" ON questions;
DROP POLICY IF EXISTS "editors write questions" ON questions;
CREATE POLICY "questions_read_policy" ON questions FOR SELECT
  USING (status = 'published' OR (SELECT is_editor()));
CREATE POLICY "questions_insert_policy" ON questions FOR INSERT
  WITH CHECK ((SELECT is_editor()));
CREATE POLICY "questions_update_policy" ON questions FOR UPDATE
  USING ((SELECT is_editor())) WITH CHECK ((SELECT is_editor()));
CREATE POLICY "questions_delete_policy" ON questions FOR DELETE
  USING ((SELECT is_editor()));

-- flashcards
DROP POLICY IF EXISTS "read flashcards" ON flashcards;
DROP POLICY IF EXISTS "editors write flashcards" ON flashcards;
CREATE POLICY "flashcards_read_policy" ON flashcards FOR SELECT
  USING (true);
CREATE POLICY "flashcards_insert_policy" ON flashcards FOR INSERT
  WITH CHECK ((SELECT is_editor()));
CREATE POLICY "flashcards_update_policy" ON flashcards FOR UPDATE
  USING ((SELECT is_editor())) WITH CHECK ((SELECT is_editor()));
CREATE POLICY "flashcards_delete_policy" ON flashcards FOR DELETE
  USING ((SELECT is_editor()));

-- study_plans
DROP POLICY IF EXISTS "read plans" ON study_plans;
DROP POLICY IF EXISTS "editors write plans" ON study_plans;
CREATE POLICY "study_plans_read_policy" ON study_plans FOR SELECT
  USING (true);
CREATE POLICY "study_plans_insert_policy" ON study_plans FOR INSERT
  WITH CHECK ((SELECT is_editor()));
CREATE POLICY "study_plans_update_policy" ON study_plans FOR UPDATE
  USING ((SELECT is_editor())) WITH CHECK ((SELECT is_editor()));
CREATE POLICY "study_plans_delete_policy" ON study_plans FOR DELETE
  USING ((SELECT is_editor()));

-- resources
DROP POLICY IF EXISTS "read resources" ON resources;
DROP POLICY IF EXISTS "editors write resources" ON resources;
CREATE POLICY "resources_read_policy" ON resources FOR SELECT
  USING (
    (SELECT is_editor())
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.subscription_status IN ('active', 'lifetime')
    )
  );
CREATE POLICY "resources_insert_policy" ON resources FOR INSERT
  WITH CHECK ((SELECT is_editor()));
CREATE POLICY "resources_update_policy" ON resources FOR UPDATE
  USING ((SELECT is_editor())) WITH CHECK ((SELECT is_editor()));
CREATE POLICY "resources_delete_policy" ON resources FOR DELETE
  USING ((SELECT is_editor()));

-- profiles
DROP POLICY IF EXISTS "own profile read" ON profiles;
DROP POLICY IF EXISTS "own profile update" ON profiles;
DROP POLICY IF EXISTS "editors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "editors can update all profiles" ON profiles;
DROP POLICY IF EXISTS "editors can delete profiles" ON profiles;

CREATE POLICY "profiles_read_policy" ON profiles FOR SELECT
  USING (id = (SELECT auth.uid()) OR (SELECT is_editor()));

CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE
  USING (id = (SELECT auth.uid()) OR (SELECT is_editor()))
  WITH CHECK (
    (SELECT is_editor())
    OR (
      id = (SELECT auth.uid())
      AND role = (SELECT role FROM profiles WHERE id = (SELECT auth.uid()))
      AND subscription_status = (SELECT subscription_status FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "profiles_delete_policy" ON profiles FOR DELETE
  USING ((SELECT is_editor()));

-- user_avatars (fix RLS initplan)
DROP POLICY IF EXISTS "users can insert their own avatar" ON user_avatars;
DROP POLICY IF EXISTS "users can update their own avatar" ON user_avatars;
DROP POLICY IF EXISTS "users can delete their own avatar" ON user_avatars;
CREATE POLICY "user_avatars_insert_policy" ON user_avatars FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "user_avatars_update_policy" ON user_avatars FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "user_avatars_delete_policy" ON user_avatars FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- notifications (fix RLS initplan & consolidation)
DROP POLICY IF EXISTS "anyone can read notifications" ON notifications;
DROP POLICY IF EXISTS "editors can insert notifications" ON notifications;
DROP POLICY IF EXISTS "editors can update notifications" ON notifications;
DROP POLICY IF EXISTS "editors can delete notifications" ON notifications;

CREATE POLICY "notifications_read_policy" ON notifications FOR SELECT
  USING (true);
CREATE POLICY "notifications_insert_policy" ON notifications FOR INSERT
  WITH CHECK ((SELECT is_editor()));
CREATE POLICY "notifications_update_policy" ON notifications FOR UPDATE
  USING ((SELECT is_editor())) WITH CHECK ((SELECT is_editor()));
CREATE POLICY "notifications_delete_policy" ON notifications FOR DELETE
  USING ((SELECT is_editor()));
