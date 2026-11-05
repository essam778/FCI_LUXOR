"use client"

import * as React from "react"
import { useState } from "react"
import { Mail, Loader2, CheckCircle2, AlertCircle, X, KeyRound } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  defaultEmail?: string
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Sync defaultEmail when modal opens
  React.useEffect(() => {
    if (isOpen && defaultEmail) {
      setEmail(defaultEmail)
    }
    if (!isOpen) {
      setError(null)
      setIsSuccess(false)
    }
  }, [isOpen, defaultEmail])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setIsSuccess(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-[32px] bg-[#0b101e] border border-white/10 p-7 sm:p-9 shadow-2xl text-foreground animate-in zoom-in-95 duration-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Aurora Vertical Light Rays */}
        <div className="absolute top-0 inset-x-0 h-36 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 bg-primary/25 blur-3xl rounded-full" />
          <div
            className="absolute inset-0 opacity-20 mix-blend-screen"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 16px, hsla(var(--primary)/0.5) 17px, transparent 18px)`,
              maskImage: `linear-gradient(to bottom, black 25%, transparent 90%)`,
              WebkitMaskImage: `linear-gradient(to bottom, black 25%, transparent 90%)`,
            }}
          />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="relative z-10 absolute top-5 start-5 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="size-4.5" />
        </button>

        {isSuccess ? (
          <div className="relative z-10 text-center space-y-5 pt-3">
            <div className="mx-auto size-16 rounded-2xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black">تفقد بريدك الإلكتروني</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                أرسلنا رابطاً آمناً لإعادة تعيين كلمة المرور إلى:
              </p>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 font-mono text-primary font-bold text-xs break-all select-all">
                {email}
              </div>
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                افتح الرابط المرسل عبر الرسالة لتحديد كلمة مرور جديدة لحسابك. تفقد مجلد الرسائل الترويجية أو غير المرغوبة (Spam) إذا لم تظهر في البريد الوارد.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-[0_0_25px_rgba(99,102,241,0.4)] cursor-pointer"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative z-10 space-y-5 pt-2">
            <div className="text-center space-y-2">
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 text-primary shadow-sm mb-1">
                <KeyRound className="size-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black">استعادة كلمة المرور</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                أدخل البريد الإلكتروني المسجل في منصة <span dir="ltr" className="font-bold">STUDY++</span> وسنرسل لك رابطاً مباشراً لتعيين كلمة مرور جديدة.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive text-xs font-semibold">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2 text-start">
              <label htmlFor="reset-email" className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                <Mail className="size-3.5 text-primary" />
                البريد الإلكتروني
              </label>
              <input
                id="reset-email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm placeholder:text-muted-foreground/40 text-foreground focus:outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/25 transition-all text-start"
              />
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground text-sm font-bold transition-all shadow-[0_0_25px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4.5 animate-spin" />
                    <span>جاري إرسال الرابط...</span>
                  </>
                ) : (
                  <span>إرسال رابط استعادة الحساب</span>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
