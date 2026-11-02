"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import Link from "next/link"

import { usePathname } from "next/navigation"
import {
  BookOpen,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { NavbarSearch } from "@/components/layout/NavbarSearch"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { StudentAvatar } from "@/components/dashboard/StudentAvatar"
import { logout } from "@/lib/actions/auth"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface NavbarProps {
  initialUser?: User | null
}

export function Navbar({ initialUser = null }: NavbarProps) {
  const [user, setUser] = React.useState<User | null>(initialUser)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = React.useState(false)
  const avatarMenuRef = React.useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when mobile drawer is open
  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  // Close avatar dropdown on click outside
  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  React.useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser)
    }
  }, [initialUser])

  React.useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setUser(data.user)
        }
      })

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

      return () => {
        subscription.unsubscribe()
      }
    } catch (err) {
      console.error("Navbar auth client error:", err)
    }
  }, [])

  // Fetch profile role and avatar_url directly from Supabase
  const fetchProfileData = React.useCallback(async (uid: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("profiles")
        .select("role, avatar_url")
        .eq("id", uid)
        .single()
      if (data) {
        setIsAdmin((data as { role?: string }).role === "admin")
        setAvatarUrl((data as { avatar_url?: string | null }).avatar_url || null)
      }
    } catch {
      setIsAdmin(false)
      setAvatarUrl(null)
    }
  }, [])

  React.useEffect(() => {
    if (user?.id) {
      fetchProfileData(user.id)
    } else {
      setIsAdmin(false)
      setAvatarUrl(null)
    }
  }, [user, fetchProfileData])

  // Listen to profile updates (e.g. when photo is saved in EditProfileModal)
  React.useEffect(() => {
    const handleAvatarUpdate = () => {
      if (user?.id) {
        fetchProfileData(user.id)
      }
    }
    window.addEventListener("fci_avatar_updated", handleAvatarUpdate)
    return () => window.removeEventListener("fci_avatar_updated", handleAvatarUpdate)
  }, [user?.id, fetchProfileData])

  // Close drawer on path change
  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 glass-header">
      <div className="w-full max-w-7xl mx-auto flex h-16 items-center justify-between px-3 sm:px-6">
        {/* Right (Start in RTL): Logo & Main Nav */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-foreground hover:opacity-90 transition-opacity shrink-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/40 shrink-0">
              <GraduationCap className="size-5" />
            </div>
            <span className="font-extrabold text-sm sm:text-lg tracking-tight text-foreground truncate">
              FCI Luxor
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5">
            <Link
              href="/courses"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                pathname.startsWith("/courses")
                  ? "text-primary bg-primary/10 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <BookOpen className="size-4" />
              <span>المقررات الدراسية</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  pathname.startsWith("/admin")
                    ? "text-primary bg-primary/15 border border-primary/30"
                    : "text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20"
                }`}
              >
                <ShieldCheck className="size-3.5" />
                <span>لوحة الإدارة</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Center: Functional Search Box */}
        <div className="hidden lg:flex items-center flex-1 max-w-sm mx-6">
          <NavbarSearch />
        </div>

        {/* Left (End in RTL): Auth actions, Notifications, & ThemeToggle */}
        <div className="hidden md:flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />

          {user ? (
            /* User Avatar Popover Menu */
            <div ref={avatarMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-2xl hover:bg-muted/60 transition-colors cursor-pointer border border-transparent hover:border-border select-none"
                aria-expanded={avatarMenuOpen}
              >
                <StudentAvatar size="sm" userId={user.id} userEmail={user.email} avatarUrl={avatarUrl} />
                <span className="text-xs font-bold text-foreground max-w-[100px] truncate hidden xl:inline">
                  {user.email?.split("@")[0]}
                </span>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                    avatarMenuOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>

              {avatarMenuOpen && (
                <div className="absolute end-0 top-full mt-2 w-64 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-2 shadow-2xl z-50 space-y-1 animate-in fade-in-50 zoom-in-95 duration-150 text-start">
                  {/* User Profile Header */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                    <StudentAvatar size="sm" userId={user.id} userEmail={user.email} avatarUrl={avatarUrl} />
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="text-xs font-bold text-foreground truncate">
                        {user.email}
                      </div>
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                        {isAdmin ? "مدير المنصة" : "طالب مسجل"}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setAvatarMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full p-2 rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors"
                    >
                      <LayoutDashboard className="size-4 text-primary" />
                      <span>لوحة التحكم</span>
                    </Link>

                    <Link
                      href="/courses"
                      onClick={() => setAvatarMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full p-2 rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors"
                    >
                      <BookOpen className="size-4 text-primary" />
                      <span>المقررات الدراسية</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="flex items-center gap-2.5 w-full p-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                      >
                        <ShieldCheck className="size-4 text-primary" />
                        <span>لوحة الإدارة</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-border/60 pt-1">
                    <form action={logout}>
                      <button
                        type="submit"
                        className="flex items-center gap-2.5 w-full p-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors text-start cursor-pointer"
                      >
                        <LogOut className="size-4" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-bold">
                  <UserIcon className="size-4" />
                  <span>تسجيل الدخول</span>
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="text-xs font-extrabold shadow-sm">
                  حساب جديد
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu hamburger button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة الجانبية"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      {/* Side-Sliding Mobile Drawer & Backdrop (rendered via portal directly into document.body to avoid backdrop-filter stacking bug) */}
      {mounted && mobileOpen && createPortal(
        <div className="fixed inset-0 z-[999] md:hidden" dir="rtl">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Side Drawer Sheet (Sliding from Right for RTL) */}
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] h-full bg-card border-s border-border p-5 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 z-50 overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Top Header with Logo and Close X */}
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 font-bold text-foreground"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <GraduationCap className="size-4.5" />
                  </div>
                  <span className="font-extrabold text-sm">FCI Luxor</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  className="size-8 rounded-lg cursor-pointer"
                  aria-label="إغلاق القائمة"
                >
                  <X className="size-5" />
                </Button>
              </div>

              {/* Search Inside Drawer */}
              <NavbarSearch />

              {/* Navigation Links */}
              <nav className="flex flex-col space-y-1.5 text-start">
                <Link
                  href="/courses"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                >
                  <BookOpen className="size-4 text-primary" />
                  <span>المقررات الدراسية</span>
                </Link>

                {user && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    <LayoutDashboard className="size-4 text-primary" />
                    <span>لوحة التحكم</span>
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    <ShieldCheck className="size-4 text-primary" />
                    <span>لوحة الإدارة</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Drawer Bottom Auth Section */}
            <div className="pt-6 border-t border-border/60">
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 text-start">
                    <StudentAvatar size="sm" userId={user.id} userEmail={user.email} avatarUrl={avatarUrl} />
                    <div className="overflow-hidden space-y-0.5">
                      <div className="text-xs font-bold text-foreground truncate">
                        {user.email}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {isAdmin ? "مدير المنصة" : "طالب"}
                      </span>
                    </div>
                  </div>

                  <form action={logout}>
                    <Button
                      variant="outline"
                      className="w-full justify-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 text-xs font-bold h-9 cursor-pointer"
                      type="submit"
                    >
                      <LogOut className="size-4" />
                      <span>تسجيل الخروج</span>
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full text-xs font-bold h-9">
                      دخول
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full text-xs font-bold h-9">حساب جديد</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}
