-- ==========================================================
-- 0023_notifications_users_only.sql
-- تقييد قراءة الإشعارات للمستخدمين المسجلين فقط (منع غير المستخدمين والزوار)
-- ==========================================================

DROP POLICY IF EXISTS "notifications_read_policy" ON notifications;

CREATE POLICY "notifications_read_policy" ON notifications FOR SELECT
  TO authenticated
  USING (
    (SELECT is_editor()) OR
    target_type = 'all' OR
    target_type IS NULL OR
    (target_type = 'user' AND target_user_id = (SELECT auth.uid())) OR
    (target_type = 'level' AND target_level = (SELECT level FROM profiles WHERE id = (SELECT auth.uid())))
  );
