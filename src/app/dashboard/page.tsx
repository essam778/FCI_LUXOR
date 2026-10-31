import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { LayoutDashboard, BookOpen, GraduationCap, ShieldCheck, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditProfileModal } from "@/components/dashboard/EditProfileModal"
import { StudentAvatar } from "@/components/dashboard/StudentAvatar"

import type { Database } from "@/types/database"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirectTo=/dashboard")
  }

  // Fetch profile
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  const profile = data as Profile | null
  const currentLevel = profile?.level || 1
  const displayName = profile?.display_name || user.email?.split("@")[0] || "طالب"
  const university = profile?.university || ""
  // Strict role check: ONLY if profile.role === "admin" in database
  const isAdmin = profile?.role === "admin"

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8">
      {/* Welcome & Profile Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
          <StudentAvatar
            size="lg"
            className="size-12 sm:size-16 shrink-0"
            userId={user.id}
            userEmail={user.email}
            avatarUrl={profile?.avatar_url}
          />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-2xl font-black text-foreground leading-snug">
                مرحباً بك، {displayName} 👋
              </h1>
              {isAdmin && (
                <span className="text-[10px] sm:text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <ShieldCheck className="size-3" />
                  <span>مدير المنصة</span>
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              {university ? `${university} • ` : ""}الفرقة {currentLevel} • رتبة الحساب: {isAdmin ? "مدير" : "طالب"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-stretch sm:justify-end pt-3 sm:pt-0 border-t sm:border-0 border-border/50">
          <div className="flex-1 sm:flex-initial">
            <EditProfileModal
              userId={user.id}
              currentName={displayName}
              currentLevel={currentLevel}
              currentUniversity={university}
              currentAvatarUrl={profile?.avatar_url}
            />
          </div>
          {isAdmin && (
            <Link href="/admin" className="flex-1 sm:flex-initial">
              <Button size="sm" className="w-full sm:w-auto text-xs font-bold gap-1.5 h-8">
                <ShieldCheck className="size-3.5" />
                <span>لوحة الإدارة</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Academic Navigation Banner */}
      <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm text-foreground">
            مقررات الفرقة {currentLevel} جاهزة للدراسة
          </h3>
          <p className="text-xs text-muted-foreground">
            تصفح مقررات ومحاضرات الترم الأول والثاني المخصصة لفرقتك الدراسية الآن.
          </p>
        </div>
        <Link href="/courses">
          <Button size="sm" className="gap-2 text-xs font-bold">
            <BookOpen className="size-4" />
            <span>فتح مقررات الفرقة {currentLevel}</span>
            <ArrowLeft className="size-3.5 rtl:rotate-0 rotate-180" />
          </Button>
        </Link>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">الفرقة المسجل بها</span>
            <GraduationCap className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">الفرقة {currentLevel}</div>
          <p className="text-[11px] text-muted-foreground">يمكنك تعديلها في أي وقت من زر التعديل بالأعلى</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">المقررات النشطة</span>
            <BookOpen className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">8 مقررات</div>
          <p className="text-[11px] text-muted-foreground">موزعة بين الترم الأول والثاني</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">البريد الإلكتروني</span>
            <LayoutDashboard className="size-4 text-primary" />
          </div>
          <div className="text-xs font-bold font-mono text-foreground truncate">{user.email}</div>
          <p className="text-[11px] text-muted-foreground">حساب معتمد ومفعل</p>
        </div>
      </div>
    </div>
  )
}
