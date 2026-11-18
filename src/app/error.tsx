"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Log unexpected runtime errors for observability
    console.error("[STUDY++ App Error Boundary]:", error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-6" dir="rtl">
      <div className="size-16 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto animate-in zoom-in-95 duration-200">
        <AlertTriangle className="size-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">
          حدث خطأ غير متوقع
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          نعتذر عن هذا الخطأ المؤقت أثناء معالجة طلبك. تم تسجيل الخطأ للتحقق منه، ويمكنك المحاولة مرة أخرى الآن.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-muted-foreground/60 bg-muted/40 py-1 px-2.5 rounded-lg inline-block">
            رمز الخطأ: {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={() => reset()}
          className="btn-primary-glow font-bold text-xs h-10 px-6 rounded-xl gap-2 cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          <span>إعادة المحاولة</span>
        </Button>
        <Link href="/">
          <Button variant="outline" className="font-bold text-xs h-10 px-5 rounded-xl gap-2 cursor-pointer">
            <Home className="size-3.5" />
            <span>الصفحة الرئيسية</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
