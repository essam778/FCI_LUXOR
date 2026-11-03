"use client"

import * as React from "react"
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Pencil,
  Trash2,
  Bell,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  Building2,
  X,
  UserCheck,
  UserX,
  Clock,
  CreditCard,
  CheckCircle2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StudentAvatar } from "@/components/dashboard/StudentAvatar"
import {
  getAdminMembers,
  updateAdminMember,
  quickChangeMemberRole,
  deleteAdminMember,
  type AdminMember,
} from "@/lib/actions/adminMembers"
import { toggleUserSubscriptionAction } from "@/lib/actions/subscriptions"
import type { UserRole } from "@/types/database"

interface AdminMembersTabProps {
  onDirectNotifyMember: (member: AdminMember) => void
  onStatusMessage: (msg: string) => void
}

function formatMemberDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "مؤخراً"
  }
}

export function AdminMembersTab({
  onDirectNotifyMember,
  onStatusMessage,
}: AdminMembersTabProps) {
  const [members, setMembers] = React.useState<AdminMember[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<"all" | "student" | "editor" | "admin">("all")
  const [levelFilter, setLevelFilter] = React.useState<"all" | "1" | "2" | "3" | "4">("all")

  // Edit Modal State
  const [editingMember, setEditingMember] = React.useState<AdminMember | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editRole, setEditRole] = React.useState<UserRole>("student")
  const [editLevel, setEditLevel] = React.useState("1")
  const [editUniversity, setEditUniversity] = React.useState("")
  const [editStatus, setEditStatus] = React.useState("active")
  const [isSaving, setIsSaving] = React.useState(false)

  // Fetch members from database
  const loadMembers = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getAdminMembers()
      if (res.success && res.members) {
        setMembers(res.members)
      } else if (res.error) {
        onStatusMessage(`تنبيه: ${res.error}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر جلب قائمة الأعضاء"
      onStatusMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }, [onStatusMessage])

  React.useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // Filter members
  const filteredMembers = React.useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        q === "" ||
        (m.display_name && m.display_name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.university && m.university.toLowerCase().includes(q))

      const matchesRole = roleFilter === "all" || m.role === roleFilter
      const matchesLevel = levelFilter === "all" || String(m.level) === levelFilter

      return matchesSearch && matchesRole && matchesLevel
    })
  }, [members, searchQuery, roleFilter, levelFilter])

  // Open Edit Modal
  const handleOpenEdit = (m: AdminMember) => {
    setEditingMember(m)
    setEditName(m.display_name || "")
    setEditRole(m.role || "student")
    setEditLevel(String(m.level || 1))
    setEditUniversity(m.university || "")
    setEditStatus(m.status || "active")
  }

  // Save Member Changes
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    setIsSaving(true)
    try {
      const res = await updateAdminMember({
        id: editingMember.id,
        display_name: editName,
        role: editRole,
        level: parseInt(editLevel, 10) || 1,
        university: editUniversity,
        status: editStatus,
      })

      if (res.success) {
        onStatusMessage(`تم تحديث بيانات العضو "${editName}" بنجاح!`)
        setEditingMember(null)
        loadMembers()
      } else {
        alert("فشل التحديث: " + (res.error || "حاول مجدداً"))
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Quick Role Change
  const handleToggleSubscription = async (member: AdminMember) => {
    const isCurrentlyActive = member.subscription_status === "active" || member.subscription_status === "lifetime"
    const targetStatus = isCurrentlyActive ? "unpaid" : "active"
    const confirmMsg = isCurrentlyActive
      ? `هل تريد إيقاف اشتراك الطالب "${member.display_name || member.email}" وقفل المقررات له؟`
      : `هل تريد تفعيل اشتراك الطالب "${member.display_name || member.email}" وفتح جميع المقررات له؟`

    if (!confirm(confirmMsg)) return

    try {
      const res = await toggleUserSubscriptionAction(member.id, targetStatus)
      if (res.success) {
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, subscription_status: targetStatus } : m))
        )
        onStatusMessage(`تم ${targetStatus === "active" ? "تفعيل" : "إيقاف"} اشتراك الطالب بنجاح ✓`)
      } else {
        alert(res.error || "فشل تعديل حالة الاشتراك")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
    }
  }

  const handleQuickRole = async (member: AdminMember, newRole: UserRole) => {
    const roleNames: Record<UserRole, string> = {
      student: "طالب",
      editor: "مشرف محتوى",
      admin: "مدير نظام",
    }
    const confirmed = confirm(
      `هل أنت متأكد من تغيير صلاحية "${member.display_name || member.email}" إلى (${roleNames[newRole]})؟`
    )
    if (!confirmed) return

    const res = await quickChangeMemberRole(member.id, newRole)
    if (res.success) {
      onStatusMessage(`تم تحديث صلاحية العضو إلى ${roleNames[newRole]} بنجاح!`)
      loadMembers()
    } else {
      alert("فشل تغيير الصلاحية: " + (res.error || "حاول مجدداً"))
    }
  }

  // Delete Member
  const handleDelete = async (member: AdminMember) => {
    const confirmed = confirm(
      `⚠️ تحذير: هل أنت متأكد من حذف حساب "${member.display_name || member.email}" نهائياً من قاعدة البيانات؟`
    )
    if (!confirmed) return

    const res = await deleteAdminMember(member.id)
    if (res.success) {
      onStatusMessage("تم حذف العضو من قاعدة البيانات.")
      loadMembers()
    } else {
      alert("فشل حذف العضو: " + (res.error || "حاول مجدداً"))
    }
  }

  const studentsCount = members.filter((m) => m.role === "student").length
  const adminsCount = members.filter((m) => m.role === "admin" || m.role === "editor").length

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/[0.03] space-y-1.5 text-start shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">إجمالي الأعضاء</span>
            <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{members.length}</div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
            مسجلون في قاعدة بيانات Supabase
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-card to-sky-500/[0.03] space-y-1.5 text-start shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">الطلاب المسجلين</span>
            <div className="size-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <GraduationCap className="size-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{studentsCount}</div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
            طلاب كليات الحاسبات والمعلومات
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card to-amber-500/[0.03] space-y-1.5 text-start shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">الإدارة والمشرفين</span>
            <div className="size-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldCheck className="size-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{adminsCount}</div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
            صلاحيات كاملة لإدارة المحتوى
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-card to-emerald-500/[0.03] space-y-1.5 text-start shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">الحسابات النشطة</span>
            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <UserCheck className="size-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {members.filter((m) => m.status !== "banned").length}
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
            حسابات غير محظورة ومصرح لها
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="size-4 text-muted-foreground absolute start-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، البريد الإلكتروني، أو الجامعة..."
            className="ps-10 text-xs bg-muted/20 border-border/80 h-10 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/30 border border-border/80 rounded-xl px-2.5 py-1 text-xs">
            <Filter className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground font-bold">الرتبة:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "all" | "student" | "editor" | "admin")}
              className="bg-transparent text-foreground font-semibold cursor-pointer focus:outline-none"
            >
              <option value="all" className="bg-card">الكل ({members.length})</option>
              <option value="student" className="bg-card">طلاب فقط</option>
              <option value="editor" className="bg-card">مشرفون فقط</option>
              <option value="admin" className="bg-card">مديرون فقط</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/30 border border-border/80 rounded-xl px-2.5 py-1 text-xs">
            <GraduationCap className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground font-bold">الفرقة:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as "all" | "1" | "2" | "3" | "4")}
              className="bg-transparent text-foreground font-semibold cursor-pointer focus:outline-none"
            >
              <option value="all" className="bg-card">جميع الفرق</option>
              <option value="1" className="bg-card">الفرقة 1</option>
              <option value="2" className="bg-card">الفرقة 2</option>
              <option value="3" className="bg-card">الفرقة 3</option>
              <option value="4" className="bg-card">الفرقة 4</option>
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadMembers}
            disabled={isLoading}
            className="text-xs h-9 rounded-xl font-bold gap-1.5 cursor-pointer"
            title="تحديث البيانات من السيرفر"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        </div>
      </div>

      {/* Members List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h3 className="text-sm font-black text-foreground">
              قائمة الأعضاء ({filteredMembers.length})
            </h3>
            {searchQuery && (
              <span className="text-xs text-muted-foreground font-medium">
                (نتائج البحث عن: &quot;{searchQuery}&quot;)
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            تحديث فوري من قاعدة بيانات Supabase
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-3">
            <div className="size-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-bold">جاري تحميل بيانات الأعضاء من قاعدة البيانات...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60">
              <Users className="size-6" />
            </div>
            <p className="text-xs font-bold text-foreground">لم يتم العثور على أعضاء مطابقين</p>
            <p className="text-[11px]">جرب تغيير كلمات البحث أو إعادة تعيين الفلاتر.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredMembers.map((member) => {
              const isAdmin = member.role === "admin"
              const isEditor = member.role === "editor"
              const isBanned = member.status === "banned"

              return (
                <div
                  key={member.id}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                >
                  {/* User Profile Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <StudentAvatar
                      size="md"
                      userId={member.id}
                      userEmail={member.email}
                      avatarUrl={member.avatar_url}
                      className="shrink-0"
                    />

                    <div className="space-y-1 text-start min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-foreground">
                          {member.display_name || "عضو بدون اسم"}
                        </span>

                        {/* Role Badge */}
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/25">
                            <ShieldAlert className="size-3" />
                            <span>مدير النظام</span>
                          </span>
                        ) : isEditor ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
                            <Pencil className="size-2.5" />
                            <span>مشرف محتوى</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-500 border border-sky-500/25">
                            <GraduationCap className="size-3" />
                            <span>طالب</span>
                          </span>
                        )}

                        {/* Status Badge */}
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-md bg-destructive/15 text-destructive border border-destructive/25">
                            <UserX className="size-2.5" />
                            <span>محظور</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>نشط</span>
                          </span>
                        )}

                        {/* Subscription Status Badge */}
                        {member.subscription_status === "active" || member.subscription_status === "lifetime" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                            <CheckCircle2 className="size-2.5" />
                            <span>مفعل (30 ج.م)</span>
                          </span>
                        ) : member.subscription_status === "pending" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
                            <Clock className="size-2.5" />
                            <span>طلب قيد المراجعة</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            غير مشترك
                          </span>
                        )}

                        {/* Level Badge */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/80">
                          الفرقة {member.level || 1}
                        </span>
                      </div>

                      {/* Contact & Meta */}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        <span className="font-mono text-foreground/80 font-semibold">
                          {member.email || "لا يوجد بريد مسجل"}
                        </span>
                        {member.university && (
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3 text-muted-foreground" />
                            <span>{member.university}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="size-3 text-muted-foreground" />
                          <span>انضم: {formatMemberDate(member.created_at)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0 flex-wrap">
                    {/* Toggle Subscription Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleSubscription(member)}
                      className={`text-xs h-8 px-2.5 rounded-xl font-bold gap-1 cursor-pointer ${
                        member.subscription_status === "active" || member.subscription_status === "lifetime"
                          ? "text-rose-500 hover:bg-rose-500/10 border-rose-500/30"
                          : "text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/30"
                      }`}
                      title={
                        member.subscription_status === "active"
                          ? "إلغاء تفعيل اشتراك الطالب وقفل المواد"
                          : "تفعيل اشتراك الطالب فورياً وفتح جميع المواد"
                      }
                    >
                      <CreditCard className="size-3.5" />
                      <span>
                        {member.subscription_status === "active" || member.subscription_status === "lifetime"
                          ? "إيقاف الاشتراك"
                          : "تفعيل الاشتراك"}
                      </span>
                    </Button>

                    {/* Direct Notify Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDirectNotifyMember(member)}
                      className="text-xs h-8 px-2.5 rounded-xl font-bold text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                      title="إرسال إشعار فوري مباشر لهذا الطالب"
                    >
                      <Bell className="size-3.5" />
                      <span className="hidden sm:inline">إرسال إشعار</span>
                    </Button>

                    {/* Quick Role Switcher */}
                    <div className="flex items-center border border-border/80 rounded-xl overflow-hidden bg-muted/20">
                      {member.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => handleQuickRole(member, "admin")}
                          className="px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="ترقية إلى مدير نظام"
                        >
                          +مدير
                        </button>
                      )}
                      {member.role !== "editor" && (
                        <button
                          type="button"
                          onClick={() => handleQuickRole(member, "editor")}
                          className="px-2 py-1 text-[10px] font-bold text-amber-500 hover:bg-amber-500/10 transition-colors border-s border-border/60 cursor-pointer"
                          title="ترقية إلى مشرف"
                        >
                          +مشرف
                        </button>
                      )}
                      {member.role !== "student" && (
                        <button
                          type="button"
                          onClick={() => handleQuickRole(member, "student")}
                          className="px-2 py-1 text-[10px] font-bold text-sky-500 hover:bg-sky-500/10 transition-colors border-s border-border/60 cursor-pointer"
                          title="تحويل إلى طالب"
                        >
                          طالب
                        </button>
                      )}
                    </div>

                    {/* Full Edit Modal */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(member)}
                      className="text-xs h-8 px-2 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                      title="تعديل بيانات العضو"
                    >
                      <Pencil className="size-3.5" />
                    </Button>

                    {/* Delete Member */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(member)}
                      className="text-xs h-8 px-2 rounded-xl text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="حذف حساب العضو نهائياً"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50 duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative text-start">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Pencil className="size-4 text-primary" />
                <span>تعديل بيانات العضو</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                تعديل الاسم، الرتبة، الفرقة الدراسية وحالة الحساب.
              </p>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">الاسم الظاهر:</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="اسم الطالب أو المشرف"
                  required
                  className="text-xs bg-muted/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الصلاحية والرتبة:</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full h-9 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="student" className="bg-card">طالب (Student)</option>
                    <option value="editor" className="bg-card">مشرف محتوى (Editor)</option>
                    <option value="admin" className="bg-card">مدير نظام (Admin)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الفرقة الدراسية:</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full h-9 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="1" className="bg-card">الفرقة 1</option>
                    <option value="2" className="bg-card">الفرقة 2</option>
                    <option value="3" className="bg-card">الفرقة 3</option>
                    <option value="4" className="bg-card">الفرقة 4</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">الجامعة أو الكلية:</label>
                <Input
                  value={editUniversity}
                  onChange={(e) => setEditUniversity(e.target.value)}
                  placeholder="مثال: حاسبات ومعلومات الأقصر"
                  className="text-xs bg-muted/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">حالة الحساب:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active" className="bg-card">نشط ومصرح له (Active)</option>
                  <option value="banned" className="bg-card">محظور وموقف (Banned)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingMember(null)}
                  className="text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="text-xs font-bold px-5 cursor-pointer"
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
