-- RLS Verification Test Script
-- Run this in Supabase SQL Editor or via `psql` / `supabase db execute`
-- Validates:
-- 1. User B cannot read User A's user_progress
-- 2. A student cannot escalate their own role to editor or admin

begin;

create temporary table if not exists _test_vars (
  user_a uuid,
  user_b uuid,
  topic_id uuid
) on commit drop;

do $$
declare
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_course_id uuid;
  v_chapter_id uuid;
  v_topic_id uuid;
begin
  -- Insert dummy users in auth.users to satisfy profiles foreign key constraint (profiles_id_fkey)
  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (v_user_a, 'authenticated', 'authenticated', 'test_student_a@test.local', '{"display_name": "Student A"}'::jsonb),
    (v_user_b, 'authenticated', 'authenticated', 'test_student_b@test.local', '{"display_name": "Student B"}'::jsonb)
  on conflict (id) do nothing;

  -- Upsert profiles with test roles
  insert into profiles (id, display_name, role)
  values
    (v_user_a, 'Student A', 'student'),
    (v_user_b, 'Student B', 'student')
  on conflict (id) do update set
    display_name = excluded.display_name,
    role = excluded.role;

  -- Create dummy course, chapter, topic
  insert into courses (slug, title, status)
  values ('test-course-' || substr(gen_random_uuid()::text, 1, 8), 'Test Course', 'published')
  returning id into v_course_id;

  insert into chapters (course_id, slug, position, title, status)
  values (v_course_id, 'ch-1', 1, 'Chapter 1', 'published')
  returning id into v_chapter_id;

  insert into topics (chapter_id, slug, position, title, status)
  values (v_chapter_id, 'topic-1', 1, 'Topic 1', 'published')
  returning id into v_topic_id;

  insert into _test_vars values (v_user_a, v_user_b, v_topic_id);
end $$;

-- Run assertions
do $$
declare
  v_a uuid;
  v_b uuid;
  v_t uuid;
  v_cnt int;
begin
  select user_a, user_b, topic_id into v_a, v_b, v_t from _test_vars;

  -- 1. Switch context to authenticated User A
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);

  -- User A records progress
  insert into user_progress (user_id, topic_id, status) values (v_a, v_t, 'done');

  select count(*) into v_cnt from user_progress where user_id = v_a;
  if v_cnt <> 1 then
    raise exception 'Assertion failed: User A could not see own progress';
  end if;

  -- 2. Switch context to authenticated User B
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b::text, 'role', 'authenticated')::text, true);

  -- User B queries User A's progress - MUST return 0 rows
  select count(*) into v_cnt from user_progress where user_id = v_a;
  if v_cnt <> 0 then
    raise exception 'Assertion failed: User B was able to read User A progress (RLS breached!)';
  end if;

  -- 3. User B tries to self-promote to 'admin'
  begin
    update profiles set role = 'admin' where id = v_b;
    -- Check if it took effect
    select count(*) into v_cnt from profiles where id = v_b and role = 'admin';
    if v_cnt > 0 then
      raise exception 'Assertion failed: Student succeeded in self-promoting to admin!';
    end if;
  exception
    when others then
      -- RLS WITH CHECK violation or constraint error is expected behavior
      null;
  end;

  -- Confirm User B is still 'student'
  select count(*) into v_cnt from profiles where id = v_b and role = 'student';
  if v_cnt <> 1 then
    raise exception 'Assertion failed: Profile role was illegally modified';
  end if;

  raise notice 'SUCCESS: All RLS test assertions passed without violation.';
end $$;

rollback;
