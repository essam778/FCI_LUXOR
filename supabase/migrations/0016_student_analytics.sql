-- ============================================================
-- Migration 0016: Student Analytics & Mistake Bank (Supabase-persisted)
-- Idempotent: Can be run multiple times safely.
-- ============================================================

-- 1. Main analytics record per student per course
CREATE TABLE IF NOT EXISTS student_analytics (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id        text NOT NULL,

  completed_lecture_ids   text[]  NOT NULL DEFAULT '{}',
  passed_quiz_lecture_ids text[] NOT NULL DEFAULT '{}',
  total_study_seconds     bigint NOT NULL DEFAULT 0,

  last_studied_at  timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, course_id)
);

-- 2. Mistake Bank: one row per wrong question
CREATE TABLE IF NOT EXISTS student_mistake_bank (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id           text NOT NULL,
  lecture_id          text NOT NULL,
  lecture_title       text NOT NULL,
  question_id         text NOT NULL,
  question_text       text NOT NULL,
  options             jsonb NOT NULL DEFAULT '[]',
  correct_index       int  NOT NULL,
  user_selected_index int NOT NULL,
  explanation         text,
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, course_id, question_id)
);

-- 3. Quiz Attempts History
CREATE TABLE IF NOT EXISTS student_quiz_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id        text NOT NULL,
  lecture_id       text NOT NULL,
  lecture_title    text NOT NULL,
  score            numeric(5,2) NOT NULL DEFAULT 0,
  total_questions  int NOT NULL,
  correct_count    int NOT NULL,
  duration_seconds int NOT NULL DEFAULT 0,
  is_mock_exam     boolean NOT NULL DEFAULT false,
  attempted_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_student_analytics_user_course
  ON student_analytics (user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_student_mistake_bank_user_course
  ON student_mistake_bank (user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_student_quiz_attempts_user_course
  ON student_quiz_attempts (user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_student_quiz_attempts_attempted_at
  ON student_quiz_attempts (attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_analytics_last_studied
  ON student_analytics (user_id, last_studied_at);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_analytics_updated_at ON student_analytics;
CREATE TRIGGER trg_student_analytics_updated_at
  BEFORE UPDATE ON student_analytics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_student_mistake_bank_updated_at ON student_mistake_bank;
CREATE TRIGGER trg_student_mistake_bank_updated_at
  BEFORE UPDATE ON student_mistake_bank
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE student_analytics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mistake_bank  ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- student_analytics
DROP POLICY IF EXISTS "Students read own analytics" ON student_analytics;
CREATE POLICY "Students read own analytics"
  ON student_analytics FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students upsert own analytics" ON student_analytics;
CREATE POLICY "Students upsert own analytics"
  ON student_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students update own analytics" ON student_analytics;
CREATE POLICY "Students update own analytics"
  ON student_analytics FOR UPDATE
  USING (auth.uid() = user_id);

-- mistake_bank
DROP POLICY IF EXISTS "Students read own mistakes" ON student_mistake_bank;
CREATE POLICY "Students read own mistakes"
  ON student_mistake_bank FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students upsert own mistakes" ON student_mistake_bank;
CREATE POLICY "Students upsert own mistakes"
  ON student_mistake_bank FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students update own mistakes" ON student_mistake_bank;
CREATE POLICY "Students update own mistakes"
  ON student_mistake_bank FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students delete own mistakes" ON student_mistake_bank;
CREATE POLICY "Students delete own mistakes"
  ON student_mistake_bank FOR DELETE
  USING (auth.uid() = user_id);

-- quiz_attempts
DROP POLICY IF EXISTS "Students read own quiz attempts" ON student_quiz_attempts;
CREATE POLICY "Students read own quiz attempts"
  ON student_quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students insert own quiz attempts" ON student_quiz_attempts;
CREATE POLICY "Students insert own quiz attempts"
  ON student_quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- View for Stale Courses (WITH security_invoker = true to enforce RLS of the querying user)
DROP VIEW IF EXISTS student_stale_courses;
CREATE OR REPLACE VIEW student_stale_courses
WITH (security_invoker = true) AS
SELECT
  user_id,
  course_id,
  last_studied_at,
  total_study_seconds,
  EXTRACT(EPOCH FROM (now() - last_studied_at)) / 86400 AS days_since_last_study
FROM student_analytics
WHERE last_studied_at < now() - INTERVAL '7 days';

GRANT SELECT ON student_stale_courses TO authenticated;
