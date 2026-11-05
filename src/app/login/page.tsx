"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState, Suspense, useState } from "react"
import {
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react"
import { login, type AuthActionResult } from "@/lib/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { ForgotPasswordModal } from "@/components/auth/ForgotPasswordModal"

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/dashboard"
  const urlError = searchParams.get("error")
  const isResetSuccess = searchParams.get("reset") === "success"

  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [emailValue, setEmailValue] = useState("")

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    login,
    null
  )

  const handleGoogleSignIn = async () => {
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
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
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
      setGoogleError(err instanceof Error ? err.message : "فشل تسجيل الدخول بحساب Google")
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="relative z-10 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        {/* Brand Logo */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 shadow-inner mb-1">
          <div className="size-6 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
            <GraduationCap className="size-3.5 stroke-[2.2]" />
          </div>
          <span className="text-sm font-black text-foreground tracking-tight" dir="ltr">
            STUDY<span className="text-primary font-black">++</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          أهلاً بعودتك
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          أدخل بيانات حسابك للوصول إلى المحاضرات والمقررات
        </p>
      </div>

      {/* Success from Reset Password */}
      {isResetSuccess && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <p className="text-xs font-bold leading-relaxed">
            تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة.
          </p>
        </div>
      )}

      {/* Security alert */}
      {urlError === "session_expired_other_device" && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold leading-relaxed">
            تم تسجيل الدخول بحسابك من جهاز آخر، تم تسجيل خروجك لحماية الحساب.
          </p>
        </div>
      )}

      {/* Error alerts */}
      {(urlError === "auth_callback_failed" || state?.error || googleError) && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold leading-relaxed">
            {googleError
              ? googleError
              : urlError === "auth_callback_failed"
              ? "فشل التحقق من الرابط أو انتهت صلاحيته. يُرجى تسجيل الدخول مجدداً."
              : state?.error}
          </p>
        </div>
      )}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
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
          {isGoogleLoading ? "جاري تحويلك إلى Google..." : "المتابعة باستخدام حساب Google"}
        </span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-white/10 dark:border-white/10" />
        <span className="absolute bg-[#0b101e] px-3 text-xs text-muted-foreground/70 font-medium">
          أو بالبريد الإلكتروني
        </span>
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        {/* Email field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1" htmlFor="email">
            <span>البريد الإلكتروني</span>
            <span className="text-destructive font-bold">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="student@example.com"
            dir="ltr"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            className="w-full h-12 rounded-2xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] px-4 text-sm placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/25 transition-all text-start"
          />
        </div>

        {/* Password field */}
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
              autoComplete="current-password"
              placeholder="••••••••"
              dir="ltr"
              className="w-full h-12 rounded-2xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] px-4 pe-12 text-sm placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/25 transition-all text-start"
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
        </div>

        {/* Options Row: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-0.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
            <input
              type="checkbox"
              name="remember"
              defaultChecked
              className="size-4 rounded-md border-white/20 bg-white/[0.05] text-primary focus:ring-primary/30 accent-primary cursor-pointer"
            />
            <span>تذكرني</span>
          </label>

          <button
            type="button"
            onClick={() => setIsForgotModalOpen(true)}
            className="text-primary hover:text-primary/90 font-semibold hover:underline underline-offset-4 cursor-pointer transition-colors"
          >
            نسيت كلمة المرور؟
          </button>
        </div>

        {/* Big Neon Glow Primary Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-bold text-sm sm:text-base transition-all shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.55)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed pt-0.5"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4.5 animate-spin" />
              <span>جاري تسجيل الدخول...</span>
            </>
          ) : (
            <span>تسجيل الدخول</span>
          )}
        </button>
      </form>

      {/* Switch to Signup */}
      <div className="text-center pt-1 text-xs text-muted-foreground">
        ليس لديك حساب بعد؟{" "}
        <Link
          href="/signup"
          className="font-bold text-primary hover:underline underline-offset-4 transition-colors"
        >
          إنشاء حساب جديد
        </Link>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={emailValue}
      />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 blur-[120px] rounded-full" />
      </div>

      {/* Centered Luxury Card */}
      <div className="relative w-full max-w-[450px] rounded-[32px] border border-white/10 dark:border-white/10 bg-[#0b101e]/90 dark:bg-[#0b101e]/90 backdrop-blur-2xl shadow-2xl p-7 sm:p-9 overflow-hidden">
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

        <Suspense fallback={<div className="text-muted-foreground text-sm text-center py-8">جاري التحميل...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
