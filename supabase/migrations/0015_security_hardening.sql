-- ==========================================================
-- 0015_security_hardening.sql
-- سد الثغرات الأمنية وتشديد سياسات الوصول (RLS) والتخزين السحابي
-- ==========================================================

-- 1. تأمين باكت إيصالات الدفع (payment-receipts)
-- تحويل السلة إلى خاصة (Private) لمنع تسريب بيانات وأرقام هواتف الطلاب
update storage.buckets
set public = false
where id = 'payment-receipts';

-- حذف سياسة القراءة العامة القديمة
drop policy if exists "Public payment receipts read" on storage.objects;

-- سياسة قراءة آمنة: صاحب الإيصال أو المشرف فقط من يحق له عرض وتحميل الإيصال
create policy "Users and admins can view payment receipts"
  on storage.objects for select
  using (
    bucket_id = 'payment-receipts' and (
      is_editor() or
      name like 'receipt-' || auth.uid()::text || '-%'
    )
  );

-- سياسة رفع الإيصالات: يرفع المستخدم إيصاله الخاص به حصراً
drop policy if exists "Authenticated users can upload payment receipts" on storage.objects;
create policy "Authenticated users can upload payment receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-receipts' and
    auth.role() = 'authenticated' and
    name like 'receipt-' || auth.uid()::text || '-%'
  );


-- 2. تأمين باكت أغلفة المقررات (course-covers)
-- قصر صلاحيات الرفع، التعديل، والحذف على المشرفين فقط (منع الطلاب من تشويه المنصة)
drop policy if exists "Admins can upload course covers" on storage.objects;
create policy "Admins can upload course covers"
  on storage.objects for insert
  with check (
    bucket_id = 'course-covers' and
    is_editor()
  );

drop policy if exists "Admins can update course covers" on storage.objects;
create policy "Admins can update course covers"
  on storage.objects for update
  using (
    bucket_id = 'course-covers' and
    is_editor()
  )
  with check (
    bucket_id = 'course-covers' and
    is_editor()
  );

drop policy if exists "Admins can delete course covers" on storage.objects;
create policy "Admins can delete course covers"
  on storage.objects for delete
  using (
    bucket_id = 'course-covers' and
    is_editor()
  );


-- 3. تأمين باكت الصور الشخصية (avatars)
-- منع تعديل صور الأفاتار الخاصة بالغير
drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and (
      name like 'avatar-' || auth.uid()::text || '-%' or
      name = auth.uid()::text or
      is_editor()
    )
  );


-- 4. تأمين جدول الموارد والمحاضرات (resources) وحماية جدار الدفع
-- منع تحميل الفيديوهات والسلايدات مباشرة من قاعدة البيانات دون اشتراك مفعل
drop policy if exists "read resources" on resources;
create policy "read resources"
  on resources for select
  using (
    is_editor() or
    exists (
      select 1 from profiles
      where id = auth.uid() and subscription_status in ('active', 'lifetime')
    ) or
    exists (
      select 1 from topics t
      join chapters ch on ch.id = t.chapter_id
      join courses c on c.id = ch.course_id
      where t.id = resources.topic_id and (c.slug ilike '%elec%' or c.code ilike '%elec%')
    )
  );
