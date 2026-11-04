"use client"

import * as React from "react"
import Link from "next/link"
import {
  CreditCard,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  UploadCloud,
  Lock,
  ShieldCheck,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitPaymentRequestAction, type PaymentRequestItem } from "@/lib/actions/subscriptions"
import { compressReceiptImage } from "@/lib/subscriptionUtils"

interface StudentSubscriptionWidgetProps {
  userId: string
  subscriptionStatus: string
  role: string
  initialPaymentRequest?: PaymentRequestItem | null
}

export function StudentSubscriptionWidget({
  subscriptionStatus,
  role,
  initialPaymentRequest = null,
}: StudentSubscriptionWidgetProps) {
  const [hasPending, setHasPending] = React.useState<boolean>(
    initialPaymentRequest?.status === "pending"
  )
  const [pendingData, setPendingData] = React.useState<PaymentRequestItem | null>(initialPaymentRequest)

  const [paymentMethod, setPaymentMethod] = React.useState<"vodafone_cash" | "instapay">("vodafone_cash")
  const [senderPhone, setSenderPhone] = React.useState("")
  const [referenceNumber, setReferenceNumber] = React.useState("")
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = React.useState<string | null>(null)
  const [isCopied, setIsCopied] = React.useState(false)
  const [isCompressing, setIsCompressing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ text: string; type: "success" | "error" } | null>(null)

  const paymentNumber = "01006655209"

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(paymentNumber)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setReceiptPreview(previewUrl)
      setIsCompressing(true)
      try {
        const compressed = await compressReceiptImage(file)
        setReceiptFile(compressed)
      } catch {
        setReceiptFile(file)
      } finally {
        setIsCompressing(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!senderPhone.trim() || !referenceNumber.trim()) {
      setStatusMsg({ text: "يرجى كتابة رقم الهاتف المحول منه والرقم المرجعي للعملية.", type: "error" })
      return
    }

    setIsSubmitting(true)
    setStatusMsg(null)

    try {
      const fd = new FormData()
      fd.append("paymentMethod", paymentMethod)
      fd.append("senderPhone", senderPhone.trim())
      fd.append("referenceNumber", referenceNumber.trim())
      if (receiptFile) {
        fd.append("receiptFile", receiptFile)
      }

      const res = await submitPaymentRequestAction(fd)

      if (res.success) {
        setStatusMsg({
          text: res.message || "تم إرسال طلب التفعيل بنجاح! سيتم فحص التحويل واعتماد الحساب فوراً.",
          type: "success",
        })
        const newReq: PaymentRequestItem = {
          id: `req-${Date.now()}`,
          user_id: "",
          payment_method: paymentMethod,
          sender_phone: senderPhone,
          reference_number: referenceNumber,
          amount: 30,
          status: "pending",
          created_at: new Date().toISOString(),
        }
        setPendingData(newReq)
        setHasPending(true)
      } else {
        setStatusMsg({ text: res.error || "تعذر إرسال الطلب، يرجى المحاولة مرة أخرى.", type: "error" })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع"
      setStatusMsg({ text: msg, type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSubActive =
    role === "admin" ||
    role === "editor" ||
    subscriptionStatus === "active" ||
    subscriptionStatus === "lifetime"

  // 1. ACTIVE SUBSCRIPTION VIEW
  if (isSubActive) {
    return (
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-card to-card border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-start shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-foreground">
                حالة الحساب: مفعل بالكامل
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {role === "admin" ? "ADMIN ACCESS" : "FULL ACCESS"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              لديك صلاحية وصول كاملة وغير محدودة لجميع المقررات، المحاضرات، بنوك الأسئلة، والخرائط الذهنية طوال الترم.
            </p>
          </div>
        </div>

        <Link href="/courses" className="shrink-0 self-end sm:self-auto">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 cursor-pointer">
            <BookOpen className="size-4" />
            <span>تصفح المقررات الآن</span>
          </Button>
        </Link>
      </div>
    )
  }

  // 2. PENDING REQUEST VIEW
  if (hasPending && pendingData) {
    return (
      <div className="p-4 sm:p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4 text-start shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="size-6 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-black text-foreground">
                طلب تفعيل الحساب قيد المراجعة والاعتماد
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                تم استلام طلب التحويل برقم مرجعي: <strong className="text-foreground font-mono">{pendingData.reference_number}</strong>. يقوم المشرف حالياً بمطابقة التحويل وتفعيل الحساب.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setHasPending(false)}
            className="text-xs font-bold h-9 rounded-xl border-amber-500/40 hover:bg-amber-500/20 text-foreground cursor-pointer shrink-0 self-end sm:self-auto"
          >
            تعديل بيانات التحويل
          </Button>
        </div>

        <div className="p-3 rounded-xl bg-card/60 border border-border/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground text-[11px] block">طريقة الدفع:</span>
            <strong className="text-foreground">{pendingData.payment_method === "vodafone_cash" ? "فودافون كاش" : "انستا باي"}</strong>
          </div>
          <div>
            <span className="text-muted-foreground text-[11px] block">رقم المحول:</span>
            <strong className="text-foreground font-mono" dir="ltr">{pendingData.sender_phone}</strong>
          </div>
          <div>
            <span className="text-muted-foreground text-[11px] block">المبلغ:</span>
            <strong className="text-emerald-500 font-bold">30 جنيه مصري</strong>
          </div>
        </div>
      </div>
    )
  }

  // 3. UNPAID ACTIVATION FORM VIEW
  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-5 text-start">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              <ShieldCheck className="size-3.5" />
              <span>تفعيل الحساب الدراسي</span>
            </span>
            <span className="text-xs font-bold font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              30 جنيه فقط
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-foreground">
            تفعيل الاشتراك وفتح كافة المقررات الدراسية
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            حوّل رسوم الاشتراك الرمزية (30 جنيه) وارفع إثبات التحويل لفتح جميع المواد والملفات طوال الفصل الدراسي.
          </p>
        </div>

        {/* Copy Phone Box */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3 w-full sm:w-auto shrink-0">
          <div className="space-y-0.5">
            <div className="text-[10px] text-muted-foreground font-bold">فودافون كاش / انستا باي:</div>
            <div className="font-mono text-sm sm:text-base font-black text-foreground" dir="ltr">
              {paymentNumber}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyNumber}
            className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 cursor-pointer shrink-0"
          >
            {isCopied ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span className="text-emerald-500 text-[11px]">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span className="text-[11px]">نسخ</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            statusMsg.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              : "bg-destructive/15 border border-destructive/30 text-destructive"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Method Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">وسيلة التحويل المستخدمة:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("vodafone_cash")}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                paymentMethod === "vodafone_cash"
                  ? "border-primary bg-primary/10 text-primary shadow-xs font-black"
                  : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <CreditCard className="size-3.5" />
              <span>فودافون كاش</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("instapay")}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                paymentMethod === "instapay"
                  ? "border-primary bg-primary/10 text-primary shadow-xs font-black"
                  : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <CreditCard className="size-3.5" />
              <span>انستا باي (InstaPay)</span>
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">رقم الهاتف المحول منه:</label>
            <Input
              type="tel"
              dir="ltr"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              placeholder="010XXXXXXXX"
              required
              className="h-10 text-xs font-mono rounded-xl bg-muted/20 text-start"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">الرقم المرجعي للتحويل:</label>
            <Input
              type="text"
              dir="ltr"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Ref No / العملية"
              required
              className="h-10 text-xs font-mono rounded-xl bg-muted/20 text-start"
            />
          </div>
        </div>

        {/* File Upload Box */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground">صورة إيصال التحويل (اسكرين شوت):</label>
          {receiptPreview ? (
            <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptPreview} alt="Receipt" className="size-12 rounded-lg object-cover border border-border shrink-0" />
                <span className="text-xs text-foreground truncate">{receiptFile?.name || "تم اختيار الصورة"}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReceiptFile(null)
                  setReceiptPreview(null)
                }}
                className="text-xs text-destructive hover:bg-destructive/10 h-8"
              >
                إلغاء
              </Button>
            </div>
          ) : (
            <label className="border border-dashed border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors text-center">
              <UploadCloud className="size-6 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">اضغط لرفع اسكرين شوت التحويل</span>
              <span className="text-[10px] text-muted-foreground">يتم ضغط الصورة تلقائياً لسرعة الإرسال الفوري</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="w-full sm:w-auto btn-primary-glow font-bold text-xs sm:text-sm h-11 px-8 rounded-xl cursor-pointer"
          >
            {isSubmitting ? "جاري إرسال طلب التفعيل..." : "إرسال وتأكيد طلب التفعيل (30 ج.م)"}
          </Button>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Lock className="size-3 text-muted-foreground shrink-0" />
            <span>حسابك مخصص لجهاز واحد فقط لضمان الأمان وعدم مشاركة الحسابات.</span>
          </p>
        </div>
      </form>
    </div>
  )
}

