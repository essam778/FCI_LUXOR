"use client"

import * as React from "react"
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  X,
  Phone,
  Hash,
  UserCheck,
  RotateCcw,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StudentAvatar } from "@/components/dashboard/StudentAvatar"
import {
  getAdminPaymentRequestsAction,
  approvePaymentRequestAction,
  rejectPaymentRequestAction,
  manuallyActivateUserByEmailOrIdAction,
  clearAllPaymentRequestsAction,
  type PaymentRequestItem,
} from "@/lib/actions/subscriptions"

interface AdminSubscriptionsTabProps {
  onStatusMessage: (msg: string) => void
}

function formatRequestDateEnglish(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "Recently"
  }
}

const REVENUE_RESET_KEY = "fci_admin_revenue_reset_at"

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

  // Manual Activation state
  const [manualIdentifier, setManualIdentifier] = React.useState("")
  const [isActivatingManual, setIsActivatingManual] = React.useState(false)

  // Revenue Reset State
  const [revenueResetTimestamp, setRevenueResetTimestamp] = React.useState<number | null>(null)

  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  // Load revenue reset preference
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(REVENUE_RESET_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed)) {
          setRevenueResetTimestamp(parsed)
        }
      }
    }
  }, [])

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
        onStatusMessage(`Notice: ${res.error}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load payment requests"
      onStatusMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }, [onStatusMessage])

  React.useEffect(() => {
    loadRequests()
  }, [loadRequests])

  // Approve payment
  const handleApprove = async (item: PaymentRequestItem) => {
    const studentName = item.user?.display_name || item.sender_phone
    if (!confirm(`Are you sure you want to approve and activate the subscription for "${studentName}"?`)) {
      return
    }

    setIsProcessing(item.id)
    try {
      const res = await approvePaymentRequestAction(item.id, item.user_id)
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, status: "approved" as const } : r))
        )
        onStatusMessage(`✅ Subscription successfully activated for "${studentName}"!`)
      } else {
        alert(res.error || "Failed to approve payment request.")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setIsProcessing(null)
    }
  }

  // Reject payment confirm
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
        onStatusMessage(`Payment request rejected and student notified.`)
        setRejectingItem(null)
        setRejectReason("")
      } else {
        alert(res.error || "Failed to reject request.")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error rejecting payment request.")
    } finally {
      setIsProcessing(null)
    }
  }

  // Manual Instant Activation
  const handleManualActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualIdentifier.trim()) return

    setIsActivatingManual(true)
    try {
      const res = await manuallyActivateUserByEmailOrIdAction(manualIdentifier)
      if (res.success && res.user) {
        const name = res.user.display_name || res.user.email || "Student"
        onStatusMessage(`⚡ Account for "${name}" is now fully activated!`)
        alert(`Success! Account "${name}" (${res.user.email}) has been activated with unlimited course access.`)
        setManualIdentifier("")
        loadRequests()
      } else {
        alert(res.error || "Could not find a student matching this Email or ID.")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Manual activation error.")
    } finally {
      setIsActivatingManual(false)
    }
  }

  // Revenue Reset
  const handleResetRevenue = () => {
    if (
      confirm(
        "Are you sure you want to zero out the platform revenue counter? This resets the revenue display to 0 EGP starting from right now. (All transaction records remain intact and safe in your database)."
      )
    ) {
      const now = Date.now()
      setRevenueResetTimestamp(now)
      localStorage.setItem(REVENUE_RESET_KEY, String(now))
      onStatusMessage("Revenue counter reset to 0 EGP.")
    }
  }

  const handleRestoreRevenue = () => {
    setRevenueResetTimestamp(null)
    localStorage.removeItem(REVENUE_RESET_KEY)
    onStatusMessage("Full revenue counter restored.")
  }

  // Clear all payment records
  const handleClearAllRecords = async () => {
    if (
      confirm(
        "DANGER: Are you sure you want to delete ALL payment requests from the database? This is only recommended for clearing test data."
      )
    ) {
      setIsLoading(true)
      try {
        const res = await clearAllPaymentRequestsAction()
        if (res.success) {
          setRequests([])
          onStatusMessage("All payment requests cleared.")
        } else {
          alert(res.error || "Failed to clear records.")
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Error clearing records.")
      } finally {
        setIsLoading(false)
      }
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
  const rejectedCount = requests.filter((r) => r.status === "rejected").length

  // Calculate revenue (with reset filter if applied)
  const approvedAfterReset = requests.filter((r) => {
    if (r.status !== "approved") return false
    if (!revenueResetTimestamp) return true
    try {
      const itemTime = new Date(r.created_at).getTime()
      return itemTime > revenueResetTimestamp
    } catch {
      return true
    }
  })
  const displayedRevenue = approvedAfterReset.length * 30

  return (
    <div className="space-y-6 text-start" dir="ltr">
      {/* 1. Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            <span>Subscriptions & Payment Gateway</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Review Vodafone Cash and InstaPay transfer receipts, verify payments, and manage platform revenue.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRequests}
            disabled={isLoading}
            className="text-xs font-bold gap-1.5 h-9 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllRecords}
            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-9 rounded-xl cursor-pointer"
            title="Purge all test payment records"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Purge Data</span>
          </Button>
        </div>
      </div>

      {/* 2. Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-bold">Pending Review</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-500">{pendingCount}</span>
            <Clock className="size-4 text-amber-500" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-bold">Active Subscriptions</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-500">{approvedCount}</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
        </div>

        {/* Revenue Card with Zero/Reset Option */}
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2 shadow-xs relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-bold">Platform Revenue</span>
            <Sparkles className="size-4 text-primary" />
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-primary">{displayedRevenue} EGP</span>
            {revenueResetTimestamp ? (
              <button
                type="button"
                onClick={handleRestoreRevenue}
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer"
                title="Restore full revenue count"
              >
                <RotateCcw className="size-3" />
                <span>Undo Reset</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetRevenue}
                className="text-[10px] text-muted-foreground hover:text-rose-500 font-medium transition-colors cursor-pointer"
                title="Zero revenue counter"
              >
                Reset to 0
              </button>
            )}
          </div>

          {revenueResetTimestamp && (
            <p className="text-[10px] text-amber-500 font-medium">
              Counter reset active (showing recent income only)
            </p>
          )}
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-bold">Total Requests</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{totalCount}</span>
            <CreditCard className="size-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* 3. Manual Instant Student Activation Card */}
      <div className="p-4 sm:p-5 rounded-2xl border border-primary/30 bg-primary/5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4.5 text-primary" />
            <h4 className="text-sm font-black text-foreground">
              Instant Manual Student Activation
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Activate a student directly without waiting for a transaction receipt
          </span>
        </div>

        <form onSubmit={handleManualActivate} className="flex flex-col sm:flex-row gap-2.5">
          <Input
            value={manualIdentifier}
            onChange={(e) => setManualIdentifier(e.target.value)}
            placeholder="Enter student Email address or User UUID..."
            className="text-xs bg-card h-9 rounded-xl flex-1 font-mono"
            required
          />
          <Button
            type="submit"
            size="sm"
            disabled={isActivatingManual || !manualIdentifier.trim()}
            className="text-xs font-bold h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shrink-0"
          >
            {isActivatingManual ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            <span>Activate Account</span>
          </Button>
        </form>
      </div>

      {/* 4. Search & Filter Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, phone, or reference ID..."
            className="ps-9 h-9 text-xs bg-muted/20 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
            >
              Clear
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
            Pending ({pendingCount})
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
            Approved ({approvedCount})
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
            Rejected ({rejectedCount})
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
            All Requests ({totalCount})
          </button>
        </div>
      </div>

      {/* 5. Requests List */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground space-y-3">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Scanning payment requests and receipts...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-border p-8 space-y-2">
          <CreditCard className="size-8 text-muted-foreground mx-auto stroke-[1.5]" />
          <h4 className="text-sm font-bold text-foreground">No matching requests found</h4>
          <p className="text-xs text-muted-foreground">
            {statusFilter === "pending"
              ? "All clear! There are currently no pending payment requests."
              : "No requests found matching your current filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((item) => {
            const isPending = item.status === "pending"
            const isApproved = item.status === "approved"

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
                        {item.user?.display_name || "Student"}
                      </h4>
                      {item.user?.level && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          Level {item.user.level}
                        </span>
                      )}
                      {item.payment_method === "vodafone_cash" ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/25">
                          Vodafone Cash
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-500 border border-violet-500/25">
                          InstaPay
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {item.user?.email || "No email"} • {formatRequestDateEnglish(item.created_at)}
                    </p>

                    {/* Transfer Identifiers (Phone & Reference) */}
                    <div className="flex items-center gap-3 text-xs flex-wrap pt-1">
                      <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/80">
                        <Phone className="size-3 text-muted-foreground" />
                        <span className="text-muted-foreground text-[11px]">Sender:</span>
                        <strong className="font-mono text-foreground" dir="ltr">
                          {item.sender_phone}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.sender_phone, `phone-${item.id}`)}
                          className="text-muted-foreground hover:text-foreground ms-1 cursor-pointer"
                          title="Copy phone number"
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
                        <span className="text-muted-foreground text-[11px]">Ref No:</span>
                        <strong className="font-mono text-foreground" dir="ltr">
                          {item.reference_number}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.reference_number, `ref-${item.id}`)}
                          className="text-muted-foreground hover:text-foreground ms-1 cursor-pointer"
                          title="Copy reference number"
                        >
                          {copiedId === `ref-${item.id}` ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>

                      <span className="font-black text-xs text-emerald-500">
                        {item.amount || 30} EGP
                      </span>
                    </div>

                    {item.admin_notes && (
                      <p className="text-[11px] text-rose-500 pt-1 flex items-center gap-1">
                        <AlertTriangle className="size-3 shrink-0" />
                        <span>Rejection note: {item.admin_notes}</span>
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
                      title="View full receipt screenshot"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.screenshot_url}
                        alt="Payment Receipt"
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="size-4" />
                      </div>
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                      No Receipt Image
                    </span>
                  )}

                  {/* Actions */}
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={isProcessing === item.id}
                        onClick={() => handleApprove(item)}
                        className="h-9 px-3.5 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-600 text-white gap-1 shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Approve</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing === item.id}
                        onClick={() => setRejectingItem(item)}
                        className="h-9 px-3 rounded-xl font-bold text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1 cursor-pointer"
                      >
                        <XCircle className="size-3.5" />
                        <span>Reject</span>
                      </Button>
                    </div>
                  ) : isApproved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="size-3.5" />
                      <span>Approved & Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                      <XCircle className="size-3.5" />
                      <span>Rejected</span>
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
              <h4 className="text-sm font-black text-foreground">Payment Receipt & Screenshot</h4>
              <button
                type="button"
                onClick={() => setPreviewScreenshot(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg cursor-pointer"
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
                <span>Open in new window</span>
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
                <span>Reject Payment Request</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Please provide a reason so the student understands what went wrong and can retry with correct data.
              </p>
            </div>

            <form onSubmit={handleRejectConfirm} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Rejection Reason:</label>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Reference number not found in wallet, or transfer amount does not match."
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
                  className="text-xs h-9 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={isProcessing === rejectingItem.id}
                  className="text-xs font-bold h-9 rounded-xl cursor-pointer"
                >
                  {isProcessing === rejectingItem.id ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
