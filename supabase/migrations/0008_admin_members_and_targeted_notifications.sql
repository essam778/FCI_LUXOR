-- ==========================================================
-- 0008_admin_members_and_targeted_notifications.sql
-- دعم إدارة الأعضاء المتقدمة والإشعارات الموجهة وسجل الإشعارات
-- ==========================================================

-- 1. إضافة حقول البريد والحالة إلى جدول profiles إن لم تكن موجودة
alter table profiles add column if not exists email text;
alter table profiles add column if not exists status text default 'active';

-- تحديث دالة تسجيل المستخدم الجديد لتشمل البريد الإلكتروني
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, email, role, level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    new.email,
    'student',
    coalesce((new.raw_user_meta_data->>'level')::smallint, 1)
  )
  on conflict (id) do update 
    set email = coalesce(excluded.email, profiles.email),
        display_name = coalesce(profiles.display_name, excluded.display_name);
  return new;
end $$;

-- ملء البريد الإلكتروني للحسابات الحالية من جدول auth.users
do $$
begin
  update profiles p
  set email = u.email
  from auth.users u
  where p.id = u.id and (p.email is null or p.email = '');
exception when others then
  -- تجاهل إذا لم تتوفر الصلاحيات لجدول auth.users مباشرة
  null;
end $$;

-- 2. سياسات RLS لجدول profiles لتمكين الإدارة من جلب وتعديل وحذف جميع الأعضاء
drop policy if exists "own profile read" on profiles;
drop policy if exists "anyone or owner can read profiles" on profiles;
drop policy if exists "editors can view all profiles" on profiles;

create policy "editors can view all profiles"
  on profiles for select
  using (is_editor() or id = auth.uid());

drop policy if exists "editors can update all profiles" on profiles;
create policy "editors can update all profiles"
  on profiles for update
  using (is_editor() or id = auth.uid())
  with check (is_editor() or (id = auth.uid() and role = (select role from profiles where id = auth.uid())));

drop policy if exists "editors can delete profiles" on profiles;
create policy "editors can delete profiles"
  on profiles for delete
  using (is_editor());

-- 3. تحديث جدول notifications لدعم الإشعارات الموجهة والنوع وسجل الإشعارات
alter table notifications add column if not exists target_type text default 'all';
alter table notifications add column if not exists target_user_id uuid references auth.users(id) on delete cascade;
alter table notifications add column if not exists target_user_name text;
alter table notifications add column if not exists target_level smallint;
alter table notifications add column if not exists notification_type text default 'info';

-- سياسات RLS لجدول notifications
drop policy if exists "anyone can read notifications" on notifications;
create policy "anyone can read notifications"
  on notifications for select
  using (
    is_editor() or
    target_type = 'all' or
    target_type is null or
    (target_type = 'user' and target_user_id = auth.uid()) or
    (target_type = 'level' and target_level in (select level from profiles where id = auth.uid()))
  );

drop policy if exists "editors can delete notifications" on notifications;
create policy "editors can delete notifications"
  on notifications for delete
  using (is_editor());

drop policy if exists "editors can update notifications" on notifications;
create policy "editors can update notifications"
  on notifications for update
  using (is_editor())
  with check (is_editor());
