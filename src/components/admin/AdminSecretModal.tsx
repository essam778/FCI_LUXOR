"use client"

import * as React from "react"
import { useActionState } from "react"
import { ShieldAlert, KeyRound, Loader2, CheckCircle2, AlertTriangle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { verifyAdminPasskey, type AdminAuthResult } from "@/lib/actions/adminAuth"

export function AdminSecretModal() {
  const [isOpen, setIsOpen] = React.useState(false)
  const router = useRouter()

  const [state, formAction, isPending] = useActionState<AdminAuthResult | null, FormData>(
    verifyAdminPasskey,
    null
  )

  // Listen for Ctrl+Shift+A or custom event to open
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    const handleCustomOpen = () => setIsOpen(true)

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("fci_open_admin_modal", handleCustomOpen)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("fci_open_admin_modal", handleCustomOpen)
    }
  }, [])

  React.useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        setIsOpen(false)
        router.push("/admin")
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [state, router])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in-50 duration-150">
      <div className="w-full max-w-md rounded-2xl border border-primary/40 bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1"
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3 text-start">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/30 shrink-0">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground">بوابة التحقق الإداري المشفرة</h3>
            <p className="text-[11px] text-muted-foreground">
              منطقة مخصصة لإدارة المنصة • اختصار الفتح السريع: Ctrl + Shift + A
            </p>
          </div>
        </div>

        {state?.error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-bold">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {state?.success && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}

        <form action={formAction} className="space-y-4 text-start">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground" htmlFor="admin-passkey">
              رمز الأمان الإداري (Master Key):
            </label>
            <div className="relative">
              <KeyRound className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="admin-passkey"
                name="passkey"
                type="password"
                placeholder="أدخل رمز المرور الإداري السري..."
                required
                className="ps-9 pe-4 bg-muted/30 text-xs font-mono"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              لا يمكن لأي مستخدم عادي أو طالب الوصول لهذه اللوحة دون اعتماد الرمز الإداري.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="text-xs font-bold gap-1.5 px-5"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              <span>تأكيد الصلاحية والدخول</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
