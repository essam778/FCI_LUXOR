"use client"

import * as React from "react"
import Image from "next/image"
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  X,
  Phone,
  Hash,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StudentAvatar } from "@/components/dashboard/StudentAvatar"
import {
  getAdminPaymentRequestsAction,
  approvePaymentRequestAction,
  rejectPaymentRequestAction,
  type PaymentRequestItem,
} from "@/lib/actions/subscriptions"

interface AdminSubscriptionsTabProps {
  onStatusMessage: (msg: string) => void
}

function formatRequestDate(dateStr: string): string {
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

export function AdminSubscriptionsTab({ onStatusMessage }: AdminSubscriptionsTabProps) {
  const [requests, setRequests] = React.useState<PaymentRequestItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "pending" | "approved" | "rejected">("pending")

  // Modal for previewing screenshot
  const [previewScreenshot, setPreviewScreenshot] = React.useState<string | null>(null)

  // Rejection modal state
  const [rejectingItem, setRejectingItem] = React.useState<PaymentRequestItem | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null)

  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const loadRequests = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getAdminPaymentRequestsAction()
      if (res.success && res.requests) {
        setRequests(res.requests)
      } else if (res.error) {
        onStatusMessage(`تنبيه: ${res.error}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر تحميل طلبات الاشتراك"
      onStatusMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }, [onStatusMessage])

  React.useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleApprove = async (item: PaymentRequestItem) => {
    if (!confirm(`هل أنت متأكد من تفعيل اشتراك الطالب "${item.user?.display_name || item.sender_phone}"؟`)) {
      return
    }

    setIsProcessing(item.id)
    try {
      const res = await approvePaymentRequestAction(item.id, item.user_id)
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, status: "approved" as const } : r))
        )
        onStatusMessage(`✅ تم تفعيل حساب الطالب "${item.user?.display_name || item.sender_phone}" بنجاح!`)
      } else {
        alert(res.error || "فشل تفعيل الطلب")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
    } finally {
      setIsProcessing(null)
    }
  }

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingItem) return

    setIsProcessing(rejectingItem.id)
    try {
      const res = await rejectPaymentRequestAction(
        rejectingItem.id,
        rejectingItem.user_id,
        rejectReason.trim() || undefined
      )
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === rejectingItem.id
              ? { ...r, status: "rejected" as const, admin_notes: rejectReason }
              : r
          )
        )
        onStatusMessage(`تم رفض طلب التحويل وإرسال التنبيه للطالب.`)
        setRejectingItem(null)
        setRejectReason("")
      } else {
        alert(res.error || "فشل رفض الطلب")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "حدث خطأ أثناء الرفض")
    } finally {
      setIsProcessing(null)
    }
  }

  // Filtered list
  const filteredRequests = React.useMemo(() => {
    return requests.filter((r) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        q === "" ||
        (r.user?.display_name && r.user.display_name.toLowerCase().includes(q)) ||
        (r.user?.email && r.user.email.toLowerCase().includes(q)) ||
        r.sender_phone.includes(q) ||
        r.reference_number.toLowerCase().includes(q)

      const matchesStatus = statusFilter === "all" || r.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [requests, searchQuery, statusFilter])

  // Metrics
  const totalCount = requests.length
  const pendingCount = requests.filter((r) => r.status === "pending").length
  const approvedCount = requests.filter((r) => r.status === "approved").length
  const totalRevenue = approvedCount * 30

  return (
    <div className="space-y-6 text-start" dir="rtl">
      {/* 1. Header & Quick Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <span>طلبات تفعيل الاشتراكات والمدفوعات</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            راجع إيصالات فودافون كاش وانستا باي المرفوعة وفعّل حسابات الطلاب بضغطة زر.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadRequests}
          disabled={isLoading}
          className="text-xs font-bold gap-1.5 h-9 rounded-xl cursor-pointer self-end sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>تحديث الطلبات</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-bold">بانتظار المراجعة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-500">{pendingCount}</span>
            <Clock className="size-4 text-amber-500" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-bold">الاشتراكات المفعلة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-500">{approvedCount}</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-bold">إجمالي الإيرادات المحققة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-primary">{totalRevenue} ج.م</span>
            <Sparkles className="size-4 text-primary" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-bold">إجمالي الطلبات المستلمة</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{totalCount}</span>
            <CreditCard className="size-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالطالب، الهاتف، أو الرقم المرجعي..."
            className="ps-9 h-9 text-xs bg-muted/20 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              مسح
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === "pending"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            قيد المراجعة ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("approved")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === "approved"
                ? "bg-emerald-500 text-white shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            المفعلة ({approvedCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === "rejected"
                ? "bg-rose-500 text-white shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            المرفوضة
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            الكل ({totalCount})
          </button>
        </div>
      </div>

      {/* 3. Requests List */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground space-y-3">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>جاري فحص طلبات الدفع والتحويلات...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-border p-8 space-y-2">
          <CreditCard className="size-8 text-muted-foreground mx-auto stroke-[1.5]" />
          <h4 className="text-sm font-bold text-foreground">لا توجد طلبات مطابقة</h4>
          <p className="text-xs text-muted-foreground">
            {statusFilter === "pending"
              ? "رائع! لا توجد طلبات تحويل جديدة قيد الانتظار حالياً."
              : "لم نجد أي طلبات تطابق معايير البحث المحددة."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((item) => {
            const isPending = item.status === "pending"
            const isApproved = item.status === "approved"
            const isRejected = item.status === "rejected"

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs ${
                  isPending
                    ? "bg-card border-amber-500/40 hover:border-amber-500 shadow-amber-500/5"
                    : isApproved
                    ? "bg-card/70 border-border hover:border-emerald-500/40"
                    : "bg-muted/20 border-border/60 opacity-80"
                }`}
              >
                {/* Left: Student Info & Payment Details */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <StudentAvatar
                    userId={item.user_id}
                    userEmail={item.user?.email}
                    fallbackText={item.user?.display_name || item.sender_phone}
                    className="size-11 rounded-2xl shrink-0 mt-0.5"
                  />

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {item.user?.display_name || "طالب"}
                      </h4>
                      {item.user?.level && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          الفرقة {item.user.level}
                        </span>
                      )}
                      {item.payment_method === "vodafone_cash" ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/25">
                          فودافون كاش
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500 border border-violet-500/25">
                          انستا باي InstaPay
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {item.user?.email || "بدون بريد"} • {formatRequestDate(item.created_at)}
                    </p>

                    {/* Transfer Identifiers (Phone & Reference) */}
                    <div className="flex items-center gap-3 text-xs flex-wrap pt-1">
                      <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/80">
                        <Phone className="size-3 text-muted-foreground" />
                        <span className="text-muted-foreground text-[11px]">رقم المحول:</span>
                        <strong className="font-mono text-foreground" dir="ltr">
                          {item.sender_phone}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.sender_phone, `phone-${item.id}`)}
                          className="text-muted-foreground hover:text-foreground ms-1 cursor-pointer"
                          title="نسخ رقم الهاتف"
                        >
                          {copiedId === `phone-${item.id}` ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/80">
                        <Hash className="size-3 text-muted-foreground" />
                        <span className="text-muted-foreground text-[11px]">الرقم المرجعي:</span>
                        <strong className="font-mono text-foreground" dir="ltr">
                          {item.reference_number}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.reference_number, `ref-${item.id}`)}
                          className="text-muted-foreground hover:text-foreground ms-1 cursor-pointer"
                          title="نسخ الرقم المرجعي"
                        >
                          {copiedId === `ref-${item.id}` ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>

                      <span className="font-black text-xs text-emerald-500">
                        {item.amount || 30} ج.م
                      </span>
                    </div>

                    {item.admin_notes && (
                      <p className="text-[11px] text-rose-500 pt-1">
                        سبب الرفض السابق: {item.admin_notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Screenshot preview & Action Buttons */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border/60 shrink-0">
                  {/* Screenshot Thumbnail */}
                  {item.screenshot_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewScreenshot(item.screenshot_url || null)}
                      className="group relative size-12 rounded-xl overflow-hidden border border-border hover:border-primary shrink-0 transition-all cursor-pointer shadow-xs"
                      title="عرض إيصال التحويل بالحجم الكامل"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.screenshot_url}
                        alt="إيصال الدفع"
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="size-4" />
                      </div>
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                      بدون صورة إيصال
                    </span>
                  )}

                  {/* Actions */}
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={isProcessing === item.id}
                        onClick={() => handleApprove(item)}
                        className="h-9 px-3 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-600 text-white gap-1 shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>تفعيل الحساب</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing === item.id}
                        onClick={() => setRejectingItem(item)}
                        className="h-9 px-3 rounded-xl font-bold text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1 cursor-pointer"
                      >
                        <XCircle className="size-3.5" />
                        <span>رفض</span>
                      </Button>
                    </div>
                  ) : isApproved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="size-3.5" />
                      <span>مفعل ومقبول</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                      <XCircle className="size-3.5" />
                      <span>مرفوض</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW HIGH-RES SCREENSHOT */}
      {/* ========================================================================= */}
      {previewScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in-50">
          <div className="relative max-w-2xl w-full max-h-[90vh] bg-card rounded-3xl border border-border shadow-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-foreground">إيصال التحويل وسكرين شوت العملية</h4>
              <button
                type="button"
                onClick={() => setPreviewScreenshot(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="relative flex-1 overflow-auto rounded-2xl bg-black/60 flex items-center justify-center p-2 min-h-[350px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewScreenshot}
                alt="Receipt Full Preview"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <a
                href={previewScreenshot}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline"
              >
                <span>فتح في نافذة مستقلة</span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REJECT REASON */}
      {/* ========================================================================= */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in-50">
          <div className="relative max-w-md w-full bg-card rounded-3xl border border-border shadow-2xl p-6 space-y-4">
            <div className="space-y-1 text-start">
              <h4 className="text-base font-black text-foreground flex items-center gap-2">
                <XCircle className="size-5 text-destructive" />
                <span>رفض طلب التحويل</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                يرجى توضيح سبب الرفض ليظهر للطالب ويعيد المحاولة بالبيانات الصحيحة.
              </p>
            </div>

            <form onSubmit={handleRejectConfirm} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">سبب الرفض:</label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: الرقم المرجعي غير مطابق، أو لم يصل التحويل بالمحفظة"
                  required
                  className="h-10 text-xs bg-muted/20 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRejectingItem(null)
                    setRejectReason("")
                  }}
                  className="text-xs h-9 rounded-xl"
                >
                  إلغاء
                </Button>

                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={isProcessing === rejectingItem.id}
                  className="text-xs font-bold h-9 rounded-xl"
                >
                  {isProcessing === rejectingItem.id ? "جاري الرفض..." : "تأكيد الرفض"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
