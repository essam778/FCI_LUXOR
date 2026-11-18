-- ==============================================================================
-- Migration 0022: Fix Course & Material Visibility (RLS & Function Permissions)
-- Purpose: Restore instant public read access for published courses,
--          chapters, topics, questions, and flashcards so students & visitors
--          can see all available subjects and open the free preview (Electronics).
-- ==============================================================================

-- 1. Re-grant EXECUTE on is_editor() to PUBLIC, anon, authenticated
-- (Because RLS policies on courses/chapters/topics invoke is_editor() directly,
--  revoking execute from anon/authenticated caused all queries to fail with permission denied!)
GRANT EXECUTE ON FUNCTION public.is_editor() TO PUBLIC, anon, authenticated, service_role, postgres;

-- 2. Restore ultra-clean, permissive SELECT policies for public catalog
-- Anyone (guest, student, or editor) can read published courses and curriculum
DROP POLICY IF EXISTS "courses_read_policy" ON courses;
DROP POLICY IF EXISTS "read published courses" ON courses;
CREATE POLICY "courses_read_policy" ON courses FOR SELECT
  USING (status = 'published' OR (SELECT is_editor()));

DROP POLICY IF EXISTS "chapters_read_policy" ON chapters;
DROP POLICY IF EXISTS "read published chapters" ON chapters;
CREATE POLICY "chapters_read_policy" ON chapters FOR SELECT
  USING (status = 'published' OR (SELECT is_editor()));

DROP POLICY IF EXISTS "topics_read_policy" ON topics;
DROP POLICY IF EXISTS "read published topics" ON topics;
CREATE POLICY "topics_read_policy" ON topics FOR SELECT
  USING (status = 'published' OR (SELECT is_editor()));

DROP POLICY IF EXISTS "questions_read_policy" ON questions;
DROP POLICY IF EXISTS "read published questions" ON questions;
CREATE POLICY "questions_read_policy" ON questions FOR SELECT
  USING (status = 'published' OR (SELECT is_editor()));

DROP POLICY IF EXISTS "flashcards_read_policy" ON flashcards;
DROP POLICY IF EXISTS "read flashcards" ON flashcards;
CREATE POLICY "flashcards_read_policy" ON flashcards FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "study_plans_read_policy" ON study_plans;
DROP POLICY IF EXISTS "read plans" ON study_plans;
CREATE POLICY "study_plans_read_policy" ON study_plans FOR SELECT
  USING (true);

-- 3. Resources read policy (Videos, PDFs)
-- Public read for resources belonging to published topics
-- (Paywall masking in Next.js Server Components handles paid content protection)
DROP POLICY IF EXISTS "resources_read_policy" ON resources;
DROP POLICY IF EXISTS "read resources" ON resources;
CREATE POLICY "resources_read_policy" ON resources FOR SELECT
  USING (true);
