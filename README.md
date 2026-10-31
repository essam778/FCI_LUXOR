# منصة دراسة حاسبات والمعلومات (FCI Study Platform)

منصة ويب تعليمية تفاعلية مخصصة لطلاب كليات الحاسبات والذكاء الاصطناعي (CS / IT / AI) لتنظيم دراسة المقررات الأكاديمية: شروحات منظمة، خرائط ذهنية، مصادر وروابط دقيقة للمحاضرات، أسئلة امتحانات سابقة محلولة، وتكرار متباعد.

---

## 🚀 التقنيات المستخدمة (Tech Stack)

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript (Strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Logical CSS properties for RTL support
- **Fonts**: Cairo (UI) + JetBrains Mono (Code / LTR)
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, RPC functions, Cookie Auth)
- **Validation**: [Zod](https://zod.dev/)
- **Package Manager**: `pnpm`

---

## 🛠️ خطوات التشغيل والتثبيت (Setup Guide)

### 1. المتطلبات الأساسية
- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- حساب ومشروع على [Supabase](https://supabase.com/)

### 2. تثبيت الحزم
```bash
pnpm install
```

### 3. إعداد متغيرات البيئة (Environment Variables)
انسخ ملف `.env.example` إلى `.env.local`:
```bash
cp .env.example .env.local
```
ثم أضف مفاتيح مشروعك من إعدادات Supabase (Project Settings -> API):
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-for-scripts-only>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🗄️ إعداد قاعدة البيانات و Supabase (Database & Migrations)

توجد ملفات الهجرة مرتبة داخل مجلد `supabase/migrations/`:
1. `0001_enums.sql` - تعريف الأنواع والمصفوفات المشروطة (`user_role`, `content_status`, `resource_type`, etc.)
2. `0002_tables.sql` - إنشاء الجداول (`profiles`, `courses`, `chapters`, `topics`, `resources`, `questions`, `flashcards`, `study_plans`, `user_progress`, `quiz_attempts`, `user_flashcards`, `notes`, `content_reports`)
3. `0003_helpers_triggers.sql` - دالة ومحفز إنشاء الملف الشخصي تلقائياً عند التسجيل (`handle_new_user()`) ودالة التحقق من المحررين (`is_editor()`)
4. `0004_rls.sql` - سياسات أمان مستوى الصفوف (Row Level Security) لكل جدول ومنع تصعيد الرتب
5. `0005_rpc.sql` - دوال الخادم (`get_course_tree`, `review_flashcard`, `start_quiz`, `finish_quiz`, `search_topics`)

### تطبيق ملفات الهجرة عبر Supabase CLI:
```bash
# 1. تسجيل الدخول وربط المشروع
supabase login
supabase link --project-ref ugccdvvxalwukyxbjxhm

# 2. تطبيق ملفات الهجرة على قاعدة البيانات
supabase db push

# 3. توليد أنواع TypeScript من قاعدة البيانات (اختياري، تم تضمينها بالفعل في src/types/database.ts)
supabase gen types typescript --linked > src/types/database.ts
```
*(أو يمكنك نسخ محتويات الملفات من `0001` إلى `0005` بالترتيب وتشغيلها مباشرة داخل Supabase SQL Editor)*.

---

## 🧪 اختبار أمان RLS (Testing Row Level Security)

تم إعداد ملف اختبار شامل `supabase/tests/rls.sql` للتأكد من:
1. عزل بيانات المستخدمين: المستخدم B لا يمكنه قراءة تقدم المستخدم A (`user_progress`).
2. منع تصعيد الصلاحيات: لا يمكن للمستخدم العادي (student) تعديل رتبته إلى editor أو admin.

للتشغيل:
- الصق محتوى `supabase/tests/rls.sql` في Supabase SQL Editor واضغط **Run**.
- ستظهر رسالة النجاح: `SUCCESS: All RLS test assertions passed without violation.`

---

## 💻 التشغيل والفحص المحلي (Local Development)

```bash
# تشغيل خادم التطوير
pnpm dev

# فحص الأنواع (TypeScript Check)
pnpm typecheck

# فحص الكود (Linting)
pnpm lint

# بناء المشروع للإنتاج (Production Build)
pnpm build
```

---

## 📁 هيكل المشروع (Project Structure)

```
├── supabase/
│   ├── migrations/     # ملفات هجرة قاعدة البيانات المنفصلة (0001 - 0005)
│   └── tests/          # اختبارات RLS وسياسات الأمان (rls.sql)
├── src/
│   ├── app/            # مسارات Next.js (/, /login, /signup, /dashboard, /courses, /auth/callback)
│   ├── components/     # المكونات (ui, layout, ThemeToggle, Navbar, Footer)
│   ├── lib/
│   │   ├── actions/    # دوال الخادم Server Actions (auth: login, signup, logout)
│   │   ├── supabase/   # عملاء Supabase (client, server, middleware) عبر @supabase/ssr
│   │   └── validators/ # قواعد التحقق Zod
│   ├── types/          # تعريفات قاعدة البيانات (database.ts)
│   └── middleware.ts   # حماية المسارات وتحديث الجلسات
├── docs/
│   └── DECISIONS.md    # سجل القرارات الهندسية
└── .env.example        # قالب المتغيرات البيئية
```
