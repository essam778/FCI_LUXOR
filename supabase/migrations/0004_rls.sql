alter table profiles        enable row level security;
alter table courses         enable row level security;
alter table chapters        enable row level security;
alter table topics          enable row level security;
alter table resources       enable row level security;
alter table questions       enable row level security;
alter table flashcards      enable row level security;
alter table study_plans     enable row level security;
alter table user_progress   enable row level security;
alter table quiz_attempts   enable row level security;
alter table user_flashcards enable row level security;
alter table notes           enable row level security;
alter table content_reports enable row level security;

-- Public content: everyone reads published; editors read/write all
create policy "read published courses"  on courses  for select using (status = 'published' or is_editor());
create policy "read published chapters" on chapters for select using (status = 'published' or is_editor());
create policy "read published topics"   on topics   for select using (status = 'published' or is_editor());
create policy "read published questions" on questions for select using (status = 'published' or is_editor());
create policy "read resources"  on resources  for select using (true);
create policy "read flashcards" on flashcards for select using (true);
create policy "read plans"      on study_plans for select using (true);

create policy "editors write courses"   on courses   for all using (is_editor()) with check (is_editor());
create policy "editors write chapters"  on chapters  for all using (is_editor()) with check (is_editor());
create policy "editors write topics"    on topics    for all using (is_editor()) with check (is_editor());
create policy "editors write resources" on resources for all using (is_editor()) with check (is_editor());
create policy "editors write questions" on questions for all using (is_editor()) with check (is_editor());
create policy "editors write flashcards" on flashcards for all using (is_editor()) with check (is_editor());
create policy "editors write plans"     on study_plans for all using (is_editor()) with check (is_editor());

-- Profiles
create policy "own profile read"   on profiles for select using (id = auth.uid());
create policy "own profile update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid())); -- cannot self-promote

-- User-owned data
create policy "own progress"  on user_progress   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own attempts"  on quiz_attempts   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own cards"     on user_flashcards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notes"     on notes           for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "create report" on content_reports for insert with check (user_id = auth.uid());
create policy "editors read reports" on content_reports for select using (is_editor());
create policy "editors update reports" on content_reports for update using (is_editor());
