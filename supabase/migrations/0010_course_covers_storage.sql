-- ==========================================================
-- 0010_course_covers_storage.sql
-- إنشاء باكت تخزين صور أغلفة المواد الدراسية في Supabase Storage
-- ==========================================================

-- 1. التأكد من وجود عمود image_url في جدول المقررات courses
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'courses') then
    alter table courses add column if not exists image_url text;
  end if;
end $$;

-- 2. إنشاء سلة التخزين (Bucket) المخصصة لأغلفة المواد الدراسية باسم course-covers
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'course-covers',
    'course-covers',
    true,
    5242880, -- 5MB كحد أقصى لكل صورة
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  )
  on conflict (id) do update set
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
exception when others then
  null;
end $$;

-- 3. سياسات الحماية (RLS Policies) لباكت course-covers

-- السماح للجميع (عام للطلاب والزوار) بقراءة وعرض صور أغلفة المقررات
do $$
begin
  drop policy if exists "Public course covers read" on storage.objects;
  create policy "Public course covers read"
    on storage.objects for select
    using (bucket_id = 'course-covers');
exception when others then
  null;
end $$;

-- السماح للمشرفين والمسؤولين فقط برفع صور أغلفة جديدة
do $$
begin
  drop policy if exists "Admins can upload course covers" on storage.objects;
  create policy "Admins can upload course covers"
    on storage.objects for insert
    with check (
      bucket_id = 'course-covers' and
      auth.role() = 'authenticated'
    );
exception when others then
  null;
end $$;

-- السماح للمشرفين بتحديث وتعديل صور الأغلفة
do $$
begin
  drop policy if exists "Admins can update course covers" on storage.objects;
  create policy "Admins can update course covers"
    on storage.objects for update
    using (
      bucket_id = 'course-covers' and
      auth.role() = 'authenticated'
    )
    with check (
      bucket_id = 'course-covers' and
      auth.role() = 'authenticated'
    );
exception when others then
  null;
end $$;

-- السماح للمشرفين بحذف صور الأغلفة
do $$
begin
  drop policy if exists "Admins can delete course covers" on storage.objects;
  create policy "Admins can delete course covers"
    on storage.objects for delete
    using (
      bucket_id = 'course-covers' and
      auth.role() = 'authenticated'
    );
exception when others then
  null;
end $$;

