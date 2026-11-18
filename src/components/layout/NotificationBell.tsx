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

  // 1. Check user authentication. Strictly only authenticated users can see or fetch notifications.
  React.useEffect(() => {
    const supabase = createClient()

    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()
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

        if (typeof window !== "undefined") {
          try {
            const key = `fci_read_notifs_${uId}`
            const stored = localStorage.getItem(key)
            if (stored) {
              setReadIds(new Set(JSON.parse(stored)))
            }
          } catch {
            // ignore
          }
        }
      } else {
        setIsLoading(false)
        setNotifications([])
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uId = session?.user?.id || null
      setCurrentUserId(uId)
      if (!uId) {
        setNotifications([])
        setUserLevel(null)
        setIsAdmin(false)
        setIsLoading(false)
      } else {
        checkAuth()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 2. Fetch ground truth notifications directly from Supabase DB (authenticated users only)
  const fetchDbNotifications = React.useCallback(async () => {
    if (!currentUserId) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, link, target_type, target_user_id, target_user_name, target_level, notification_type, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
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
  }, [currentUserId])

  // Listen for read updates across multiple mounted instances (desktop + mobile)
  React.useEffect(() => {
    if (!currentUserId) return

    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<string[]>
      if (custom.detail) {
        setReadIds(new Set(custom.detail))
      } else if (typeof window !== "undefined") {
        const key = `fci_read_notifs_${currentUserId}`
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
    if (!currentUserId) return

    fetchDbNotifications()

    // 3. Setup Supabase Realtime Subscription for live instant notifications
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
  }, [currentUserId, fetchDbNotifications])

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
    if (typeof window !== "undefined" && currentUserId) {
      try {
        const key = `fci_read_notifs_${currentUserId}`
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
      if (typeof window !== "undefined" && currentUserId) {
        try {
          const key = `fci_read_notifs_${currentUserId}`
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

  // Strictly do NOT render the notification bell for unauthenticated visitors
  if (!currentUserId) {
    return null
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

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute end-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-3 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-150 text-start">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">الإشعارات</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {unreadCount} جديد
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                <span>تعيين الكل كمقروء</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto space-y-1.5 divide-y divide-border/30">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                جاري تحميل الإشعارات...
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <Inbox className="size-5" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground">
                  لا توجد إشعارات جديدة حالياً
                </p>
              </div>
            ) : (
              visibleNotifications.map((item) => {
                const isUnread = !readIds.has(item.id)

                const typeConfig = {
                  info: {
                    badge: "معلومات",
                    icon: Info,
                    border: "border-sky-500/20",
                    bg: "bg-sky-500/10",
                    text: "text-sky-500",
                  },
                  warning: {
                    badge: "تنبيه هام",
                    icon: AlertTriangle,
                    border: "border-amber-500/20",
                    bg: "bg-amber-500/10",
                    text: "text-amber-500",
                  },
                  update: {
                    badge: "تحديث أكاديمي",
                    icon: CheckCircle2,
                    border: "border-primary/20",
                    bg: "bg-primary/10",
                    text: "text-primary",
                  },
                  success: {
                    badge: "إشعار إيجابي",
                    icon: CheckCircle2,
                    border: "border-emerald-500/20",
                    bg: "bg-emerald-500/10",
                    text: "text-emerald-500",
                  },
                }[item.notification_type || "info"]

                const IconComponent = typeConfig.icon

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`pt-2 first:pt-0 p-2.5 rounded-xl transition-colors cursor-pointer ${
                      isUnread ? "bg-muted/40 hover:bg-muted/60" : "hover:bg-muted/20 opacity-80"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`size-8 rounded-lg shrink-0 flex items-center justify-center ${typeConfig.bg} ${typeConfig.text} mt-0.5`}
                      >
                        <IconComponent className="size-4" />
                      </div>

                      <div className="flex-1 space-y-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">
                              {item.title}
                            </span>
                            {item.target_type === "user" && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-0.5">
                                <UserCheck className="size-2.5" />
                                <span>موجه لك</span>
                              </span>
                            )}
                            {item.target_type === "level" && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                الفرقة {item.target_level}
                              </span>
                            )}
                          </div>
                          {isUnread && (
                            <span className="size-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            <span>{formatRelativeTime(item.created_at)}</span>
                          </span>

                          {item.link && (
                            <Link
                              href={item.link}
                              onClick={(e) => {
                                e.stopPropagation()
                                setIsOpen(false)
                              }}
                              className="text-primary hover:underline font-bold inline-flex items-center gap-0.5"
                            >
                              <span>فتح</span>
                              <ExternalLink className="size-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
