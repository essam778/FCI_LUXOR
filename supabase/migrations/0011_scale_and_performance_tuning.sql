-- ==========================================================
-- 0011_scale_and_performance_tuning.sql
-- Database Optimization, Composite Indexes & High-Concurrency Tuning for 300+ Students
-- ==========================================================

-- 1. Optimize Course Catalog & Student Lookups
create index if not exists idx_courses_published_level_sem 
  on courses (status, level, semester) 
  where status = 'published';

create index if not exists idx_courses_slug_published 
  on courses (slug) 
  where status = 'published';

-- 2. Optimize Chapter / Lecture Hierarchy Lookups
create index if not exists idx_chapters_course_pos_status 
  on chapters (course_id, position) 
  where status = 'published';

-- 3. Optimize Topic and Doctor Notes Lookups
create index if not exists idx_topics_chapter_pos 
  on topics (chapter_id, position);

create index if not exists idx_topics_importance 
  on topics (chapter_id, importance desc);

-- 4. Optimize Educational Resources & Media
create index if not exists idx_resources_topic_type 
  on resources (topic_id, type);

-- 5. Optimize Questions & Quiz Bank
create index if not exists idx_questions_topic_difficulty 
  on questions (topic_id, difficulty);

-- 6. Optimize Student Notes Widget (High frequency concurrent reads/writes)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'student_notes') then
    create index if not exists idx_student_notes_user_updated 
      on student_notes (user_id, updated_at desc);
    create index if not exists idx_student_notes_user_course 
      on student_notes (user_id, course_code);
  end if;
end $$;

-- 7. Optimize Real-time Notifications Bell & Reads
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'notifications') then
    create index if not exists idx_notifications_created_at 
      on notifications (created_at desc);
    create index if not exists idx_notifications_target 
      on notifications (target_type, target_level, target_user_id);
  end if;

  if exists (select 1 from information_schema.tables where table_name = 'user_notification_reads') then
    create index if not exists idx_user_notification_reads_user 
      on user_notification_reads (user_id, read_at desc);
  end if;
end $$;

-- 8. Optimize User Profile Role & Academic Level Lookups
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'profiles') then
    create index if not exists idx_profiles_role_id 
      on profiles (id, role);
    create index if not exists idx_profiles_level 
      on profiles (level);
  end if;
end $$;

-- 9. Analyze query plans for instant execution
analyze courses;
analyze chapters;
analyze topics;
analyze resources;
