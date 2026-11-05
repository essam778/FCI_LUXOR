"use client"

import * as React from "react"
import Link from "next/link"
import { useActionState, useState } from "react"
import {
  GraduationCap,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signup, type AuthActionResult } from "@/lib/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { PasswordStrengthMeter, evaluatePassword } from "@/components/auth/PasswordStrengthMeter"

const LEVEL_OPTIONS = [
  { value: "1", label: "الفرقة الأولى" },
  { value: "2", label: "الفرقة الثانية" },
  { value: "3", label: "الفرقة الثالثة" },
  { value: "4", label: "الفرقة الرابعة" },
]

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signup,
    null
  )

  const [displayName, setDisplayName] = useState("")
  const [emailInput, setEmailInput] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [selectedLevel, setSelectedLevel] = useState("2")
  const [university, setUniversity] = useState("جامعة الأقصر")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  const { percentage } = evaluatePassword(password)
  const isMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    setGoogleError(null)
    try {
      const supabase = createClient()
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

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (password.length < 8) {
      e.preventDefault()
      setClientError("كلمة المرور يجب أن لا تقل عن 8 أحرف وتلبي شروط الأمان")
      return
    }
    if (password !== confirmPassword) {
      e.preventDefault()
      setClientError("كلمتا المرور غير متطابقتين، يرجى التأكد من تطابق الحقلين")
      return
    }
    setClientError(null)
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 blur-[120px] rounded-full" />
      </div>

      {/* Centered Luxury Card */}
      <div className="relative w-full max-w-[480px] rounded-[32px] border border-white/10 dark:border-white/10 bg-[#0b101e]/90 dark:bg-[#0b101e]/90 backdrop-blur-2xl shadow-2xl p-7 sm:p-9 overflow-hidden space-y-6">
        {/* Top Aurora Vertical Light Rays Glow (as in user screenshot) */}
        <div className="absolute top-0 inset-x-0 h-44 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-32 bg-primary/25 blur-3xl rounded-full" />
          <div className="absolute top-0 inset-x-0 h-32 bg-[radial-gradient(ellipse_at_top,hsla(var(--primary)/0.22),transparent_75%)]" />
          <div
            className="absolute inset-0 opacity-25 mix-blend-screen"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 16px, hsla(var(--primary)/0.5) 17px, transparent 18px)`,
              maskImage: `linear-gradient(to bottom, black 25%, transparent 90%)`,
              WebkitMaskImage: `linear-gradient(to bottom, black 25%, transparent 90%)`,
            }}
          />
        </div>

        {/* Content Container */}
        <div className="relative z-10 w-full space-y-6">
          {/* Header */}
          {!state?.success && (
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 shadow-inner mb-1">
                <div className="size-6 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                  <GraduationCap className="size-3.5 stroke-[2.2]" />
                </div>
                <span className="text-sm font-black text-foreground tracking-tight" dir="ltr">
                  STUDY<span className="text-primary font-black">++</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                إنشاء حساب جديد
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                انضم لمنصة <span dir="ltr" className="font-bold">STUDY++</span> وابدأ تنظيم دراستك ومحاضراتك
              </p>
            </div>
          )}

          {/* Error alerts */}
          {(clientError || state?.error || googleError) && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                {clientError || googleError || state?.error}
              </p>
            </div>
          )}

          {/* Success: Email confirmation screen */}
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
                <span className="text-[11px] font-black tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-block">
                  تأكيد البريد الإلكتروني مطلوب
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  تحقق من بريدك الإلكتروني
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  أرسلنا رابط تأكيد وتفعيل الحساب إلى البريد الإلكتروني التالي:
                </p>
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 font-mono text-primary font-bold text-xs sm:text-sm break-all select-all">
                  {state.email || emailInput || "بريدك الإلكتروني المسجل"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-start space-y-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                    1
                  </span>
                  <span>افتح تطبيق البريد الإلكتروني في جهازك.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                    2
                  </span>
                  <span>
                    اضغط على زر <strong>Confirm your mail</strong> في الرسالة لتفعيل الحساب.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                    3
                  </span>
                  <span>بعد التفعيل، عُد إلى هنا وسجّل دخولك مباشرة.</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <Link href="/login" className="block w-full">
                  <Button className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-[0_0_25px_rgba(99,102,241,0.4)] gap-2 cursor-pointer">
                    <CheckCircle2 className="size-4" />
                    <span>الانتقال لصفحة تسجيل الدخول</span>
                  </Button>
                </Link>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>فتح Gmail</span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </a>
                  <a
                    href="https://outlook.live.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>فتح Outlook</span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading || isPending}
                className="w-full h-12 rounded-2xl border border-white/10 dark:border-white/10 bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-foreground text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <Loader2 className="size-4.5 animate-spin text-muted-foreground" />
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
                  {isGoogleLoading ? "جاري تحويلك إلى Google..." : "التسجيل باستخدام Google"}
                </span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-white/10 dark:border-white/10" />
                <span className="absolute bg-[#0b101e] px-3 text-xs text-muted-foreground/70 font-medium">
                  أو بإدخال البيانات يدوياً
                </span>
              </div>

              {/* Form */}
              <form action={formAction} onSubmit={handleFormSubmit} className="space-y-4">
                <input type="hidden" name="level" value={selectedLevel} />

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1" htmlFor="displayName">
                    <span>الاسم بالكامل</span>
                    <span className="text-destructive font-bold">*</span>
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="أحمد محمد علي"
                    className="w-full h-12 rounded-2xl border border-white/10 dark:border-white/10 bg-white/[0.03] px-4 text-sm placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/25 transition-all text-start"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1" htmlFor="email">
                    <span>البريد الإلكتروني</span>
                    <span className="text-destructive font-bold">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="student@example.com"
                    dir="ltr"
                    className="w-full h-12 rounded-2xl border border-white/10 dark:border-white/10 bg-white/[0.03] px-4 text-sm placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/25 transition-all text-start"
                  />
                </div>

                {/* Password with Strength Meter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1" htmlFor="password">
                    <span>كلمة المرور</span>
                    <span className="text-destructive font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full h-12 rounded-2xl border border-white/10 dark:border-white/10 bg-white/[0.03] px-4 pe-12 text-sm placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/25 transition-all text-start"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground/70 hover:text-foreground p-1 transition-colors cursor-pointer"
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>

                  {/* Password Strength Progress Bar & Rules */}
                  <PasswordStrengthMeter password={password} showCriteria={true} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1" htmlFor="confirmPassword">
                    <span>تأكيد كلمة المرور</span>
                    <span className="text-destructive font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      dir="ltr"
                      className={`w-full h-12 rounded-2xl border bg-white/[0.03] px-4 pe-12 text-sm placeholder:text-muted-foreground/40 text-foreground focus:outline-none transition-all text-start ${
                        isMatch
                          ? "border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/30"
                          : isMismatch
                          ? "border-destructive/70 focus:ring-2 focus:ring-destructive/30"
                          : "border-white/10 focus:border-primary/80 focus:ring-2 focus:ring-primary/25"
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground/70 hover:text-foreground p-1 transition-colors cursor-pointer"
                      aria-label={showConfirmPassword ? "إخفاء تأكيد كلمة المرور" : "إظهار تأكيد كلمة المرور"}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>

                  {/* Match Indicator */}
                  {confirmPassword.length > 0 && (
                    <div
                      className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors duration-200 ${
                        isMatch ? "text-emerald-500" : "text-destructive"
                      }`}
                    >
                      {isMatch ? (
                        <>
                          <Check className="size-3 stroke-[3]" />
                          <span>كلمتا المرور متطابقتان تماماً</span>
                        </>
                      ) : (
                        <>
                          <X className="size-3 stroke-[3]" />
                          <span>كلمتا المرور غير متطابقتين، يرجى المراجعة</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* University & Level */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/90" htmlFor="university">
                      الجامعة
                    </label>
                    <input
                      id="university"
                      name="university"
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="جامعة الأقصر"
                      className="w-full h-11 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-xs placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/25 transition-all text-start"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/90" htmlFor="level-select">
                      الفرقة الدراسية
                    </label>
                    <select
                      id="level-select"
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="w-full h-11 rounded-2xl border border-white/10 bg-[#0b101e] px-3 text-xs text-foreground focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/25 transition-all cursor-pointer text-start"
                    >
                      {LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0b101e] text-foreground">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Big Neon Glow Primary Submit Button */}
                <button
                  type="submit"
                  disabled={isPending || (confirmPassword.length > 0 && !isMatch) || percentage < 40}
                  className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold text-sm sm:text-base transition-all shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.55)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 pt-0.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4.5 animate-spin" />
                      <span>جاري إنشاء الحساب...</span>
                    </>
                  ) : (
                    <span>إنشاء حساب جديد</span>
                  )}
                </button>
              </form>

              {/* Switch to login */}
              <div className="text-center pt-1 text-xs text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <Link
                  href="/login"
                  className="font-bold text-primary hover:underline underline-offset-4 transition-colors"
                >
                  تسجيل الدخول
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
