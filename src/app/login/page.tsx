"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState, Suspense } from "react"
import {
  GraduationCap,
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react"
import { login, type AuthActionResult } from "@/lib/actions/auth"

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/dashboard"
  const urlError = searchParams.get("error")
  const [showPassword, setShowPassword] = React.useState(false)

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    login,
    null
  )

  return (
    <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Card */}
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-sky-500 to-emerald-500" />

        <div className="p-7 sm:p-9 space-y-7">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-sky-500/20 border border-primary/20 text-primary shadow-lg shadow-primary/10 mb-1">
              <GraduationCap className="size-7 stroke-[1.8]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                أهلاً بعودتك 
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                سجّل دخولك للوصول إلى مواد ومحاضرات كليتك
              </p>
            </div>
          </div>

          {/* Error alerts */}
          {(urlError === "auth_callback_failed" || state?.error) && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/8 border border-destructive/25 text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                {urlError === "auth_callback_failed"
                  ? "فشل التحقق من الرابط أو انتهت صلاحيته. يُرجى تسجيل الدخول مجدداً."
                  : state?.error}
              </p>
            </div>
          )}

          {/* Form */}
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            {/* Email field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="email">
                <Mail className="size-3.5 text-primary" />
                البريد الإلكتروني
              </label>
              <div className="relative">
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
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="password">
                <Lock className="size-3.5 text-primary" />
                كلمة المرور
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

            {/* Submit button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground text-sm font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  <span>دخول</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-[11px] text-muted-foreground font-semibold">
                أو
              </span>
            </div>
          </div>

          {/* Signup link */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              ليس لديك حساب بعد؟{" "}
              <Link
                href="/signup"
                className="font-bold text-primary hover:underline underline-offset-4 transition-colors"
              >
                إنشاء حساب مجاني الآن
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-[11px] text-muted-foreground/60">
        <Sparkles className="size-3 inline-block me-1" />
        منصة دراسة حاسبات والمعلومات — محمية بـ Supabase Auth
      </p>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md animate-pulse">
      <div className="bg-card/80 border border-border/60 rounded-3xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/30 via-sky-500/30 to-emerald-500/30" />
        <div className="p-9 space-y-7">
          <div className="text-center space-y-3">
            <div className="size-14 rounded-2xl bg-muted mx-auto" />
            <div className="h-7 w-36 bg-muted mx-auto rounded-lg" />
            <div className="h-4 w-52 bg-muted mx-auto rounded" />
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="h-3.5 w-24 bg-muted rounded" />
              <div className="h-11 bg-muted rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-24 bg-muted rounded" />
              <div className="h-11 bg-muted rounded-xl" />
            </div>
            <div className="h-11 bg-primary/20 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 relative">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/3 size-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 size-64 rounded-full bg-sky-500/5 blur-3xl" />
      </div>
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
