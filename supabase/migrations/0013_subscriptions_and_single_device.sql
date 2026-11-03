-- ==========================================================
-- 0013_subscriptions_and_single_device.sql
-- نظام الاشتراكات والمدفوعات (فودافون كاش / انستا باي) + تأمين جهاز واحد للحساب
-- ==========================================================

-- 1. إضافة حقول الاشتراك وتأمين الجلسة في جدول profiles
alter table profiles add column if not exists subscription_status text default 'unpaid';
alter table profiles add column if not exists active_session_token text;
alter table profiles add column if not exists last_active_at timestamptz default now();

-- 2. إنشاء جدول طلبات الدفع والتحويلات البنكية / المحافظ الإلكترونية
create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_method text not null check (payment_method in ('vodafone_cash', 'instapay')),
  sender_phone text not null,
  reference_number text not null,
  amount numeric not null default 30,
  screenshot_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

-- فهارس للبحث السريع والأداء العالي
create index if not exists idx_payment_requests_user on payment_requests(user_id, created_at desc);
create index if not exists idx_payment_requests_status on payment_requests(status, created_at desc);
create index if not exists idx_profiles_subscription on profiles(subscription_status);
create index if not exists idx_profiles_session on profiles(id, active_session_token);

-- 3. تفعيل الحماية RLS لجدول طلبات الدفع
alter table payment_requests enable row level security;

-- سياسات RLS
do $$
begin
  drop policy if exists "users can read own payment requests" on payment_requests;
  create policy "users can read own payment requests"
    on payment_requests for select
    using (auth.uid() = user_id or is_editor());

  drop policy if exists "users can insert own payment requests" on payment_requests;
  create policy "users can insert own payment requests"
    on payment_requests for insert
    with check (auth.uid() = user_id);

  drop policy if exists "editors can update payment requests" on payment_requests;
  create policy "editors can update payment requests"
    on payment_requests for update
    using (is_editor());

  drop policy if exists "editors can delete payment requests" on payment_requests;
  create policy "editors can delete payment requests"
    on payment_requests for delete
    using (is_editor());
exception when others then
  null;
end $$;

-- 4. إنشاء سلة تخزين إيصالات الدفع في Supabase Storage
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'payment-receipts',
    'payment-receipts',
    true,
    10485760, -- 10MB كحد أقصى لكل صورة إيصال
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  )
  on conflict (id) do update set
    public = true,
    file_size_limit = 10485760;
exception when others then
  null;
end $$;

-- سياسات سلة تخزين إيصالات الدفع
do $$
begin
  drop policy if exists "Public payment receipts read" on storage.objects;
  create policy "Public payment receipts read"
    on storage.objects for select
    using (bucket_id = 'payment-receipts');

  drop policy if exists "Authenticated users can upload payment receipts" on storage.objects;
  create policy "Authenticated users can upload payment receipts"
    on storage.objects for insert
    with check (bucket_id = 'payment-receipts' and auth.role() = 'authenticated');
exception when others then
  null;
end $$;

