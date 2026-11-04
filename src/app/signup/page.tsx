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
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signup, type AuthActionResult } from "@/lib/actions/auth"
import { createClient } from "@/lib/supabase/client"

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
  const [emailInput, setEmailInput] = React.useState("")
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  const [googleError, setGoogleError] = React.useState<string | null>(null)

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    setGoogleError(null)
    try {
      const supabase = createClient()
      // Ensure any lingering session on this client is completely cleared before starting OAuth
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      })
      if (error) {
        setGoogleError(error.message)
        setIsGoogleLoading(false)
      }
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : "فشل التسجيل بحساب Google")
      setIsGoogleLoading(false)
    }
  }

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
            {/* Header (hidden if showing email confirmation) */}
            {!state?.success && (
              <div className="text-center space-y-3">
                <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-primary/20 border border-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10 mb-1">
                  <GraduationCap className="size-7 stroke-[1.8]" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    إنشاء حساب جديد
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    انضم لمنصة <span dir="ltr" className="font-bold inline-flex items-center">STUDY<span className="text-primary font-black">++</span></span> وابدأ تنظيم دراستك
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {(state?.error || googleError) && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/8 border border-destructive/25 text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-relaxed">
                  {googleError || state?.error}
                </p>
              </div>
            )}

            {/* Success: Beautiful Email Confirmation Screen */}
            {state?.success ? (
              <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="relative mx-auto size-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-primary/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
                  <Mail className="size-10 stroke-[1.7]" />
                  <span className="absolute -top-1 -end-1 flex size-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-5 bg-emerald-500 text-white items-center justify-center">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-block">
                    تأكيد البريد الإلكتروني مطلوب
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    تحقق من بريدك الإلكتروني
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    أرسلنا رابط تأكيد وتفعيل الحساب إلى البريد الإلكتروني التالي:
                  </p>
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 font-mono text-primary font-bold text-xs sm:text-sm break-all select-all">
                    {state.email || emailInput || "بريدك الإلكتروني المسجل"}
                  </div>
                </div>

                {/* Steps */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 text-start space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2.5">
                    <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      1
                    </span>
                    <span>افتح تطبيق البريد الإلكتروني أو صندوق الوارد في جهازك.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      2
                    </span>
                    <span>
                      ابحث عن رسالة التفعيل من منصة <strong className="text-foreground" dir="ltr">STUDY++</strong> واضغط على زر <strong>Confirm your mail</strong>.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                      3
                    </span>
                    <span>بعد الضغط على رابط التأكيد، عُد إلى هنا وسجّل دخولك فوراً.</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-1">
                  <Link href="/login" className="block w-full">
                    <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-primary hover:from-emerald-700 hover:to-primary/90 text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary/20 gap-2 cursor-pointer">
                      <CheckCircle2 className="size-4" />
                      <span>الانتقال لصفحة تسجيل الدخول</span>
                    </Button>
                  </Link>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="https://mail.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 rounded-xl border border-border bg-card hover:bg-muted/50 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>فتح Gmail</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                    <a
                      href="https://outlook.live.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 rounded-xl border border-border bg-card hover:bg-muted/50 text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>فتح Outlook</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                  لم تجد الرسالة في صندوق الوارد؟ تحقق من مجلد <strong>الرسائل غير المرغوب فيها (Spam / Junk)</strong>.
                </p>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                {/* Hidden level field (real value) */}
                <input type="hidden" name="level" value={selectedLevel} />

                {/* Full name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="displayName">
                    <User className="size-3.5 text-emerald-500" />
                    الاسم بالكامل
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
                    البريد الإلكتروني
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
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
                    كلمة المرور
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
                      placeholder="جامعة الأقصر"
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
                      <span>إنشاء الحساب</span>
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

                {/* Google Sign Up Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={isGoogleLoading || isPending}
                  className="w-full h-11 rounded-xl border border-border/80 bg-card hover:bg-muted/50 active:scale-[0.98] text-foreground text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <svg className="size-4.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>
                    {isGoogleLoading
                      ? "جاري تحويلك إلى Google..."
                      : "التسجيل باستخدام Google"}
                  </span>
                </button>

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
          منصة <span dir="ltr" className="font-bold">STUDY++</span> — نظام دراسي معتمد
        </p>
      </div>
    </div>
  )
}
