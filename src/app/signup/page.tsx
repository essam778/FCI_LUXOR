"use client"

import * as React from "react"
import Link from "next/link"
import { useActionState } from "react"
import {
  GraduationCap,
  User,
  Mail,
  Lock,
  Building2,
  BookOpen,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react"
import { signup, type AuthActionResult } from "@/lib/actions/auth"

const LEVEL_OPTIONS = [
  { value: "1", label: "الفرقة الأولى", emoji: "1️⃣" },
  { value: "2", label: "الفرقة الثانية", emoji: "2️⃣" },
  { value: "3", label: "الفرقة الثالثة", emoji: "3️⃣" },
  { value: "4", label: "الفرقة الرابعة", emoji: "4️⃣" },
]

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signup,
    null
  )
  const [showPassword, setShowPassword] = React.useState(false)
  const [selectedLevel, setSelectedLevel] = React.useState("2")

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 py-8 relative">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 right-1/3 size-72 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 size-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Card */}
        <div className="relative bg-card/80 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-primary to-sky-500" />

          <div className="p-7 sm:p-9 space-y-7">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-primary/20 border border-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10 mb-1">
                <GraduationCap className="size-7 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  إنشاء حساب جديد 
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  انضم لمنصة دراسة حاسبات والمعلومات وابدأ تنظيم دراستك
                </p>
              </div>
            </div>

            {/* Error */}
            {state?.error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/8 border border-destructive/25 text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-relaxed">{state.error}</p>
              </div>
            )}

            {/* Success */}
            {state?.success ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 shrink-0" />
                  <span className="font-black text-sm">تم إنشاء الحساب بنجاح!</span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">{state.message}</p>
                <Link href="/login">
                  <button className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 mt-1">
                    <span>الانتقال لصفحة تسجيل الدخول</span>
                  </button>
                </Link>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                {/* Hidden level field (real value) */}
                <input type="hidden" name="level" value={selectedLevel} />

                {/* Full name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="displayName">
                    <User className="size-3.5 text-emerald-500" />
                    الاسم بالكامل <span className="text-destructive text-[10px]">*</span>
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    required
                    placeholder="أحمد محمد علي"
                    className="w-full h-11 rounded-xl border border-border bg-background/60 px-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="email">
                    <Mail className="size-3.5 text-primary" />
                    البريد الإلكتروني <span className="text-destructive text-[10px]">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    dir="ltr"
                    className="w-full h-11 rounded-xl border border-border bg-background/60 px-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="password">
                    <Lock className="size-3.5 text-sky-500" />
                    كلمة المرور <span className="text-destructive text-[10px]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="6 أحرف على الأقل"
                      dir="ltr"
                      className="w-full h-11 rounded-xl border border-border bg-background/60 px-4 pe-11 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* University + Level grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="university">
                      <Building2 className="size-3.5 text-amber-500" />
                      الجامعة
                    </label>
                    <input
                      id="university"
                      name="university"
                      type="text"
                      placeholder="جامعة القاهرة"
                      className="w-full h-11 rounded-xl border border-border bg-background/60 px-3 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all"
                    />
                  </div>

                  {/* Level custom selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <BookOpen className="size-3.5 text-purple-500" />
                      الفرقة
                    </label>
                    <div className="relative">
                      <select
                        id="level-select"
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="w-full h-11 rounded-xl border border-border bg-background/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all appearance-none cursor-pointer"
                      >
                        {LEVEL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.emoji} {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none text-muted-foreground">
                        <BookOpen className="size-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-primary hover:from-emerald-700 hover:to-primary/90 active:scale-[0.98] text-white text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>جاري إنشاء الحساب...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-4" />
                      <span>إنشاء الحساب مجاناً</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Bottom link */}
            {!state?.success && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-3 text-[11px] text-muted-foreground font-semibold">أو</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    لديك حساب بالفعل؟{" "}
                    <Link
                      href="/login"
                      className="font-bold text-primary hover:underline underline-offset-4 transition-colors"
                    >
                      تسجيل الدخول
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-muted-foreground/60">
          <Sparkles className="size-3 inline-block me-1" />
          منصة دراسة حاسبات والمعلومات — محمية بـ Supabase Auth
        </p>
      </div>
    </div>
  )
}
