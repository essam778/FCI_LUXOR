# Phase Prompts for the FCI Study Platform

Companion to `FCI_STUDY_PLATFORM_SPEC.md`. Put both files in the project root, then paste the prompts below into your AI coding agent **one at a time**. Do not paste the next prompt until the current phase is reviewed and its acceptance criteria pass.

## How to use

1. Start a fresh session with the **Kickoff prompt**.
2. Paste **Phase N** prompt. Wait for the agent's report.
3. Run the **Review prompt** (or check manually), fix issues with the **Fix prompt**.
4. Commit. Move to the next phase.
5. If the agent loses context in a new session, paste the **Resume prompt**.

---

## Kickoff prompt (once, at the start)

```
You are a senior full-stack engineer. Read FCI_STUDY_PLATFORM_SPEC.md completely and carefully. It is the single source of truth for this project.

Rules:
- Follow Section 0 ("How the agent must work") exactly.
- Work phase by phase as defined in Section 12. I will tell you which phase to start.
- Do not write code yet. First reply with: (1) a 10-line summary of what we are building, (2) the list of assumptions you are making, (3) any blocking questions (missing credentials, unclear requirements). Keep it short.
```

---

## Phase 1: Foundation

```
Implement Phase 1 (Foundation) from FCI_STUDY_PLATFORM_SPEC.md.

Scope:
- Scaffold Next.js 15 (App Router) + TypeScript strict + Tailwind + shadcn/ui using pnpm.
- Arabic RTL by default (<html lang="ar" dir="rtl">), Cairo font for UI, JetBrains Mono for code, light/dark theme toggle. Use logical Tailwind classes only (ms-/me-/ps-/pe-/text-start).
- Supabase: create the migrations 0001-0005 exactly as in Section 6 (enums, tables, helpers/triggers, RLS, RPC) under supabase/migrations/. Provide the exact CLI commands I must run to link and push them.
- Generate types into src/types/database.ts (give me the command; if you can't run it, create a placeholder and tell me).
- Supabase clients in src/lib/supabase/{client,server,middleware}.ts using @supabase/ssr.
- Auth pages: /login, /signup, /auth/callback, logout. middleware.ts refreshes the session and protects /dashboard, /review, /quiz/*, /admin/*.
- Base layout: Navbar (logo, courses link, search box placeholder, auth state), Footer, mobile drawer.
- .env.example, README (setup steps), docs/DECISIONS.md.

Out of scope: any content pages, quiz, flashcards, admin.

Definition of done:
- A new user can sign up and log in; a profiles row is created automatically.
- Add a SQL test script (supabase/tests/rls.sql or similar) proving: user B cannot read user A's user_progress, and a student cannot update their own role.
- pnpm typecheck && pnpm lint && pnpm build all pass.

When finished, reply with: files created, commands I need to run manually, how to verify each acceptance criterion, and any assumptions added to docs/DECISIONS.md. Do not start Phase 2.
```

---

## Phase 2: Content pipeline and browsing

```
Implement Phase 2 (Content pipeline and browsing) from FCI_STUDY_PLATFORM_SPEC.md. Phase 1 is complete and merged.

Scope:
1. scripts/import-content.ts (run with `pnpm import:content`, flags: --include-draft, --dry-run):
   - Parse /content using the formats in Section 5 (course.md, chapter.md, topic .md with frontmatter + <!-- mindmap --> block, questions/*.json).
   - Validate with zod; on error print file path + field and exit non-zero.
   - Idempotent upserts by (course slug, chapter slug, topic slug). Resources and questions for a topic are replaced transactionally on each import.
   - Uses SUPABASE_SERVICE_ROLE_KEY from env, never imported by client code.
2. Create sample content under /content: 1 course, 2 chapters, 5 topics (Arabic text, English terms, at least one code block), resources of each type, and 10 questions of mixed types. Use realistic placeholder content, not lorem ipsum.
3. Pages and components:
   - /courses (grid, filter by level/semester), /courses/[course] (description, chapter accordion, topic statuses placeholder), /courses/[course]/[chapter]/[topic] (header, Explanation, Resources sections only for now).
   - Components: MarkdownView (sanitized via rehype-sanitize, code blocks forced dir="ltr", syntax highlighting), ResourceList, YouTubePlayer (IFrame API, seeks to start_time), ChapterAccordion.
   - Queries in src/lib/queries/{courses,topics}.ts using the typed Supabase server client and the get_course_tree RPC.
   - ISR (revalidate = 3600), generateMetadata for course and topic pages.
4. Loading skeletons, empty and error states for every list/page.

Definition of done:
- Running the import twice creates no duplicates.
- Topic page renders Markdown correctly (Arabic text RTL, code LTR), plays the video starting at the right second, and is usable at 360px width.
- pnpm typecheck && lint && build pass; add Vitest unit tests for the import parser/validators.

Reply with files created, how to run the import, and how to verify each criterion. Do not start Phase 3.
```

---

## Phase 3: Mind maps, questions, progress

```
Implement Phase 3 (Mind maps, questions, progress) from FCI_STUDY_PLATFORM_SPEC.md. Phases 1-2 are complete.

Scope:
1. MindMap component using markmap-lib + markmap-view. Client-only (dynamic import, ssr: false), fullscreen toggle, "download SVG" button, RTL-friendly. Hide the tab entirely if the topic has no mindmap_md.
2. QuestionCard supporting mcq, written, code_trace:
   - MCQ: select option -> "Check" shows correct/incorrect + explanation_md.
   - written / code_trace: "Show solution" reveals the answer and explanation.
   - "Report a mistake" button opens a dialog and calls the reportContent server action (zod-validated, max 5 reports/user/hour).
   - Add a Questions section to the topic page.
3. Practice page /courses/[course]/practice: list questions with filters (chapter, difficulty, type, source year), paginated.
4. Progress:
   - Server actions setTopicStatus and setTopicConfidence (auth check + zod).
   - Status selector and 1-5 confidence control on the topic header with optimistic UI (useTransition).
   - Because course/topic pages are statically cached, load the user's progress client-side after hydration (small route handler or client Supabase call) and merge it into the UI. Do not make public pages dynamic just for this.
   - ProgressRing on the course page; status icons on the chapter accordion.
5. Prev/next topic navigation and a "Mark done and continue" button.
6. "Doctor's favorites" checklist section on the topic page.

Definition of done:
- Progress persists after reload and across browsers for the same user.
- Anonymous users can read everything; saving prompts a non-blocking login dialog.
- Reports appear in content_reports.
- Keyboard accessible: question options and dialogs operable without a mouse.
- typecheck/lint/build pass; unit tests for the report rate limiter and progress actions.

Reply with files created, how to verify each criterion, and known limitations. Do not start Phase 4.
```

---

## Phase 4: Plans, dashboard, search

```
Implement Phase 4 (Plans, dashboard, search) from FCI_STUDY_PLATFORM_SPEC.md. Phases 1-3 are complete.

Scope:
1. Study plans:
   - Extend the import script to import study plans (add content/<course>/plans/*.json with fields: title, total_days, days[{day, topic_slugs[], tips}]). Validate topic_slugs exist.
   - Create sample plans: "7 days", "exam-eve revision" for the sample course.
   - Page /courses/[course]/plans/[plan]: one card per day with linked topics, tips, and a per-day checkbox that marks that day's topics as done.
2. Weak topics:
   - Migration 0006 creating view v_weak_topics per Section 7.4 (confidence <= 2, OR quiz accuracy < 60%, OR status != done with importance >= 4). Security invoker so RLS applies.
3. /dashboard (auth required): per-course progress rings, top 5 weak topics (WeakTopicsList), recently viewed topics, quiz history placeholder (empty state for now).
4. Search:
   - Navbar search box -> /search?q= using the search_topics RPC. Debounced suggestions in a popover. Handle Arabic and English queries; empty state when nothing matches.
5. Update the types file and queries accordingly.

Definition of done:
- Completing topics updates the dashboard immediately after navigation.
- Searching an Arabic term and an English term returns relevant published topics only.
- Drafts never appear in search, plans, or dashboards for students.
- typecheck/lint/build pass; unit test for plan JSON validation.

Reply with files created, new migration notes, and verification steps. Do not start Phase 5.
```

---

## Phase 5: Hardening and launch

```
Implement Phase 5 (Hardening and launch) from FCI_STUDY_PLATFORM_SPEC.md. Phases 1-4 are complete.

Scope:
1. Security review against Section 7.5. For each checklist item, state PASS/FAIL with evidence (file/line or test). Fix every FAIL. Add:
   - Security headers + CSP in next.config.ts (allow youtube.com frames and the Supabase domain only).
   - Confirm no use of the service_role key outside /scripts.
   - SQL tests for RLS on every user-owned table (progress, attempts, flashcards, notes, reports) and role self-promotion.
2. Tests: Playwright smoke test for: browse -> open topic -> answer an MCQ -> sign up -> mark done -> dashboard shows progress. Vitest coverage for validators and weak-topic logic.
3. CI: GitHub Actions workflow running install, typecheck, lint, unit tests, build on every PR.
4. SEO: sitemap.ts, robots.ts, Open Graph defaults, JSON-LD (Course / LearningResource) on course and topic pages.
5. Analytics (optional, behind an env flag): PostHog events topic_viewed, quiz_started, quiz_finished, report_submitted. No analytics when the flag is off.
6. Polish: verify loading/empty/error states on every page, 360px layout, dark mode contrast (WCAG AA), focus rings.
7. Performance: run Lighthouse on a course page and a topic page; fix issues until performance and accessibility are >= 90, or explain precisely what blocks it.
8. Docs: finish README (setup, migrations, importing content, tests, deployment to Vercel + Supabase, env vars).

Definition of done: everything in Section 14 (Definition of Done) of the spec.

Reply with the security checklist table, Lighthouse scores, and the deployment steps I must perform manually.
```

---

## V2 prompts

### V2-A: Quizzes and results
```
Implement timed quizzes per Sections 6.5 and 9 of the spec.
- Pages: start dialog on the course/practice page (count 10/20/30, optional chapters), /quiz/[attemptId] runner, /quiz/[attemptId]/result.
- Use RPCs start_quiz and finish_quiz via server actions startQuiz and submitQuiz. If you need to extend the RPCs to filter by chapters, add a new migration.
- Timer = 1 minute per question, autosave answers to localStorage on every change (try/catch), auto-submit on timeout, warn before leaving.
- Result page: score, per-question review with explanation, chapters ranked by accuracy with links to weak topics. Written/code_trace questions are self-graded (user marks correct/incorrect) and excluded from the automatic MCQ score; make this clear in the UI.
- Update the dashboard quiz history and v_weak_topics if needed.
Include unit tests and a Playwright test. Reply with verification steps.
```

### V2-B: Spaced-repetition flashcards
```
Implement flashcards and /review per Sections 6.5 and 9.
- Import flashcards from content (add a flashcards array to the topic frontmatter or a flashcards/*.json file; update validators and the import script).
- FlashcardDeck component on the topic page with "Add to my review".
- /review (auth): fetch cards due today (max 30/session). Rating buttons Again(0), Hard(3), Good(4), Easy(5) call review_flashcard. Keyboard: space flips, 1-4 rates. Empty state when nothing is due. Show "due today" count on the dashboard and navbar badge.
- Unit-test the quality mapping; SQL-test that review_flashcard only touches the caller's rows.
Reply with verification steps.
```

### V2-C: Personal notes
```
Implement personal notes on the topic page: textarea with debounced autosave (1s) via saveNote, upsert on (user_id, topic_id), "saved" indicator, auth-required with login prompt for anonymous users. Add a /dashboard section listing recent notes with links. Add an RLS test. Reply with verification steps.
```

### V2-D: Admin editor
```
Implement an editor-only /admin area.
- Guard by role (editor/admin) in middleware AND in every server action (never trust the UI).
- CRUD for courses, chapters, topics (Markdown editor with live preview, mindmap editor with Markmap preview), resources, questions, flashcards, study plans.
- Status workflow draft -> reviewed -> published; only admin can publish.
- Content reports inbox: list, filter by resolved, link to the reported item, mark resolved.
- Show a warning that content in /content (git) and content edited in the admin can diverge; document the chosen source-of-truth rule in docs/DECISIONS.md and implement an "export to /content files" script if the human chose git as the source of truth.
Include role-based access tests. Reply with verification steps.
```

---

## Utility prompts

### Review prompt (run after each phase)
```
Act as a strict code reviewer for the phase you just implemented. Do not write new features.
1. Re-read the phase scope and acceptance criteria in FCI_STUDY_PLATFORM_SPEC.md.
2. For each acceptance criterion, state PASS/FAIL with concrete evidence (file paths, test names, command output).
3. List bugs, security issues (RLS gaps, missing auth checks, XSS, leaked secrets), RTL/accessibility problems, and missing error/empty states.
4. List dead code, unused dependencies, and spec deviations.
5. Output a prioritized fix list (P0 blocking, P1 important, P2 nice-to-have). Do not fix anything yet.
```

### Fix prompt
```
Fix all P0 and P1 items from your review. For each fix, state what changed and add or update a test that would have caught it. Re-run pnpm typecheck && pnpm lint && pnpm test && pnpm build and report the results. Do not add new features.
```

### Resume prompt (new session / lost context)
```
Read FCI_STUDY_PLATFORM_SPEC.md and docs/DECISIONS.md. Then inspect the repository (folder structure, supabase/migrations, package.json, recent git log) and tell me: (1) which phases appear complete, with evidence, (2) which phase is in progress and what remains, (3) any deviations from the spec. Do not change anything until I confirm.
```

### Bug report prompt
```
Bug: <what happened>
Expected: <what should happen>
Steps: <1, 2, 3>
Environment: <browser/device, logged in or not, URL>
Find the root cause first and explain it in 3-5 lines. Then fix it minimally, add a regression test, and re-run typecheck/lint/test/build.
```

### Content-drafting prompt (for writing topic files, human reviews every output)
```
Using ONLY the material I paste below (slides text / lecture transcript / book notes), draft a topic file following Section 5.2 of the spec and a questions JSON following Section 5.3.
Rules:
- Write original summaries in Arabic with English technical terms; do not copy long passages verbatim.
- Mind map must be a concise Markdown outline (max 3 levels).
- Produce 8-12 questions (mix of mcq, written, code_trace) with correct answers and explanations. If you are not sure an answer is correct, mark it with "REVIEW:" at the start of explanation_md.
- Set status: draft for everything. List at the end any claims you could not verify from the provided material.

Material:
<paste here>
```

---

## Tips

- One phase per session when possible; commit after each phase so you can roll back.
- If the agent starts adding features not in the phase scope, reply: "Out of scope for this phase. Revert that and stay within the listed scope."
- Always run the app yourself and click through the acceptance criteria. Do not rely only on the agent's report.
- Never paste real secrets into the chat. Put them in `.env.local` yourself.
