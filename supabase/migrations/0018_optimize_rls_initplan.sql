-- ============================================================
-- Migration 0018: Performance Hardening for RLS Policies (InitPlan Optimization)
-- Resolves Supabase linter warning: 0003_auth_rls_initplan
-- Wraps auth.uid() and auth.role() with (select ...) so PostgreSQL
-- computes them once per query execution (InitPlan) rather than re-evaluating
-- per row (SubPlan).
-- ============================================================

-- 1. profiles
DROP POLICY IF EXISTS "own profile read" ON profiles;
CREATE POLICY "own profile read" ON profiles FOR SELECT
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "own profile update" ON profiles;
CREATE POLICY "own profile update" ON profiles FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = (SELECT role FROM profiles WHERE id = (SELECT auth.uid()))
    AND subscription_status = (SELECT subscription_status FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- 2. user_progress
DROP POLICY IF EXISTS "own progress" ON user_progress;
CREATE POLICY "own progress" ON user_progress FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 3. quiz_attempts
DROP POLICY IF EXISTS "own attempts" ON quiz_attempts;
CREATE POLICY "own attempts" ON quiz_attempts FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 4. user_flashcards
DROP POLICY IF EXISTS "own cards" ON user_flashcards;
CREATE POLICY "own cards" ON user_flashcards FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 5. notes
DROP POLICY IF EXISTS "own notes" ON notes;
CREATE POLICY "own notes" ON notes FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 6. content_reports
DROP POLICY IF EXISTS "create report" ON content_reports;
CREATE POLICY "create report" ON content_reports FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 7. student_notes
DROP POLICY IF EXISTS "users manage own student_notes" ON student_notes;
CREATE POLICY "users manage own student_notes" ON student_notes FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 8. user_notification_reads
DROP POLICY IF EXISTS "users manage own notification reads" ON user_notification_reads;
CREATE POLICY "users manage own notification reads" ON user_notification_reads FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 9. payment_requests
DROP POLICY IF EXISTS "users can read own payment requests" ON payment_requests;
CREATE POLICY "users can read own payment requests" ON payment_requests FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users can insert own payment requests" ON payment_requests;
CREATE POLICY "users can insert own payment requests" ON payment_requests FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 10. student_analytics
DROP POLICY IF EXISTS "Students read own analytics" ON student_analytics;
CREATE POLICY "Students read own analytics" ON student_analytics FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students upsert own analytics" ON student_analytics;
CREATE POLICY "Students upsert own analytics" ON student_analytics FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students update own analytics" ON student_analytics;
CREATE POLICY "Students update own analytics" ON student_analytics FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- 11. student_mistake_bank
DROP POLICY IF EXISTS "Students read own mistakes" ON student_mistake_bank;
CREATE POLICY "Students read own mistakes" ON student_mistake_bank FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students upsert own mistakes" ON student_mistake_bank;
CREATE POLICY "Students upsert own mistakes" ON student_mistake_bank FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students update own mistakes" ON student_mistake_bank;
CREATE POLICY "Students update own mistakes" ON student_mistake_bank FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students delete own mistakes" ON student_mistake_bank;
CREATE POLICY "Students delete own mistakes" ON student_mistake_bank FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- 12. student_quiz_attempts
DROP POLICY IF EXISTS "Students read own quiz attempts" ON student_quiz_attempts;
CREATE POLICY "Students read own quiz attempts" ON student_quiz_attempts FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students insert own quiz attempts" ON student_quiz_attempts;
CREATE POLICY "Students insert own quiz attempts" ON student_quiz_attempts FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
