-- ==========================================================
-- 0006_avatars_and_notifications.sql
-- جدول تخزين صور الطلاب والمستخدمين وجدول الإشعارات العامة
-- ==========================================================

-- 1. التأكد من وجود عمود avatar_url في جدول profiles
alter table profiles add column if not exists avatar_url text;

-- 2. إنشاء جدول مخصص لتخزين صور الطلاب المرفوعة
create table if not exists user_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  image_data text not null,       -- يدعم حفظ الصورة المشفرة Data URL أو رابط سحابي
  file_name text,
  mime_type text default 'image/jpeg',
  size_bytes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. تفعيل نظام حماية البيانات (Row Level Security) على جدول الصور
alter table user_avatars enable row level security;

-- السماح للجميع بقراءة الصور الشخصية (لكي تظهر في ملفات الطلاب والشروحات)
drop policy if exists "anyone can view avatars" on user_avatars;
create policy "anyone can view avatars"
  on user_avatars for select
  using (true);

-- السماح للطالب فقط برفع صورته الشخصية
drop policy if exists "users can insert their own avatar" on user_avatars;
create policy "users can insert their own avatar"
  on user_avatars for insert
  with check (auth.uid() = user_id);

-- السماح للطالب فقط بتحديث صورته الشخصية
drop policy if exists "users can update their own avatar" on user_avatars;
create policy "users can update their own avatar"
  on user_avatars for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- السماح للطالب بحذف صورته الشخصية
drop policy if exists "users can delete their own avatar" on user_avatars;
create policy "users can delete their own avatar"
  on user_avatars for delete
  using (auth.uid() = user_id);

-- 4. مزامنة تلقائية: عند تحديث الصورة يتم تحديث avatar_url في جدول profiles
create or replace function sync_user_avatar()
returns trigger language plpgsql security definer as $$
begin
  update profiles
  set avatar_url = new.image_data
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_user_avatar_sync on user_avatars;
create trigger on_user_avatar_sync
  after insert or update on user_avatars
  for each row execute function sync_user_avatar();

-- 5. جدول الإشعارات العامة للمنصة
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  link text default '/courses',
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

-- السماح للجميع بقراءة الإشعارات
drop policy if exists "anyone can read notifications" on notifications;
create policy "anyone can read notifications"
  on notifications for select
  using (true);

-- السماح للمشرفين والمديرين فقط ببث ونشر الإشعارات
drop policy if exists "editors can insert notifications" on notifications;
create policy "editors can insert notifications"
  on notifications for insert
  with check (is_editor());

-- السماح للمشرفين بحذف الإشعارات
drop policy if exists "editors can delete notifications" on notifications;
create policy "editors can delete notifications"
  on notifications for delete
  using (is_editor());

