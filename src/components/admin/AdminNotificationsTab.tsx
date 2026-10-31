"use client"

import * as React from "react"
import {
  Bell,
  Send,
  Users,
  GraduationCap,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
  Trash2,
  ExternalLink,
  Clock,
  RefreshCw,
  Search,
  Filter,
  X,
  Layers,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  dispatchRealNotification,
  fetchAdminNotificationLogs,
  deleteNotificationById,
  type StoredNotification,
} from "@/lib/notifications"
import { getAdminMembers, type AdminMember } from "@/lib/actions/adminMembers"
import { StudentAvatar } from "@/components/dashboard/StudentAvatar"

interface AdminNotificationsTabProps {
  initialTargetMember?: AdminMember | null
  onClearInitialTargetMember?: () => void
  onStatusMessage: (msg: string) => void
}

function formatLogTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "مؤخراً"
  }
}

export function AdminNotificationsTab({
  initialTargetMember,
  onClearInitialTargetMember,
  onStatusMessage,
}: AdminNotificationsTabProps) {
  // Members for direct selection
  const [members, setMembers] = React.useState<AdminMember[]>([])
  const [memberPickerSearch, setMemberPickerSearch] = React.useState("")
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = React.useState(false)

  // Notification Composer Form State
  const [title, setTitle] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [link, setLink] = React.useState("/courses")
  const [targetType, setTargetType] = React.useState<"all" | "level" | "user">("all")
  const [targetLevel, setTargetLevel] = React.useState<number>(1)
  const [selectedUser, setSelectedUser] = React.useState<AdminMember | null>(null)
  const [notifType, setNotifType] = React.useState<"info" | "warning" | "update" | "success">("info")
  const [isSending, setIsSending] = React.useState(false)

  // Notifications History State
  const [history, setHistory] = React.useState<StoredNotification[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(true)
  const [historySearch, setHistorySearch] = React.useState("")
  const [historyFilter, setHistoryFilter] = React.useState<"all" | "broadcast" | "level" | "user">("all")

  // Load initial preselected member if coming from Members tab
  React.useEffect(() => {
    if (initialTargetMember) {
      setTargetType("user")
      setSelectedUser(initialTargetMember)
      setTitle(`تنبيه خاص: ${initialTargetMember.display_name || "عزيزي الطالب"}`)
    }
  }, [initialTargetMember])

  // Load members for direct user picker
  const loadMembers = React.useCallback(async () => {
    try {
      const res = await getAdminMembers()
      if (res.success && res.members) {
        setMembers(res.members)
      }
    } catch {
      // ignore
    }
  }, [])

  // Load notifications log
  const loadHistory = React.useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetchAdminNotificationLogs()
      if (res.success) {
        setHistory(res.notifications)
      } else if (res.error) {
        onStatusMessage(`تنبيه: ${res.error}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر جلب سجل الإشعارات"
      onStatusMessage(msg)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [onStatusMessage])

  React.useEffect(() => {
    loadMembers()
    loadHistory()
  }, [loadMembers, loadHistory])

  // Filtered members for direct picker
  const filteredPickerMembers = React.useMemo(() => {
    const q = memberPickerSearch.trim().toLowerCase()
    if (!q) return members.slice(0, 10)
    return members
      .filter(
        (m) =>
          (m.display_name && m.display_name.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [members, memberPickerSearch])

  // Filtered history log
  const filteredHistory = React.useMemo(() => {
    return history.filter((item) => {
      const q = historySearch.trim().toLowerCase()
      const matchesSearch =
        q === "" ||
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        (item.target_user_name && item.target_user_name.toLowerCase().includes(q))

      let matchesFilter = true
      if (historyFilter === "broadcast") {
        matchesFilter = !item.target_type || item.target_type === "all"
      } else if (historyFilter === "level") {
        matchesFilter = item.target_type === "level"
      } else if (historyFilter === "user") {
        matchesFilter = item.target_type === "user"
      }

      return matchesSearch && matchesFilter
    })
  }, [history, historySearch, historyFilter])

  // Send Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return

    if (targetType === "user" && !selectedUser) {
      alert("يرجى اختيار الطالب المستهدف قبل الإرسال")
      return
    }

    setIsSending(true)
    try {
      const res = await dispatchRealNotification({
        title,
        message,
        link,
        target_type: targetType,
        target_user_id: targetType === "user" ? selectedUser?.id : null,
        target_user_name:
          targetType === "user"
            ? selectedUser?.display_name || selectedUser?.email || "طالب محدد"
            : null,
        target_level: targetType === "level" ? targetLevel : null,
        notification_type: notifType,
      })

      if (res.success) {
        const targetDesc =
          targetType === "all"
            ? "جميع الطلاب"
            : targetType === "level"
            ? `طلاب الفرقة ${targetLevel}`
            : `الطالب ${selectedUser?.display_name || selectedUser?.email}`

        onStatusMessage(`تم بث الإشعار بنجاح إلى (${targetDesc}) وتثبيته في السجل!`)
        setTitle("")
        setMessage("")
        if (onClearInitialTargetMember) {
          onClearInitialTargetMember()
        }
        loadHistory()
      } else {
        alert("فشل إرسال الإشعار: " + (res.error || "حاول ثانية"))
      }
    } finally {
      setIsSending(false)
    }
  }

  // Delete notification from DB
  const handleDeleteNotification = async (notifId: string) => {
    const confirmed = confirm("هل أنت متأكد من حذف هذا الإشعار نهائياً من السجل؟")
    if (!confirmed) return

    const res = await deleteNotificationById(notifId)
    if (res.success) {
      onStatusMessage("تم حذف الإشعار من السجل وقاعدة البيانات.")
      setHistory((prev) => prev.filter((n) => n.id !== notifId))
    } else {
      alert("فشل حذف الإشعار: " + (res.error || "حاول ثانية"))
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Composer Card */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs space-y-6 text-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Send className="size-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-foreground">
              نظام إرسال الإشعارات والتنبيهات المتقدم
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            حدد الفئة المستهدفة (الجميع / فرقة دراسية معينة / طالب محدد)، نوع الإشعار، واكتب رسالتك
            ليتم توصيلها فوراً عبر Realtime وقاعدة البيانات.
          </p>
        </div>

        <form onSubmit={handleSendNotification} className="space-y-6">
          {/* 1. Target Audience Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>1. تحديد المستهدفين بالإشعار:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: All Students */}
              <button
                type="button"
                onClick={() => {
                  setTargetType("all")
                  setSelectedUser(null)
                }}
                className={`p-3.5 rounded-xl border text-start flex items-start gap-3 cursor-pointer transition-all ${
                  targetType === "all"
                    ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                    : "bg-muted/20 border-border hover:bg-muted/40"
                }`}
              >
                <div
                  className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    targetType === "all"
                      ? "bg-primary text-primary-foreground font-black"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Users className="size-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-foreground">جميع الطلاب (عام)</div>
                  <div className="text-[10px] text-muted-foreground">بث عام يصل لكافة طلاب الكلية</div>
                </div>
              </button>

              {/* Option 2: Level Targeted */}
              <button
                type="button"
                onClick={() => {
                  setTargetType("level")
                  setSelectedUser(null)
                }}
                className={`p-3.5 rounded-xl border text-start flex items-start gap-3 cursor-pointer transition-all ${
                  targetType === "level"
                    ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                    : "bg-muted/20 border-border hover:bg-muted/40"
                }`}
              >
                <div
                  className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    targetType === "level"
                      ? "bg-primary text-primary-foreground font-black"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <GraduationCap className="size-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-foreground">فرقة دراسية محددة</div>
                  <div className="text-[10px] text-muted-foreground">توجيه لطلاب سنة معينة فقط</div>
                </div>
              </button>

              {/* Option 3: Specific User */}
              <button
                type="button"
                onClick={() => setTargetType("user")}
                className={`p-3.5 rounded-xl border text-start flex items-start gap-3 cursor-pointer transition-all ${
                  targetType === "user"
                    ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                    : "bg-muted/20 border-border hover:bg-muted/40"
                }`}
              >
                <div
                  className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    targetType === "user"
                      ? "bg-primary text-primary-foreground font-black"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <UserCheck className="size-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-foreground">عضو / طالب محدد</div>
                  <div className="text-[10px] text-muted-foreground">إشعار شخصي وخاص بطالب معين</div>
                </div>
              </button>
            </div>

            {/* Level Selector Options if targetType === 'level' */}
            {targetType === "level" && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center gap-3 animate-in fade-in-50">
                <span className="text-xs font-bold text-foreground">اختر الفرقة المستهدفة:</span>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setTargetLevel(lvl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        targetLevel === lvl
                          ? "bg-primary text-primary-foreground font-black shadow-xs"
                          : "bg-card border border-border hover:bg-muted text-foreground"
                      }`}
                    >
                      الفرقة {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* User Picker if targetType === 'user' */}
            {targetType === "user" && (
              <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2.5 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    اختيار الطالب المستهدف بالإشعار:
                  </span>
                  {selectedUser && (
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-[11px] text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <X className="size-3" />
                      <span>إلغاء التحديد</span>
                    </button>
                  )}
                </div>

                {selectedUser ? (
                  <div className="p-2.5 rounded-xl bg-card border border-primary/40 flex items-center gap-3">
                    <StudentAvatar
                      size="sm"
                      userId={selectedUser.id}
                      userEmail={selectedUser.email}
                      avatarUrl={selectedUser.avatar_url}
                    />
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-black text-foreground">
                        {selectedUser.display_name || "طالب"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {selectedUser.email} (الفرقة {selectedUser.level || 1})
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="size-3.5 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                      <Input
                        value={memberPickerSearch}
                        onChange={(e) => {
                          setMemberPickerSearch(e.target.value)
                          setIsMemberDropdownOpen(true)
                        }}
                        onFocus={() => setIsMemberDropdownOpen(true)}
                        placeholder="ابحث عن اسم أو بريد الطالب..."
                        className="ps-9 text-xs bg-card h-9"
                      />
                    </div>

                    {isMemberDropdownOpen && (
                      <div className="rounded-xl border border-border bg-card p-1 shadow-lg max-h-48 overflow-y-auto space-y-0.5">
                        {filteredPickerMembers.length === 0 ? (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            لم يتم العثور على طالب بهذا الاسم
                          </div>
                        ) : (
                          filteredPickerMembers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedUser(m)
                                setIsMemberDropdownOpen(false)
                                if (!title) {
                                  setTitle(`تنبيه خاص: ${m.display_name || "عزيزي الطالب"}`)
                                }
                              }}
                              className="w-full p-2 rounded-lg text-start flex items-center justify-between hover:bg-muted transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <StudentAvatar
                                  size="sm"
                                  userId={m.id}
                                  userEmail={m.email}
                                  avatarUrl={m.avatar_url}
                                />
                                <div className="truncate">
                                  <div className="text-xs font-bold text-foreground">
                                    {m.display_name || "طالب"}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                                    {m.email}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                الفرقة {m.level || 1}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Notification Type Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">
              2. نوع وتصنيف الإشعار (يظهر كأيقونة ولون في الجرس):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setNotifType("info")}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  notifType === "info"
                    ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/30"
                    : "bg-muted/20 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Info className="size-4 text-primary" />
                <span>إشعار عام (Info)</span>
              </button>

              <button
                type="button"
                onClick={() => setNotifType("warning")}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  notifType === "warning"
                    ? "bg-amber-500/15 border-amber-500 text-amber-500 ring-1 ring-amber-500/30"
                    : "bg-muted/20 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlertTriangle className="size-4 text-amber-500" />
                <span>تنبيه هام (Alert)</span>
              </button>

              <button
                type="button"
                onClick={() => setNotifType("update")}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  notifType === "update"
                    ? "bg-cyan-500/15 border-cyan-500 text-cyan-500 ring-1 ring-cyan-500/30"
                    : "bg-muted/20 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="size-4 text-cyan-500" />
                <span>تحديث محتوى (Update)</span>
              </button>

              <button
                type="button"
                onClick={() => setNotifType("success")}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  notifType === "success"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 ring-1 ring-emerald-500/30"
                    : "bg-muted/20 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>تهنئة ونجاح (Success)</span>
              </button>
            </div>
          </div>

          {/* 3. Title & Content */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">3. عنوان الإشعار:</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تم رفع ملخص وحلول امتحانات مادة هياكل البيانات"
                required
                className="text-xs bg-muted/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">4. نص وتفاصيل الإشعار:</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب تفاصيل التنبيه هنا بوضوح للطلاب..."
                rows={3}
                required
                className="w-full rounded-xl border border-input bg-muted/20 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  5. رابط التوجيه عند الضغط على الإشعار:
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-muted-foreground font-semibold">اقتراحات سريعة:</span>
                  <button
                    type="button"
                    onClick={() => setLink("/courses")}
                    className="text-primary hover:underline font-mono"
                  >
                    /courses
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setLink("/dashboard")}
                    className="text-primary hover:underline font-mono"
                  >
                    /dashboard
                  </button>
                </div>
              </div>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/courses أو رابط مباشر"
                className="text-xs bg-muted/20 font-mono"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 rounded-xl border border-dashed border-primary/30 bg-primary/[0.02] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5 text-primary">
                <Sparkles className="size-3.5" />
                <span>معاينة حية للإشعار (Live Preview):</span>
              </span>
              <span className="text-[10px]">هكذا سيظهر للطالب في جرس التنبيهات</span>
            </div>

            <div className="p-3 rounded-xl border border-primary/30 bg-primary/10 space-y-1.5 text-start">
              <div className="flex items-center gap-1.5 flex-wrap">
                {notifType === "warning" && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/20">
                    <AlertTriangle className="size-2.5" />
                    <span>تنبيه هام</span>
                  </span>
                )}
                {notifType === "update" && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-500 border border-cyan-500/20">
                    <Info className="size-2.5" />
                    <span>تحديث مقرر</span>
                  </span>
                )}
                {notifType === "success" && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="size-2.5" />
                    <span>تهنئة</span>
                  </span>
                )}

                {targetType === "user" && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/25">
                    <UserCheck className="size-2.5" />
                    <span>خاص للطالب: {selectedUser?.display_name || "محدد"}</span>
                  </span>
                )}

                {targetType === "level" && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                    الفرقة {targetLevel}
                  </span>
                )}

                {targetType === "all" && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                    عام لجميع الطلاب
                  </span>
                )}
              </div>

              <div className="text-xs font-black text-foreground">
                {title || "عنوان الإشعار يظهر هنا..."}
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2">
                {message || "تفاصيل الرسالة ومحتوى الإشعار ستظهر هنا للطالب..."}
              </div>
              <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground font-semibold">
                <span className="flex items-center gap-1">
                  <Clock className="size-2.5 text-primary" />
                  <span>الآن</span>
                </span>
                <span className="text-primary flex items-center gap-0.5 font-bold">
                  <span>انتقال للمحتوى</span>
                  <ExternalLink className="size-2.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={isSending}
              className="font-bold text-xs gap-2 px-8 h-10 rounded-xl cursor-pointer shadow-md"
            >
              <Send className={`size-3.5 ${isSending ? "animate-spin" : ""}`} />
              <span>{isSending ? "جاري الإرسال والبث..." : "بث ونشر الإشعار الآن"}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Notifications History Log Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs space-y-4">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <h3 className="text-sm font-black text-foreground">
              سجل الإشعارات المرسلة ({filteredHistory.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="size-3.5 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="بحث في السجل..."
                className="ps-9 text-xs bg-muted/20 h-8 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-1 bg-muted/30 border border-border rounded-lg px-2 py-1 text-xs">
              <Filter className="size-3 text-muted-foreground" />
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as "all" | "broadcast" | "level" | "user")}
                className="bg-transparent text-foreground font-semibold cursor-pointer focus:outline-none text-[11px]"
              >
                <option value="all" className="bg-card">الكل</option>
                <option value="broadcast" className="bg-card">عام فقط</option>
                <option value="level" className="bg-card">فرق فقط</option>
                <option value="user" className="bg-card">شخصي فقط</option>
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs h-8 px-2 rounded-lg cursor-pointer"
              title="تحديث السجل"
            >
              <RefreshCw className={`size-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {isLoadingHistory ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p>جاري تحميل سجل الإشعارات من السيرفر...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60">
              <Bell className="size-5" />
            </div>
            <p className="text-xs font-bold text-foreground">لا توجد إشعارات مسجلة في هذا القسم</p>
            <p className="text-[11px]">الإشعارات التي تبثها ستظهر هنا ويمكنك حذفها وإدارتها.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredHistory.map((item) => {
              const isDirectUser = item.target_type === "user"
              const isLevel = item.target_type === "level"

              return (
                <div
                  key={item.id}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-start"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Header Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.notification_type === "warning" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/25">
                          <AlertTriangle className="size-2.5" />
                          <span>تنبيه هام</span>
                        </span>
                      ) : item.notification_type === "update" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-500 border border-cyan-500/25">
                          <Layers className="size-2.5" />
                          <span>تحديث مقرر</span>
                        </span>
                      ) : item.notification_type === "success" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                          <CheckCircle2 className="size-2.5" />
                          <span>تهنئة</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25">
                          <Info className="size-2.5" />
                          <span>عام</span>
                        </span>
                      )}

                      {/* Target Badge */}
                      {isDirectUser ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/25">
                          <UserCheck className="size-2.5" />
                          <span>طالب محدد: {item.target_user_name || "طالب"}</span>
                        </span>
                      ) : isLevel ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-500 border border-sky-500/25">
                          <GraduationCap className="size-2.5" />
                          <span>الفرقة {item.target_level} فقط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                          <Users className="size-2.5" />
                          <span>جميع الطلاب (بث عام)</span>
                        </span>
                      )}

                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatLogTime(item.created_at)}
                      </span>
                    </div>

                    {/* Title & Message */}
                    <h4 className="text-xs sm:text-sm font-black text-foreground">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.message}
                    </p>

                    {item.link && (
                      <div className="pt-0.5">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
                        >
                          <span>الرابط: {item.link}</span>
                          <ExternalLink className="size-2.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteNotification(item.id)}
                      className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2.5 rounded-xl gap-1 cursor-pointer"
                      title="حذف هذا الإشعار من السجل"
                    >
                      <Trash2 className="size-3.5" />
                      <span className="hidden sm:inline">حذف</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
