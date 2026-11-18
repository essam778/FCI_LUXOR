-- ============================================================
-- Migration 0017: Add last_studied_at index & analytics helper view
-- Purpose: Optimize study-reminder queries; create a view for
--          courses not opened in the last 7 days (used by PWA logic).
-- ============================================================

-- Index for study-reminder queries (find courses not studied recently)
CREATE INDEX IF NOT EXISTS idx_student_analytics_last_studied
  ON student_analytics (user_id, last_studied_at);

-- ============================================================
-- Helper view: "stale" courses per student (not opened in 7 days)
-- Frontend uses this via RPC or direct query to trigger reminders.
-- ============================================================
CREATE OR REPLACE VIEW student_stale_courses AS
SELECT
  user_id,
  course_id,
  last_studied_at,
  total_study_seconds,
  EXTRACT(EPOCH FROM (now() - last_studied_at)) / 86400 AS days_since_last_study
FROM student_analytics
WHERE last_studied_at < now() - INTERVAL '7 days';

-- Grant access to authenticated users (filtered by RLS on base table)
GRANT SELECT ON student_stale_courses TO authenticated;
