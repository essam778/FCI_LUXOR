create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  university text,
  level smallint,
  role user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  code text,
  title text not null,
  description text,
  level smallint,
  semester smallint,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  slug text not null,
  position int not null,
  title text not null,
  summary text,
  difficulty smallint check (difficulty between 1 and 5),
  status content_status not null default 'draft',
  unique (course_id, slug)
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  slug text not null,
  position int not null,
  title text not null,
  content_md text,
  mindmap_md text,
  importance smallint check (importance between 1 and 5) default 3,
  doctor_favorites text[] not null default '{}',
  status content_status not null default 'draft',
  fts tsvector generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_md,''))
  ) stored,
  unique (chapter_id, slug)
);
create index topics_fts_idx on topics using gin (fts);

create table resources (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  type resource_type not null,
  title text not null,
  url text,
  start_time int,              -- seconds (video)
  page_from int, page_to int,  -- book/slide
  source_name text,
  position int not null default 0
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  type question_type not null,
  body text not null,
  options jsonb,               -- array of strings for mcq
  answer text not null,
  explanation_md text,
  difficulty smallint default 2 check (difficulty between 1 and 5),
  source_year int,
  status content_status not null default 'draft'
);

create table flashcards (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  front text not null,
  back text not null
);

create table study_plans (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,                -- e.g. "خطة 7 أيام"
  total_days int not null,
  plan_json jsonb not null            -- [{day:1, topic_slugs:[...], tips:"..."}]
);

-- user data
create table user_progress (
  user_id uuid references profiles(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  status progress_status not null default 'not_started',
  confidence smallint check (confidence between 1 and 5),
  last_reviewed timestamptz,
  primary key (user_id, topic_id)
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  question_ids uuid[] not null,
  answers jsonb not null default '{}',
  score numeric,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table user_flashcards (
  user_id uuid references profiles(id) on delete cascade,
  flashcard_id uuid references flashcards(id) on delete cascade,
  next_review date not null default current_date,
  interval_days int not null default 0,
  ease numeric not null default 2.5,
  repetitions int not null default 0,
  primary key (user_id, flashcard_id)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  body text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, topic_id)
);

create table content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  question_id uuid references questions(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
