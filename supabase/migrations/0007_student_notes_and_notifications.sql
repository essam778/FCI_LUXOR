-- ==========================================================
-- 0007_student_notes_and_notifications.sql
-- جدول الملاحظات السحابية للطلاب وتحديثات الإشعارات والأمان
-- ==========================================================

-- 1. جدول ملاحظات الطلاب السحابية (Student Notes)
create table if not exists student_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  course_code text,
  color text default 'emerald',
  is_pinned boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. تفعيل نظام حماية البيانات (Row Level Security) على جدول الملاحظات
alter table student_notes enable row level security;

-- سياسة الأمان: كل طالب يدير ويقرأ ويعدل ملاحظاته الشخصية فقط
drop policy if exists "users manage own student_notes" on student_notes;
create policy "users manage own student_notes"
  on student_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. جدول تتبع قراءة الإشعارات لكل مستخدم (User Notification Reads)
create table if not exists user_notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references notifications(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table user_notification_reads enable row level security;

drop policy if exists "users manage own notification reads" on user_notification_reads;
create policy "users manage own notification reads"
  on user_notification_reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. إتاحة البث الفوري Realtime للجداول
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'student_notes'
  ) then
    alter publication supabase_realtime add table student_notes;
  end if;
end;
$$;
