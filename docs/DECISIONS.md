# Architecture Decisions Log

## DECISION-0001: Next.js 15 App Router & TypeScript Strict
- **Context:** The application needs modern SSR, ISR, Server Actions, and strict type safety for course navigation and user progression.
- **Decision:** Scaffold using Next.js 15 (App Router) with TypeScript in strict mode, `src/` directory structure, and path alias `@/*`.
- **Consequences:** Clean separation of server and client components, native async data fetching, and zero client-side bundling of backend secrets.

## DECISION-0002: RTL-First Design System & Cairo Typography
- **Context:** The target audience is Egyptian/Arab CS & IT faculty students studying in Arabic with English/Code technical elements.
- **Decision:** 
  - Root layout configured with `<html lang="ar" dir="rtl">`.
  - Primary UI font is `Cairo` (Google Fonts via `next/font/google`).
  - Code font is `JetBrains Mono` with `.ltr` class enforcing `dir="ltr"` for code blocks.
  - Tailwind styling relies strictly on logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`).
- **Consequences:** Seamless bi-directional rendering without layout bugs when embedding English identifiers or algorithms.

## DECISION-0003: Supabase Architecture & `@supabase/ssr`
- **Context:** Supabase provides auth, PostgreSQL, RLS, and RPC functions. Next.js 15 requires cookie-based session management.
- **Decision:**
  - Use `@supabase/ssr` to implement client, server, and middleware helpers.
  - Migrations partitioned into 5 sequential files (`0001_enums.sql` to `0005_rpc.sql`) matching the spec exactly.
  - Profiles are automatically populated upon registration via the `handle_new_user()` trigger on `auth.users`.
  - Self-promotion is barred via RLS `WITH CHECK` on `profiles`.
  - Never import or expose `SUPABASE_SERVICE_ROLE_KEY` in the client bundle.
- **Consequences:** Secure session refreshment, protected routes, and bulletproof user separation.

## DECISION-0004: Dual Env Variable Support for Anon Key
- **Context:** User's `.env.local` originally used `NEXT_SUPABASE_ANON`, while standard Next.js / Supabase convention and spec refer to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Decision:** Support both variable names gracefully in the Supabase client factories (`process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_SUPABASE_ANON`).
- **Consequences:** Eliminates configuration runtime failures.
