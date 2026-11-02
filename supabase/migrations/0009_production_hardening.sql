-- ==========================================================
-- 0009_production_hardening.sql
-- Production Hardening, Avatars Storage & Curriculum Optimization
-- ==========================================================

-- 1. Create Avatars Storage Bucket in Supabase Storage if storage schema is available
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB max
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  on conflict (id) do update set
    public = true,
    file_size_limit = 2097152;
exception when others then
  null;
end $$;

-- 2. Storage RLS Policies for Avatars
do $$
begin
  create policy "Public avatars read"
    on storage.objects for select
    using (bucket_id = 'avatars');
exception when others then
  null;
end $$;

do $$
begin
  create policy "Authenticated users can upload avatar"
    on storage.objects for insert
    with check (
      bucket_id = 'avatars' and
      auth.role() = 'authenticated'
    );
exception when others then
  null;
end $$;

do $$
begin
  create policy "Users can update own avatar"
    on storage.objects for update
    using (
      bucket_id = 'avatars' and
      auth.role() = 'authenticated'
    );
exception when others then
  null;
end $$;

-- 3. Helpful performance indexes for Course & Lecture trees
create index if not exists idx_courses_slug on courses (slug);
create index if not exists idx_courses_level_semester on courses (level, semester);
create index if not exists idx_chapters_course_position on chapters (course_id, position);
create index if not exists idx_topics_chapter_position on topics (chapter_id, position);
create index if not exists idx_resources_topic on resources (topic_id);
create index if not exists idx_questions_topic on questions (topic_id);

