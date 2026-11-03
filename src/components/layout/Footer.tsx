"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCap, LayoutDashboard, BookOpen } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface FooterProps {
  user?: User | null
}

export function Footer({ user }: FooterProps) {
  const pathname = usePathname()

  // Hide footer completely on dashboard and admin pages for a clean app feel
  if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin")) {
    return null
  }

  return (
    <footer className="border-t border-border bg-card/60 text-muted-foreground text-sm mt-auto">
      <div className="container mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Right side (Start in RTL): About & Brand */}
          <div className="space-y-3 max-w-md">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <GraduationCap className="size-4.5" />
              </div>
              <span className="text-base font-black">STUDY <span className="text-primary">++</span></span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              منصة دراسية تفاعلية مخصصة لطلاب كلية الحاسبات والمعلومات والذكاء الاصطناعي بالأقصر (STUDY ++).
            </p>
          </div>

          {/* Left side (End in RTL): Quick Links */}
          <div className="space-y-3 md:text-start self-start md:self-auto">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
              روابط سريعة
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/courses"
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="size-3.5 text-primary" />
                  <span>المقررات الدراسية</span>
                </Link>
              </li>
              {user ? (
                <>
                  <li>
                    <Link
                      href="/dashboard"
                      className="hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <LayoutDashboard className="size-3.5 text-primary" />
                      <span>لوحة التحكم</span>
                    </Link>
                  </li>
                  <li className="pt-1 text-[11px] text-muted-foreground">
                    مسجل كـ: <span className="text-foreground font-semibold font-mono">{user.email}</span>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login" className="hover:text-primary transition-colors">
                      تسجيل الدخول
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup" className="hover:text-primary transition-colors">
                      إنشاء حساب جديد
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Credits Bar */}
        <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} منصة حاسبات والمعلومات.
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground/80 select-none">
            <span>صُنع بواسطة</span>
            <span
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("fci_open_admin_modal"))
                }
              }}
              className="font-bold text-primary cursor-pointer hover:underline"
              title="بوابة الإدارة الآمنة (Ctrl + Shift + A)"
            >
              عصام هشام
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
