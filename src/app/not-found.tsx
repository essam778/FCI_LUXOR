import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-5" dir="rtl">
      <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <BookOpen className="size-8" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-black text-foreground">404 — الصفحة غير موجودة</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          عذراً، لم نتمكن من العثور على المقرر أو الصفحة التي تبحث عنها. قد تكون الصفحة قد تم نقلها أو تعديل عنوانها.
        </p>
      </div>
      <div className="pt-2 flex items-center gap-3">
        <Link href="/courses">
          <Button className="btn-primary-glow font-bold text-xs h-10 px-6 rounded-xl">
            <span>تصفح المقررات الدراسية</span>
            <ArrowRight className="size-4 ms-1.5" />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="font-bold text-xs h-10 px-5 rounded-xl">
            <span>الصفحة الرئيسية</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}

