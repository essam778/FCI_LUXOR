# FCI Study Platform: Technical Spec and Implementation Plan

> **Audience:** an AI coding agent (and the human developer supervising it).
> **Goal:** build a web platform that helps Faculty of Computers & Information (CS/IT) students study their courses: structured chapters, mind maps, linked resources, solved questions, quizzes, spaced repetition, and study plans.
> **Language of the product UI:** Arabic (RTL), with English technical terms and code preserved as LTR.

---

## 0. How the agent must work

1. Read this whole file before writing code.
2. Work **phase by phase** (Section 12). Do not start a phase before the previous phase's acceptance criteria pass.
3. After every phase run: `pnpm typecheck && pnpm lint && pnpm build`. Fix failures before continuing.
4. Never commit secrets. Use `.env.local` and provide `.env.example`.
5. Prefer simple, boring solutions. No new dependency without a one-line justification in the PR/commit message.
6. If a requirement is ambiguous, pick the simplest interpretation, note the assumption in `docs/DECISIONS.md`, and continue. Ask the human only for blockers (missing credentials, legal questions).
7. All user-facing strings are Arabic. All code, comments, commit messages, and docs are English.
8. Never expose the Supabase `service_role` key to the browser.

---

## 1. Product overview

### 1.1 Problem
Students have raw material (YouTube lectures, books, doctors' slides) but lack **structure, solutions, and a study method**. The platform adds that layer.

### 1.2 Content hierarchy
```
Course → Chapter → Topic → (Resources, Questions, Flashcards, Mind map)
```
(Faculty/level/semester are attributes of a course, not separate tables in the MVP.)

Each **Topic** contains:
- Short summary and explanation (Markdown)
- Mind map (Markdown outline rendered by Markmap)
- Linked resources (YouTube with start time, book pages, slide PDF pages, external links)
- Questions with solutions and explanations (MCQ, written, code-trace)
- "Doctor's favorite points" (a flagged list of frequently examined points)
- Flashcards

### 1.3 Non-goals for the MVP
No AI assistant, no comments/community, no payments, no native mobile app, no uploading of copyrighted books or slides. Link to or summarize them instead.

---

## 2. Feature roadmap

| Phase | Features |
|---|---|
| **MVP (P1–P5)** | Auth, browse course/chapter/topic, resources (YouTube/PDF/links), mind maps, question bank with solutions, progress tracking, study plans, dashboard, content import script |
| **V2** | Timed quizzes with weakness analysis, spaced-repetition flashcards, personal notes, full-text search, admin editor UI |
| **V3** | AI assistant using RAG over course content, auto question generation (human-reviewed), community Q&A |

---

## 3. Tech stack (fixed decisions)

| Layer | Choice |
|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript (strict)** |
| Package manager | pnpm |
| Styling | Tailwind CSS v4 + shadcn/ui, logical properties for RTL (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`) |
| Backend | **Supabase**: Postgres, Auth, Storage, RLS, RPC functions, Edge Functions (later) |
| Supabase client | `@supabase/supabase-js` + `@supabase/ssr` |
| Validation | `zod` |
| Client state/data | Server Components for reads; Server Actions for writes; TanStack Query only where interactivity needs it (quiz, flashcards) |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` (or `shiki`) |
| Mind map | `markmap-lib` + `markmap-view` (client component) |
| PDF | `react-pdf` (pdf.js) |
| Video | YouTube IFrame Player API |
| Fonts | Cairo (UI), JetBrains Mono (code) via `next/font` |
| Testing | Vitest (unit), Playwright (a few e2e smoke tests) |
| Hosting | Vercel (frontend), Supabase (backend) |
| Analytics | PostHog or Plausible (optional, phase 5) |

---

## 4. Repository structure

```
/
├─ content/                      # source of truth for course content (git-tracked)
│  └─ data-structures/
│     ├─ course.md               # frontmatter: title, code, level, semester, description
│     ├─ 01-intro/
│     │  ├─ chapter.md           # frontmatter: title, difficulty, summary
│     │  ├─ 01-arrays.md         # topic: frontmatter + body + mindmap + resources + questions
│     │  └─ questions/01-arrays.json
│     └─ ...
├─ scripts/
│  └─ import-content.ts          # upserts /content into Supabase (idempotent)
├─ supabase/
│  ├─ migrations/                # SQL migrations (Section 6)
│  └─ seed.sql
├─ src/
│  ├─ app/                       # routes (Section 8)
│  ├─ components/
│  │  ├─ ui/                     # shadcn components
│  │  ├─ layout/                 # Navbar, Sidebar, Footer, ThemeToggle
│  │  ├─ course/                 # CourseCard, ChapterList, TopicNav, ProgressRing
│  │  ├─ topic/                  # MarkdownView, MindMap, ResourceList, YouTubePlayer, PdfViewer
│  │  ├─ practice/               # QuestionCard, McqOptions, SolutionReveal, QuizRunner
│  │  ├─ review/                 # FlashcardDeck
│  │  └─ dashboard/              # StatCard, WeakTopicsList, StreakBadge
│  ├─ lib/
│  │  ├─ supabase/{client,server,middleware}.ts
│  │  ├─ queries/                # typed data-access functions (one file per domain)
│  │  ├─ actions/                # server actions
│  │  ├─ validators/             # zod schemas
│  │  └─ utils.ts
│  ├─ types/database.ts          # generated by `supabase gen types typescript`
│  └─ middleware.ts              # session refresh + route protection
├─ docs/DECISIONS.md
├─ .env.example
└─ README.md
```

---

## 5. Content authoring format (used by the import script)

### 5.1 `course.md`
```md
---
slug: data-structures
code: CS201
title: هياكل البيانات
level: 2
semester: 1
description: وصف مختصر للمادة
status: published
---
```

### 5.2 Topic file (`01-arrays.md`)
```md
---
slug: arrays
title: المصفوفات
importance: 5            # 1-5, based on how often it appears in exams
status: published        # draft | reviewed | published
resources:
  - type: video
    title: شرح المصفوفات
    url: https://www.youtube.com/watch?v=XXXX
    start_time: 120      # seconds
    source_name: اسم القناة
  - type: slide
    title: سلايدات الدكتور - المحاضرة 2
    url: https://...
    page_from: 5
    page_to: 18
  - type: book
    title: Introduction to Algorithms
    page_from: 10
    page_to: 25
doctor_favorites:
  - الفرق بين الـ static والـ dynamic array
  - تعقيد الإدراج في المنتصف
---

## الشرح
(Markdown content shown on the topic page)

<!-- mindmap -->
# المصفوفات
## التعريف
## العمليات
### Insert
### Delete
## التعقيد الزمني
<!-- /mindmap -->
```
The import script splits the body into `content_md` and `mindmap_md` using the `<!-- mindmap -->` markers.

### 5.3 Questions file (`questions/01-arrays.json`)
```json
[
  {
    "type": "mcq",
    "body": "ما تعقيد الوصول لعنصر في مصفوفة بالـ index؟",
    "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
    "answer": "0",
    "explanation_md": "الوصول المباشر عبر الـ index ثابت الزمن.",
    "difficulty": 1,
    "source_year": 2023
  }
]
```
Question types: `mcq` (answer = option index), `written` (answer = model answer in Markdown), `code_trace` (body contains code block; answer = expected output + explanation).

### 5.4 Import script rules
- Idempotent: upsert by `(course.slug, chapter.slug, topic.slug)`.
- Validate every file with zod; fail loudly with file path and field.
- Only import items with `status` ≥ the target (`--include-draft` flag for local dev).
- Use the `service_role` key from env; script runs locally or in CI only.

---

## 6. Database design (Supabase / Postgres)

Create as ordered migrations in `supabase/migrations/`.

### 6.1 Enums and extensions
```sql
create extension if not exists pgcrypto;

create type user_role       as enum ('student','editor','admin');
create type content_status  as enum ('draft','reviewed','published');
create type resource_type   as enum ('video','book','slide','link');
create type question_type   as enum ('mcq','written','code_trace');
create type progress_status as enum ('not_started','in_progress','done');
```

### 6.2 Tables
```sql
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
```

### 6.3 Helpers and triggers
```sql
create or replace function is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('editor','admin')
  );
$$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
```

### 6.4 Row Level Security (enable on EVERY table)
```sql
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
```

### 6.5 RPC functions
```sql
-- Course tree with the caller's progress (one round trip)
create or replace function get_course_tree(p_course_slug text)
returns jsonb language sql stable security invoker as $$
  select jsonb_build_object(
    'course', to_jsonb(c),
    'chapters', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ch.id, 'slug', ch.slug, 'title', ch.title, 'difficulty', ch.difficulty,
          'topics', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', t.id, 'slug', t.slug, 'title', t.title, 'importance', t.importance,
              'status', coalesce(up.status, 'not_started')
            ) order by t.position)
            from topics t
            left join user_progress up on up.topic_id = t.id and up.user_id = auth.uid()
            where t.chapter_id = ch.id
          ), '[]'::jsonb)
        ) order by ch.position)
      from chapters ch where ch.course_id = c.id
    ), '[]'::jsonb)
  )
  from courses c where c.slug = p_course_slug;
$$;

-- SM-2 (simplified) spaced repetition review. p_quality: 0..5
create or replace function review_flashcard(p_flashcard_id uuid, p_quality int)
returns void language plpgsql security invoker as $$
declare r user_flashcards%rowtype; new_ease numeric; new_interval int; new_reps int;
begin
  insert into user_flashcards (user_id, flashcard_id)
  values (auth.uid(), p_flashcard_id) on conflict do nothing;

  select * into r from user_flashcards
  where user_id = auth.uid() and flashcard_id = p_flashcard_id;

  if p_quality < 3 then
    new_reps := 0; new_interval := 1; new_ease := greatest(1.3, r.ease - 0.2);
  else
    new_reps := r.repetitions + 1;
    new_ease := greatest(1.3, r.ease + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02)));
    new_interval := case new_reps when 1 then 1 when 2 then 6
                    else round(r.interval_days * new_ease)::int end;
  end if;

  update user_flashcards
  set repetitions = new_reps, ease = new_ease, interval_days = new_interval,
      next_review = current_date + new_interval
  where user_id = auth.uid() and flashcard_id = p_flashcard_id;
end $$;

-- Quiz: build attempt, grade MCQs server-side, compute score
create or replace function start_quiz(p_course_id uuid, p_count int default 10)
returns uuid language plpgsql security invoker as $$
declare v_id uuid; v_ids uuid[];
begin
  select array_agg(q.id) into v_ids from (
    select q.id from questions q
    join topics t on t.id = q.topic_id
    join chapters ch on ch.id = t.chapter_id
    where ch.course_id = p_course_id and q.status = 'published'
    order by random() limit p_count
  ) q;
  insert into quiz_attempts (user_id, course_id, question_ids)
  values (auth.uid(), p_course_id, v_ids) returning id into v_id;
  return v_id;
end $$;

create or replace function finish_quiz(p_attempt_id uuid, p_answers jsonb)
returns numeric language plpgsql security invoker as $$
declare v_score numeric; v_total int;
begin
  select count(*) into v_total from quiz_attempts a, unnest(a.question_ids) qid
  where a.id = p_attempt_id and a.user_id = auth.uid();

  select count(*) filter (where p_answers->>(q.id::text) = q.answer)::numeric / nullif(v_total,0) * 100
  into v_score
  from quiz_attempts a
  join questions q on q.id = any(a.question_ids)
  where a.id = p_attempt_id and a.user_id = auth.uid() and q.type = 'mcq';

  update quiz_attempts set answers = p_answers, score = v_score, finished_at = now()
  where id = p_attempt_id and user_id = auth.uid();
  return v_score;
end $$;

-- Search
create or replace function search_topics(p_query text)
returns table (topic_id uuid, topic_slug text, title text, chapter_slug text, course_slug text)
language sql stable security invoker as $$
  select t.id, t.slug, t.title, ch.slug, c.slug
  from topics t join chapters ch on ch.id = t.chapter_id join courses c on c.id = ch.course_id
  where t.fts @@ plainto_tsquery('simple', p_query) and t.status = 'published'
  limit 20;
$$;
```

> Note: for the MVP, `questions.answer` is readable by students (study mode). For an exam-style mode in V2, move answers to a separate table readable only via RPC after submission.

### 6.6 Storage
Bucket `public-assets` (public read) for images used inside Markdown. Editor-only write policy. **Do not upload copyrighted books or slides.**

---

## 7. Backend plan (what to build, in order)

### 7.1 Setup
1. Create Supabase project. Enable Email auth (and Google OAuth if the human provides credentials).
2. Install Supabase CLI. `supabase init`, `supabase link`.
3. Add migrations from Section 6 as separate files:
   `0001_enums.sql`, `0002_tables.sql`, `0003_helpers_triggers.sql`, `0004_rls.sql`, `0005_rpc.sql`.
4. `supabase db push`, then `supabase gen types typescript --linked > src/types/database.ts`.

### 7.2 Data-access layer (`src/lib/queries/*`)
Each function is typed, uses the server Supabase client, and returns plain objects.

| File | Functions |
|---|---|
| `courses.ts` | `listCourses(filters)`, `getCourseTree(slug)` (calls RPC) |
| `topics.ts` | `getTopic(courseSlug, chapterSlug, topicSlug)` (with resources, flashcards, question count, prev/next topic) |
| `questions.ts` | `listQuestionsByTopic(topicId)`, `listQuestionsByCourse(courseId, filters)` |
| `progress.ts` | `getCourseProgress(courseId)`, `getWeakTopics(courseId)` |
| `plans.ts` | `listPlans(courseId)` |
| `search.ts` | `searchTopics(q)` |
| `flashcards.ts` | `getDueFlashcards(limit)` |

### 7.3 Server Actions (`src/lib/actions/*`)
All validate input with zod and check `auth.getUser()` first.

| Action | Behavior |
|---|---|
| `setTopicStatus(topicId, status)` | upsert `user_progress`, set `last_reviewed` |
| `setTopicConfidence(topicId, 1..5)` | upsert confidence |
| `startQuiz(courseId, count)` | RPC `start_quiz`, redirect to `/quiz/[id]` |
| `submitQuiz(attemptId, answers)` | RPC `finish_quiz`, redirect to result |
| `reviewFlashcard(id, quality)` | RPC `review_flashcard` |
| `saveNote(topicId, body)` | upsert `notes` |
| `reportContent({questionId?, topicId?, message})` | insert `content_reports`, rate-limited (max 5 per user per hour) |

### 7.4 Weak-topic logic
For a course, a topic is "weak" when any of: confidence ≤ 2; last quiz accuracy on its questions < 60%; or status is not `done` while importance ≥ 4. Implement as a SQL view `v_weak_topics` joining `user_progress`, `quiz_attempts`, `questions`. Dashboard shows the top 5.

### 7.5 Security checklist
- RLS enabled on all tables; test with two different users that neither can read the other's rows.
- Role escalation blocked (policy in 6.4); verify by trying to update own `role`.
- Server Actions re-check auth and ownership.
- Rate-limit `reportContent` and auth endpoints (Supabase built-in + simple counter).
- Sanitize Markdown rendering (no raw HTML, or use `rehype-sanitize`).
- CSP headers in `next.config.ts` allowing `youtube.com` frames and Supabase domain only.

### 7.6 Later (V3): AI
- Enable `pgvector`, table `topic_chunks(topic_id, content, embedding vector(1536))`.
- Edge Function `ask-course` that embeds the question, retrieves top-k chunks, and answers strictly from them with citations to topics. Refuse when no relevant chunk is found.
- AI-generated questions always land as `status='draft'` and require human review.

---

## 8. Frontend plan

### 8.1 Design principles
- Mobile-first (most students use phones). Test at 360px width.
- RTL by default: `<html lang="ar" dir="rtl">`. Use logical Tailwind classes only. Code blocks, math, and English terms use `dir="ltr"` (`<code>`, `<pre>`, and a `.ltr` utility).
- Calm, high-contrast, readable. Light and dark themes (system default + toggle).
- Fast: Server Components by default, static generation (ISR, `revalidate = 3600`) for public content pages.
- Accessible: semantic HTML, focus rings, keyboard navigation for quizzes/flashcards, WCAG AA contrast.

### 8.2 Design tokens
- Fonts: Cairo (400/600/700) for UI, JetBrains Mono for code.
- Base radius `0.75rem`; spacing scale from Tailwind.
- Colors (CSS variables, shadcn convention): primary = indigo; success = emerald (done); warning = amber (in progress); danger = rose (weak topics).
- Difficulty badge colors: 1–2 green, 3 amber, 4–5 red.

### 8.3 Routes
| Route | Rendering | Purpose |
|---|---|---|
| `/` | static | Landing: value prop, featured courses, CTA |
| `/courses` | ISR | Grid of courses, filter by level/semester, search |
| `/courses/[course]` | ISR + client progress | Course page: description, progress ring, chapter accordion, study plans, "Start practice" |
| `/courses/[course]/[chapter]/[topic]` | ISR + client progress | **Main study page** (see 8.4) |
| `/courses/[course]/practice` | dynamic | Question bank with filters (chapter, difficulty, type, year) |
| `/courses/[course]/plans/[plan]` | ISR | Day-by-day study plan with checkboxes |
| `/quiz/[attemptId]` | dynamic, auth | Timed quiz runner |
| `/quiz/[attemptId]/result` | dynamic, auth | Score, per-question review, weak topics |
| `/review` | dynamic, auth | Spaced-repetition flashcards due today |
| `/dashboard` | dynamic, auth | Overview: progress per course, streak, weak topics, due cards |
| `/search?q=` | dynamic | Topic search results |
| `/login`, `/signup`, `/auth/callback` | | Auth |
| `/admin/*` | dynamic, editor only | Content editor (V2) |

### 8.4 The Topic page (most important screen)
Layout (desktop): right sidebar (RTL) with course tree and progress; center content; left sticky panel with tools. On mobile: sidebar becomes a drawer, tools become tabs.

Tabs/sections in order:
1. **Header:** breadcrumb, title, importance stars, status selector (not started / in progress / done), confidence 1–5.
2. **الشرح:** rendered Markdown.
3. **الخريطة الذهنية:** `MindMap` component (Markmap), fullscreen toggle, "download SVG".
4. **أهم النقاط (Doctor's favorites):** highlighted checklist.
5. **المصادر:** `ResourceList` grouped by type. Videos open in an in-page `YouTubePlayer` seeking to `start_time`. Slides/books show title plus page range (and a link). PDF inline viewer only for files the project is allowed to host.
6. **الأسئلة:** `QuestionCard` list. MCQ: select option, "check" shows correct/incorrect + explanation. Written/code-trace: "show solution" reveals the answer. Every card has a "report a mistake" button.
7. **Flashcards:** deck for this topic; "add to my review" button.
8. **ملاحظاتي:** personal notes textarea (autosave debounced 1s, auth required).
9. **Footer nav:** previous/next topic buttons; "mark done and continue".

Unauthenticated users can read everything; interactive saving prompts login via a non-blocking dialog.

### 8.5 Key components (contracts)
```ts
<MarkdownView source: string />                    // sanitized, code highlight, ltr code
<MindMap markdown: string height?: number />       // client-only, dynamic import, ssr:false
<YouTubePlayer videoId: string startTime?: number />
<ResourceList resources: Resource[] />
<QuestionCard question: Question mode: 'practice'|'quiz' onAnswer?: (ans:string)=>void />
<QuizRunner attemptId: string questions: Question[] durationSec?: number />
<FlashcardDeck cards: Flashcard[] onRate: (id:string, q:number)=>void />
<ProgressRing value: number size?: number />
<ChapterAccordion chapters: ChapterWithTopics[] courseSlug: string />
<StudyPlanView plan: StudyPlan courseSlug: string />
<WeakTopicsList items: WeakTopic[] />
```

### 8.6 State and data flow
- Reads: Server Components call `lib/queries/*`.
- Writes: Server Actions from client components with `useTransition` and optimistic UI for status/confidence.
- Progress overlay: public pages are statically cached, so fetch the user's progress client-side after hydration (small `/api/progress?course=` route handler or a client Supabase call) and merge into the UI. Do not make public pages dynamic just for progress.
- Auth: `middleware.ts` refreshes the session and protects `/dashboard`, `/review`, `/quiz/*`, `/admin/*`.

### 8.7 Error and empty states
Every list has: loading skeleton, empty state with explanation, and error state with retry. Topics without a mind map or questions hide that tab instead of showing an empty one.

### 8.8 SEO
Server-rendered titles and descriptions per course/topic, `generateMetadata`, `sitemap.ts`, `robots.ts`, JSON-LD (`Course`/`LearningResource`), Open Graph images.

---

## 9. Quiz and spaced-repetition behavior

**Quiz**
- Start from a course page or practice page: choose count (10/20/30) and optional chapters.
- Timer default 1 minute per question; autosave answers locally every change; submit on timeout.
- Result page: score, per-question correctness with explanation, and chapters ranked by accuracy with links to the weak topics.

**Flashcards**
- `/review` pulls cards where `next_review <= today`, max 30 per session.
- Rating buttons: Again (0), Hard (3), Good (4), Easy (5) mapped to `review_flashcard`.
- Keyboard: space = flip, 1–4 = rate.

---

## 10. Study plans
Plans are authored content (`study_plans.plan_json`), for example "7 days before the exam", "30 days", "exam-eve revision". The plan page shows one card per day with its topics (linked), tips, and a per-day checkbox stored in `user_progress` by marking its topics as done. Provide at least one plan per published course.

---

## 11. Quality, testing, and DevOps

**Tests**
- Unit (Vitest): zod validators, import-script parsing, SM-2 mapping, weak-topic scoring.
- DB tests: SQL assertions (pgTAP or a script) that RLS blocks cross-user reads and role self-promotion.
- E2E (Playwright, smoke): browse → open topic → answer MCQ → sign up → mark done → dashboard shows progress.

**CI (GitHub Actions)**: install → typecheck → lint → unit tests → build. Block merges on failure.

**Environments**: `local` (Supabase CLI), `preview` (Vercel preview + staging Supabase project), `production`.

**Monitoring**: Vercel Analytics + Sentry (optional). PostHog events: `topic_viewed`, `quiz_started`, `quiz_finished`, `report_submitted`.

**Env vars**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # scripts only, never exposed to the client
NEXT_PUBLIC_SITE_URL=
```

---

## 12. Implementation phases with acceptance criteria

### Phase 1: Foundation (≈ 1 week)
**Tasks**
- [ ] Scaffold Next.js + TS strict + Tailwind + shadcn/ui; Arabic RTL layout, Cairo font, theme toggle.
- [ ] Supabase project, migrations 0001–0005, generated types.
- [ ] Auth: signup, login, logout, `/auth/callback`, middleware, profile auto-creation.
- [ ] Base layout: Navbar, Footer, mobile drawer.
- [ ] `.env.example`, README with setup steps, `docs/DECISIONS.md`.

**Acceptance:** a new user can sign up/login; a row appears in `profiles`; RLS test shows user B cannot read user A's data; `pnpm build` passes.

### Phase 2: Content pipeline and browsing (≈ 1–2 weeks)
**Tasks**
- [ ] Implement `scripts/import-content.ts` (Section 5) with zod validation.
- [ ] Seed one sample course with 2 chapters, 5 topics, resources, 10 questions.
- [ ] Pages: `/courses`, `/courses/[course]`, topic page with Explanation + Resources.
- [ ] `MarkdownView`, `ResourceList`, `YouTubePlayer` (with start time), `ChapterAccordion`.
- [ ] ISR and `generateMetadata`.

**Acceptance:** running the import twice produces no duplicates; the topic page renders Markdown (code LTR), plays a video at the right second, and works at 360px width.

### Phase 3: Mind maps, questions, progress (≈ 1–2 weeks)
**Tasks**
- [ ] `MindMap` (Markmap) with fullscreen and SVG download.
- [ ] `QuestionCard` for the three question types; "report a mistake".
- [ ] Practice page with filters (chapter, difficulty, type, year).
- [ ] Progress: status/confidence server actions with optimistic UI; `ProgressRing` on course page.
- [ ] Prev/next topic navigation and "mark done and continue".

**Acceptance:** progress persists after reload and across devices; MCQ shows correct/incorrect with explanation; reports appear in `content_reports`.

### Phase 4: Plans, dashboard, search (≈ 1 week)
**Tasks**
- [ ] `study_plans` content + `StudyPlanView` with per-day checkboxes.
- [ ] `/dashboard`: course progress, weak topics (view `v_weak_topics`), recent activity.
- [ ] Search page via `search_topics` RPC and navbar search box.

**Acceptance:** dashboard reflects completed topics immediately; searching an Arabic or English term returns relevant topics.

### Phase 5: Hardening and launch (≈ 1 week)
**Tasks**
- [ ] Seed 2 real courses with reviewed content (human-verified solutions).
- [ ] Playwright smoke tests, CI pipeline, security checklist (7.5) verified.
- [ ] SEO (sitemap, OG images), analytics events, error/empty states everywhere.
- [ ] Lighthouse ≥ 90 (performance/accessibility) on topic and course pages.
- [ ] Soft launch with 10–20 students; collect feedback via the report button and a short form.

### V2 backlog (after launch feedback)
Timed quizzes (`start_quiz`/`finish_quiz`), flashcards + `/review`, personal notes, admin editor UI with Markdown preview and draft → reviewed → published workflow, full-text search polish.

### V3 backlog
RAG assistant, AI-drafted questions (human-reviewed), community Q&A, optional freemium plan.

---

## 13. Content rules (for humans and any AI drafting content)

1. Every solution must be verified by a human before `status: published`.
2. Do not copy slides or book text verbatim. Write original summaries and link to the source.
3. Each topic follows the template: objectives, key concepts, worked example, common mistakes, likely exam questions.
4. Tag `source_year` on exam-derived questions and use it to set `importance`.
5. Start with 1–2 high-quality courses (e.g. Data Structures, Databases) before adding more.

---

## 14. Definition of Done (whole MVP)
- All Phase 1–5 acceptance criteria met.
- No table without RLS; no secret in the repo or client bundle.
- Typecheck, lint, tests, and build are green in CI.
- At least 2 courses fully published with reviewed solutions and one study plan each.
- README explains: setup, migrations, importing content, running tests, deploying.
