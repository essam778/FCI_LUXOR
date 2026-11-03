"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  UploadCloud,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  CreditCard,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Course } from "@/data/coursesData"
import { submitPaymentRequestAction, type PaymentRequestItem } from "@/lib/actions/subscriptions"
import { compressReceiptImage } from "@/lib/subscriptionUtils"

interface CoursePaywallProps {
  course: Course
  freeTrialCourseSlug?: string
  initialPendingRequest?: PaymentRequestItem | null
}

export function CoursePaywall({
  course,
  freeTrialCourseSlug = "electronics-fundamentals",
  initialPendingRequest,
}: CoursePaywallProps) {
  const [paymentMethod, setPaymentMethod] = React.useState<"vodafone_cash" | "instapay">("vodafone_cash")
  const [senderPhone, setSenderPhone] = React.useState("")
  const [referenceNumber, setReferenceNumber] = React.useState("")
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null)
  const [filePreview, setFilePreview] = React.useState<string | null>(null)

  const [isCopied, setIsCopied] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isCompressing, setIsCompressing] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<{ text: string; type: "success" | "error" } | null>(null)
  const [hasPendingRequest, setHasPendingRequest] = React.useState(!!initialPendingRequest)
  const [pendingReqData, setPendingReqData] = React.useState<PaymentRequestItem | null>(initialPendingRequest || null)

  const paymentNumber = "01006655209"

  const handleCopyNumber = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(paymentNumber)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2500)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFilePreview(URL.createObjectURL(file))
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
          text: res.message || "تم إرسال طلب التفعيل بنجاح! سيتم فحص التحويل وتفعيل الحساب فوراً.",
          type: "success",
        })
        setHasPendingRequest(true)
        setPendingReqData({
          id: `req-${Date.now()}`,
          user_id: "",
          payment_method: paymentMethod,
          sender_phone: senderPhone,
          reference_number: referenceNumber,
          amount: 30,
          status: "pending",
          created_at: new Date().toISOString(),
        })
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

  const coverImg =
    course.imageUrl ||
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80"

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-8 text-start" dir="rtl">
      {/* 1. Header / Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link href="/courses" className="hover:text-foreground transition-colors">
          المقررات الدراسية
        </Link>
        <span>/</span>
        <span className="text-foreground font-bold">{course.title}</span>
        <span>/</span>
        <span className="text-primary font-bold">تفعيل الاشتراك</span>
      </nav>

      {/* 2. Course Mini Card Banner */}
      <div className="relative rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl overflow-hidden shadow-lg p-5 sm:p-7 flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative size-16 sm:size-20 rounded-2xl overflow-hidden shrink-0 border border-border shadow-sm">
            <Image src={coverImg} alt={course.title} fill unoptimized className="object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Lock className="size-6 text-white" />
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {course.code}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                <Lock className="size-3" />
                مقرر مقفول
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-foreground truncate">{course.title}</h1>
            <p className="text-xs text-muted-foreground">
              {course.lectures.length} محاضرات • شروحات فيديو • خرائط ذهنية • بنك أسئلة وتطبيقات
            </p>
          </div>
        </div>

        {/* Free Trial Button Shortcut */}
        <Link
          href={`/courses/${freeTrialCourseSlug}`}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-black transition-all shadow-xs"
        >
          <Zap className="size-4" />
          <span>تجربة مقرر الإلكترونيات مجاناً</span>
          <ArrowRight className="size-3.5 rotate-180" />
        </Link>
      </div>

      {/* 3. Main Paywall Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Payment instructions & Transfer numbers (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 sm:p-7 space-y-6 shadow-xs">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
              <Sparkles className="size-3.5" />
              <span>اشتراك رمزي موحد</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-foreground">30</span>
              <span className="text-sm font-bold text-muted-foreground">جنيه مصري فقط</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تفعيل حسابك يمنحك وصولاً كاملاً وغير محدود لجميع مقررات ومحاضرات الكلية، ملخصات الـ PDF، بنك الأسئلة، والخرائط الذهنية طوال الترم.
            </p>
          </div>

          {/* Transfer Account Box */}
          <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-primary" />
                رقم التحويل المعتمد:
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                فودافون كاش / انستا باي
              </span>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
              <span className="font-mono text-base sm:text-lg font-black tracking-wider text-foreground" dir="ltr">
                {paymentNumber}
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyNumber}
                className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="text-emerald-500">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>نسخ</span>
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-1 text-[11px] text-muted-foreground leading-relaxed">
              <p>• <strong>Vodafone Cash:</strong> حوّل 30 جنيه إلى {paymentNumber}</p>
              <p>• <strong>InstaPay:</strong> حوّل إلى رقم الهاتف {paymentNumber}</p>
            </div>
          </div>

          {/* Quick Steps */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-foreground">خطوات التفعيل في دقيقة:</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  1
                </span>
                <span>حوّل 30 جنيه عبر فودافون كاش أو تطبيق InstaPay.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  2
                </span>
                <span>التقط اسكرين شوت لرسالة أو إشعار التحويل الناجح، وانسخ الرقم المرجعي.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  3
                </span>
                <span>أرسل النموذج المرفق وسيتم مراجعة الطلب وتفعيل الحساب مباشرة.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Submission Form or Pending Status (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-border bg-card p-6 sm:p-7 space-y-5 shadow-xs">
          {hasPendingRequest && pendingReqData ? (
            /* Pending Request Banner */
            <div className="space-y-5 text-center py-6">
              <div className="size-16 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <Clock className="size-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-black text-foreground">طلب التفعيل الخاص بك قيد المراجعة ⏳</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  تم استلام بيانات التحويل بنجاح برقم مرجعي:{" "}
                  <strong className="text-foreground font-mono">{pendingReqData.reference_number}</strong>.
                  يقوم المشرف حالياً بمطابقة التحويل وتفعيل الحساب فوراً.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-muted/20 text-xs space-y-1.5 text-start max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">طريقة الدفع:</span>
                  <span className="font-bold text-foreground">
                    {pendingReqData.payment_method === "vodafone_cash" ? "فودافون كاش" : "انستا باي"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">رقم المحول:</span>
                  <span className="font-mono font-bold text-foreground" dir="ltr">
                    {pendingReqData.sender_phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <span className="font-bold text-emerald-500">30 جنيه مصري</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/courses/${freeTrialCourseSlug}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:brightness-110"
                >
                  <Zap className="size-4" />
                  <span>تصفح مقرر الإلكترونيات المجاني أثناء الانتظار</span>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHasPendingRequest(false)}
                  className="w-full sm:w-auto text-xs h-10 rounded-xl"
                >
                  تعديل بيانات التحويل
                </Button>
              </div>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  <span>تأكيد التحويل وتفعيل الحساب</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  أدخل بيانات التحويل الخاصة بك لربط الدفعة بحسابك فورياً.
                </p>
              </div>

              {/* Status Alert */}
              {statusMsg && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 leading-relaxed ${
                    statusMsg.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  {statusMsg.type === "success" ? (
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* 1. Payment Method Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">طريقة الدفع المستخدمة:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("vodafone_cash")}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all ${
                      paymentMethod === "vodafone_cash"
                        ? "bg-rose-500/10 border-rose-500 text-rose-500 shadow-sm"
                        : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className="size-3 rounded-full bg-rose-500 shrink-0" />
                    <span>فودافون كاش (Vodafone)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("instapay")}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all ${
                      paymentMethod === "instapay"
                        ? "bg-violet-500/10 border-violet-500 text-violet-500 shadow-sm"
                        : "bg-muted/20 border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className="size-3 rounded-full bg-violet-500 shrink-0" />
                    <span>انستا باي (InstaPay)</span>
                  </button>
                </div>
              </div>

              {/* 2. Sender Phone & Reference Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    رقم الهاتف / الحساب المحول منه:
                  </label>
                  <Input
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    required
                    dir="ltr"
                    className="h-10 text-xs bg-muted/20 rounded-xl font-mono text-end"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    الرقم المرجعي للعملية (Reference No):
                  </label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="مثال: 98451230489"
                    required
                    dir="ltr"
                    className="h-10 text-xs bg-muted/20 rounded-xl font-mono text-end"
                  />
                </div>
              </div>

              {/* 3. Screenshot Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>إرفاق اسكرين شوت التحويل (Screenshot):</span>
                  <span className="text-[11px] text-muted-foreground font-normal">اختياري ومفضل لتسريع التفعيل</span>
                </label>

                {filePreview ? (
                  <div className="relative rounded-2xl border border-border bg-muted/20 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative size-12 rounded-lg overflow-hidden shrink-0 border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={filePreview} alt="Receipt Preview" className="object-cover w-full h-full" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-foreground truncate">{receiptFile?.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {((receiptFile?.size || 0) / 1024).toFixed(1)} KB • جاهز للإرسال
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReceiptFile(null)
                        setFilePreview(null)
                      }}
                      className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2.5 rounded-lg"
                    >
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/10 hover:bg-muted/20 transition-all text-center">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <UploadCloud className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">اضغط لاختيار صورة الإيصال أو اسحبه هنا</p>
                      <p className="text-[11px] text-muted-foreground">PNG, JPG, WEBP حتى 10 ميجابايت</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 4. Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || isCompressing}
                className="w-full font-black text-xs sm:text-sm h-11 rounded-2xl shadow-md cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري إرسال وتأكيد طلب التفعيل فوراً...</span>
                  </span>
                ) : isCompressing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري تحسين وضغط الصورة بسرعة...</span>
                  </span>
                ) : (
                  "إرسال طلب تفعيل الحساب (30 ج.م)"
                )}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground">
                🔒 حسابك مخصص لجهاز واحد فقط لضمان الأمان وعدم مشاركة البيانات.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

