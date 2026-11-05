"use client"

import * as React from "react"
import { Bell, CheckCheck, Clock, Inbox, ExternalLink, AlertTriangle, CheckCircle2, Info, UserCheck } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export interface DbNotification {
  id: string
  title: string
  message: string
  link: string | null
  target_type?: "all" | "level" | "user" | null
  target_user_id?: string | null
  target_user_name?: string | null
  target_level?: number | null
  notification_type?: "info" | "warning" | "update" | "success" | null
  created_at: string
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 2) return "الآن"
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`
    if (diffHours === 1) return "منذ ساعة"
    if (diffHours === 2) return "منذ ساعتين"
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays === 1) return "أمس"
    if (diffDays === 2) return "منذ يومين"
    return `منذ ${diffDays} أيام`
  } catch {
    return "مؤخراً"
  }
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<DbNotification[]>([])
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = React.useState(true)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [userLevel, setUserLevel] = React.useState<number | null>(null)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const popoverRef = React.useRef<HTMLDivElement>(null)

  // 1. Load current user ID & Read IDs & User Profile
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const uId = data.user?.id || null
      setCurrentUserId(uId)
      if (uId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
          .select("level, role")
          .eq("id", uId)
          .single()

        if (profile) {
          setUserLevel(profile.level || 1)
          setIsAdmin(profile.role === "admin" || profile.role === "editor")
        }
      }

      if (typeof window !== "undefined") {
        try {
          const key = uId ? `fci_read_notifs_${uId}` : "fci_read_notifs_guest"
          const stored = localStorage.getItem(key)
          if (stored) {
            setReadIds(new Set(JSON.parse(stored)))
          }
        } catch {
          // ignore
        }
      }
    })
  }, [])

  // 2. Fetch ground truth notifications directly from Supabase DB
  const fetchDbNotifications = React.useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15)

      if (error) {
        console.warn("Could not fetch notifications from Supabase:", error.message)
      } else if (data) {
        setNotifications(data as DbNotification[])
      }
    } catch (err) {
      console.error("Error loading notifications:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Listen for read updates across multiple mounted instances (desktop + mobile)
  React.useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<string[]>
      if (custom.detail) {
        setReadIds(new Set(custom.detail))
      } else if (typeof window !== "undefined") {
        const key = currentUserId ? `fci_read_notifs_${currentUserId}` : "fci_read_notifs_guest"
        const stored = localStorage.getItem(key)
        if (stored) {
          try {
            setReadIds(new Set(JSON.parse(stored)))
          } catch {
            // ignore
          }
        }
      }
    }
    window.addEventListener("fci_notifs_read_updated", handleSync)
    return () => window.removeEventListener("fci_notifs_read_updated", handleSync)
  }, [currentUserId])

  React.useEffect(() => {
    fetchDbNotifications()

    // 3. Setup Supabase Realtime Subscription for live instant notifications
    // Use unique channel identifier to avoid duplicate subscription collisions across instances
    const supabase = createClient()
    const uniqueChannelName = `notifs_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.new) {
            const newNotif = payload.new as DbNotification
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev
              return [newNotif, ...prev]
            })
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.old?.id) {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Also listen to local dispatch events
    const handleLocalNew = () => fetchDbNotifications()
    window.addEventListener("fci_new_notification", handleLocalNew)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener("fci_new_notification", handleLocalNew)
    }
  }, [fetchDbNotifications])

  // Filter notifications visible to this user:
  // - If admin, sees all
  // - Otherwise: target_type === 'all' OR target_user_id === currentUserId OR target_level === userLevel
  const visibleNotifications = React.useMemo(() => {
    return notifications.filter((item) => {
      if (isAdmin) return true
      if (!item.target_type || item.target_type === "all") return true
      if (item.target_type === "user" && item.target_user_id === currentUserId) return true
      if (item.target_type === "level" && item.target_level === userLevel) return true
      return false
    })
  }, [notifications, isAdmin, currentUserId, userLevel])

  // Unread count
  const unreadCount = visibleNotifications.filter((n) => !readIds.has(n.id)).length

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const markAllAsRead = () => {
    const allIds = new Set(visibleNotifications.map((n) => n.id))
    setReadIds(allIds)
    if (typeof window !== "undefined") {
      try {
        const key = currentUserId ? `fci_read_notifs_${currentUserId}` : "fci_read_notifs_guest"
        localStorage.setItem(key, JSON.stringify(Array.from(allIds)))
        window.dispatchEvent(
          new CustomEvent("fci_notifs_read_updated", { detail: Array.from(allIds) })
        )
      } catch {
        // ignore
      }
    }
  }

  const handleNotificationClick = (item: DbNotification) => {
    setIsOpen(false)
    if (!readIds.has(item.id)) {
      const next = new Set(readIds)
      next.add(item.id)
      setReadIds(next)
      if (typeof window !== "undefined") {
        try {
          const key = currentUserId ? `fci_read_notifs_${currentUserId}` : "fci_read_notifs_guest"
          localStorage.setItem(key, JSON.stringify(Array.from(next)))
          window.dispatchEvent(
            new CustomEvent("fci_notifs_read_updated", { detail: Array.from(next) })
          )
        } catch {
          // ignore
        }
      }
    }
  }

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        aria-label="الإشعارات والتحديثات"
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 end-1.5 flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-primary" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto end-2 sm:end-0 top-14 sm:top-full mt-1 sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-16px)] rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-3 shadow-2xl z-50 space-y-3 animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60 px-1">
            <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-foreground">
              <Bell className="size-3.5 text-primary" />
              <span>الإشعارات وتحديثات المنصة</span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="size-3" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
          </div>

          {/* List of Real Notifications */}
          <div className="space-y-2 max-h-84 overflow-y-auto pe-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p>جاري جلب الإشعارات الفورية...</p>
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground space-y-2">
                <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60 border border-border/60">
                  <Inbox className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">لا توجد إشعارات حالياً</p>
                  <p className="text-[11px]">سيتم إشعارك فور نشر محاضرات أو ملخصات جديدة.</p>
                </div>
              </div>
            ) : (
              visibleNotifications.map((item) => {
                const isUnread = !readIds.has(item.id)
                let targetLink = item.link && item.link.trim() ? item.link : "/courses"
                const lowerText = `${item.title} ${item.message}`.toLowerCase()
                if (targetLink === "/courses" || !item.link) {
                  if (
                    lowerText.includes("أشباه الموصلات") ||
                    lowerText.includes("إلكترونيات") ||
                    lowerText.includes("semiconductor") ||
                    lowerText.includes("electronics")
                  ) {
                    targetLink = "/courses/electronics-fundamentals?lecture=elec-lec-1"
                  } else if (
                    lowerText.includes("برمجة") ||
                    lowerText.includes("programming") ||
                    lowerText.includes("c++")
                  ) {
                    targetLink = "/courses/structured-programming"
                  } else if (
                    lowerText.includes("تفاضل") ||
                    lowerText.includes("رياضيات") ||
                    lowerText.includes("calculus")
                  ) {
                    targetLink = "/courses/calculus-1"
                  } else if (lowerText.includes("فيزياء") || lowerText.includes("physics")) {
                    targetLink = "/courses/physics-1"
                  }
                }
                const isPersonal = item.target_type === "user" && item.target_user_id === currentUserId
                const isLevel = item.target_type === "level"

                return (
                  <Link
                    key={item.id}
                    href={targetLink}
                    onClick={() => handleNotificationClick(item)}
                    className={`block p-3 rounded-xl border text-start transition-all cursor-pointer relative ${
                      isUnread
                        ? "bg-primary/10 border-primary/30 shadow-xs hover:bg-primary/15 ring-1 ring-primary/20"
                        : "bg-card border-border/60 hover:bg-muted/30"
                    }`}
                  >
                    {isUnread && (
                      <span className="absolute top-3 end-3 size-2 rounded-full bg-primary" />
                    )}
                    <div className="space-y-1.5 pe-4">
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.notification_type === "warning" && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/20">
                            <AlertTriangle className="size-2.5" />
                            <span>تنبيه هام</span>
                          </span>
                        )}
                        {item.notification_type === "success" && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 className="size-2.5" />
                            <span>تهنئة</span>
                          </span>
                        )}
                        {item.notification_type === "update" && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-500 border border-cyan-500/20">
                            <Info className="size-2.5" />
                            <span>تحديث مقرر</span>
                          </span>
                        )}

                        {isPersonal && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/25">
                            <UserCheck className="size-2.5" />
                            <span>إشعار شخصي لك</span>
                          </span>
                        )}

                        {isLevel && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                            الفرقة {item.target_level}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-black text-foreground flex items-center gap-1.5 leading-snug">
                        <span>{item.title}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {item.message}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground font-semibold">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-2.5 text-primary" />
                          <span>{formatRelativeTime(item.created_at)}</span>
                        </span>
                        <span className="text-primary flex items-center gap-0.5 hover:underline font-bold">
                          <span>انتقال للمحتوى</span>
                          <ExternalLink className="size-2.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
