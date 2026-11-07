-- ==========================================================
-- 0014_performance_audit_indexes.sql
-- Performance Audit: Database Indexing & Query Plan Optimization
-- ==========================================================

-- 1. Optimize Course lookup by code & slug
create index if not exists idx_courses_code 
  on courses (code);

create index if not exists idx_courses_slug_code 
  on courses (slug, code);

-- 2. Optimize Student Notes Widget multi-column sort
-- Query: .eq("user_id", user.id).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false })
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'student_notes') then
    create index if not exists idx_student_notes_user_pinned_updated 
      on student_notes (user_id, is_pinned desc, updated_at desc);
  end if;
end $$;

-- 3. Optimize Admin Members pagination & sorting
-- Query: .from("profiles").select(...).order("created_at", { ascending: false }).order("id", { ascending: false })
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'profiles') then
    create index if not exists idx_profiles_created_at_id 
      on profiles (created_at desc, id desc);
  end if;
end $$;

-- 4. Optimize Payment Requests pagination & review
-- Query: .from("payment_requests").select(...).order("created_at", { ascending: false }).order("id", { ascending: false })
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'payment_requests') then
    create index if not exists idx_payment_requests_created_at_id 
      on payment_requests (created_at desc, id desc);
  end if;
end $$;

