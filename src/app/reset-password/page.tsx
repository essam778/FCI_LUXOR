"use client"

import * as React from "react"
import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  ArrowRight,
  GraduationCap,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PasswordStrengthMeter, evaluatePassword } from "@/components/auth/PasswordStrengthMeter"

function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const { percentage } = evaluatePassword(password)
  const isMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (percentage < 40) {
      setError("يرجى اختيار كلمة مرور أقوى تلبي شروط الأمان")
      return
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين، يرجى التحقق من الإدخال")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setIsSuccess(true)
        setTimeout(() => {
          router.push("/login?reset=success")
        }, 2200)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تعيين كلمة المرور")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative z-10 w-full space-y-6">
      {isSuccess ? (
        <div className="text-center space-y-5 pt-3 animate-in fade-in duration-300">
          <div className="mx-auto size-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="size-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-foreground">تم تغيير كلمة المرور بنجاح</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تم تحديث كلمة المرور الجديدة لحسابك. جاري تحويلك إلى صفحة تسجيل الدخول...
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(99,102,241,0.4)]"
          >
            <span>تسجيل الدخول الآن</span>
            <ArrowRight className="size-4 rotate-180" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Header */}
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
              تعيين كلمة مرور جديدة
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              أدخل كلمة مرور جديدة قوية لحسابك للدخول للمنصة
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive text-xs font-semibold">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1" htmlFor="new-password">
              <span>كلمة المرور الجديدة</span>
              <span className="text-destructive font-bold">*</span>
            </label>
            <div className="relative">
              <input
                id="new-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 pe-12 text-sm placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/25 transition-all text-start"
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

            {/* Password Strength Meter */}
            <PasswordStrengthMeter password={password} showCriteria={true} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/90 flex items-center gap-1" htmlFor="confirm-new-password">
              <span>تأكيد كلمة المرور الجديدة</span>
              <span className="text-destructive font-bold">*</span>
            </label>
            <div className="relative">
              <input
                id="confirm-new-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
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

            {/* Matching indicator */}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isMatch || percentage < 40}
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground text-sm font-bold transition-all shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.55)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pt-0.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span>جاري حفظ كلمة المرور...</span>
              </>
            ) : (
              <span>حفظ كلمة المرور الجديدة</span>
            )}
          </button>

          <div className="text-center pt-1">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 blur-[120px] rounded-full" />
      </div>

      {/* Centered Luxury Card */}
      <div className="relative w-full max-w-[450px] rounded-[32px] border border-white/10 dark:border-white/10 bg-[#0b101e]/90 dark:bg-[#0b101e]/90 backdrop-blur-2xl shadow-2xl p-7 sm:p-9 overflow-hidden">
        {/* Top Aurora Vertical Light Rays Glow */}
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
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
