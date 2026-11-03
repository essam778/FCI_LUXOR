"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { sanitizeInput } from "@/lib/security"
import { dispatchRealNotification } from "@/lib/notifications"

export interface PaymentRequestItem {
  id: string
  user_id: string
  payment_method: "vodafone_cash" | "instapay"
  sender_phone: string
  reference_number: string
  amount: number
  screenshot_url?: string | null
  status: "pending" | "approved" | "rejected"
  admin_notes?: string | null
  created_at: string
  reviewed_at?: string | null
  user?: {
    display_name: string | null
    email: string | null
    level: number | null
    university: string | null
  }
}

/**
 * Helper to assert admin or editor caller
 */
async function assertAdminCaller() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("غير مصرح: يجب تسجيل الدخول أولاً")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = createAdminClient() || supabase
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role
  if (role !== "admin" && role !== "editor") {
    throw new Error("غير مصرح: هذه العملية مخصصة للمشرفين والمديرين فقط")
  }

  return { supabase, client, user }
}

/**
 * Get current user's subscription status and latest payment request
 */
export async function getCurrentUserSubscription() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        isAuthenticated: false,
        subscriptionStatus: "unpaid" as const,
        role: "guest" as const,
        activeRequest: null,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    const { data: profile } = await client
      .from("profiles")
      .select("role, subscription_status")
      .eq("id", user.id)
      .single()

    const role = profile?.role || "student"
    const subStatus = profile?.subscription_status || "unpaid"

    // If admin or editor, they always have active access
    if (role === "admin" || role === "editor") {
      return {
        isAuthenticated: true,
        subscriptionStatus: "active" as const,
        role,
        activeRequest: null,
      }
    }

    // Fetch latest payment request if any
    const { data: latestReq } = await client
      .from("payment_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    return {
      isAuthenticated: true,
      subscriptionStatus: (subStatus as "unpaid" | "pending" | "active" | "lifetime"),
      role,
      activeRequest: latestReq as PaymentRequestItem | null,
    }
  } catch (err) {
    console.error("[getCurrentUserSubscription] error:", err)
    return {
      isAuthenticated: false,
      subscriptionStatus: "unpaid" as const,
      role: "guest" as const,
      activeRequest: null,
    }
  }
}

/**
 * Submit payment confirmation with receipt screenshot
 */
export async function submitPaymentRequestAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "يجب تسجيل الدخول أولاً لإرسال طلب التفعيل." }
    }

    const paymentMethod = formData.get("paymentMethod") as string
    const senderPhone = formData.get("senderPhone") as string
    const referenceNumber = formData.get("referenceNumber") as string
    const receiptFile = formData.get("receiptFile") as File | null

    if (!paymentMethod || !senderPhone || !referenceNumber) {
      return { success: false, error: "يرجى تعبئة جميع بيانات التحويل المطلوبة." }
    }

    const cleanMethod = paymentMethod === "instapay" ? "instapay" : "vodafone_cash"
    const cleanPhone = sanitizeInput(senderPhone)
    const cleanRef = sanitizeInput(referenceNumber)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    // Upload receipt file if provided
    let screenshotUrl = ""
    if (receiptFile && receiptFile instanceof File && receiptFile.size > 0) {
      const ext = receiptFile.name.split(".").pop() || "jpg"
      const fileName = `receipt-${user.id}-${Date.now()}.${ext}`

      const { data: uploadData, error: uploadErr } = await client.storage
        .from("payment-receipts")
        .upload(fileName, receiptFile, {
          upsert: true,
          contentType: receiptFile.type || "image/jpeg",
        })

      if (!uploadErr && uploadData?.path) {
        const {
          data: { publicUrl },
        } = client.storage.from("payment-receipts").getPublicUrl(uploadData.path)
        screenshotUrl = publicUrl
      } else {
        console.warn("[submitPaymentRequest] Storage upload warning:", uploadErr?.message)
      }
    }

    // Insert payment request
    const { error: insertErr } = await client.from("payment_requests").insert({
      user_id: user.id,
      payment_method: cleanMethod,
      sender_phone: cleanPhone,
      reference_number: cleanRef,
      amount: 30,
      screenshot_url: screenshotUrl || null,
      status: "pending",
    })

    if (insertErr) {
      return { success: false, error: `فشل تسجيل الطلب: ${insertErr.message}` }
    }

    // Update profile subscription_status to pending
    await client
      .from("profiles")
      .update({ subscription_status: "pending" })
      .eq("id", user.id)

    // Dispatch real in-app notification to the student
    await dispatchRealNotification({
      target_type: "user",
      target_user_id: user.id,
      title: "تم استلام طلب تفعيل اشتراكك ⏳",
      message: `تم تسجيل طلب التفعيل برقم مرجعي (${cleanRef}). جاري المراجعة وسنقوم بفتح المقررات لك في أقرب وقت.`,
      link: "/dashboard",
      notification_type: "info",
    })

    revalidatePath("/courses")
    revalidatePath("/dashboard")
    revalidatePath("/admin")

    return {
      success: true,
      message: "تم إرسال طلب التفعيل بنجاح! جاري مراجعة التحويل وتفعيل الحساب فوراً.",
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إرسال الطلب"
    return { success: false, error: msg }
  }
}

interface RawPaymentRequest {
  id: string
  user_id: string
  payment_method: "vodafone_cash" | "instapay"
  sender_phone: string
  reference_number: string
  amount: number
  screenshot_url?: string | null
  status: "pending" | "approved" | "rejected"
  admin_notes?: string | null
  created_at: string
  reviewed_at?: string | null
}

interface RawProfile {
  id: string
  display_name: string | null
  email: string | null
  level: number | null
  university: string | null
}

/**
 * Fetch all payment requests for Admin review
 */
export async function getAdminPaymentRequestsAction(): Promise<{
  success: boolean
  requests?: PaymentRequestItem[]
  error?: string
}> {
  try {
    const { client } = await assertAdminCaller()

    const { data: requests, error } = await client
      .from("payment_requests")
      .select(`
        id,
        user_id,
        payment_method,
        sender_phone,
        reference_number,
        amount,
        screenshot_url,
        status,
        admin_notes,
        created_at,
        reviewed_at
      `)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    const rawRequests = (requests || []) as RawPaymentRequest[]

    // Fetch user profiles for these requests
    const userIds = Array.from(new Set(rawRequests.map((r) => r.user_id)))
    const usersMap: Record<string, { display_name: string | null; email: string | null; level: number | null; university: string | null }> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await client
        .from("profiles")
        .select("id, display_name, email, level, university")
        .in("id", userIds)

      if (profiles) {
        const rawProfiles = profiles as RawProfile[]
        rawProfiles.forEach((p) => {
          usersMap[p.id] = {
            display_name: p.display_name,
            email: p.email,
            level: p.level,
            university: p.university,
          }
        })
      }
    }

    const mapped: PaymentRequestItem[] = rawRequests.map((r) => ({
      ...r,
      user: usersMap[r.user_id] || {
        display_name: "مستخدم",
        email: null,
        level: null,
        university: null,
      },
    }))

    return { success: true, requests: mapped }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "تعذر جلب طلبات الدفع"
    return { success: false, error: msg }
  }
}

/**
 * Admin action: Approve payment request and activate student account
 */
export async function approvePaymentRequestAction(
  requestId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, user: adminUser } = await assertAdminCaller()

    // 1. Update payment request status
    const { error: reqErr } = await client
      .from("payment_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.id,
      })
      .eq("id", requestId)

    if (reqErr) {
      return { success: false, error: reqErr.message }
    }

    // 2. Activate user subscription in profiles
    const { error: profErr } = await client
      .from("profiles")
      .update({
        subscription_status: "active",
      })
      .eq("id", userId)

    if (profErr) {
      return { success: false, error: profErr.message }
    }

    // 3. Send celebratory in-app notification to the student
    await dispatchRealNotification({
      target_type: "user",
      target_user_id: userId,
      title: "تم تفعيل اشتراكك بنجاح! 🚀🎉",
      message: "مرحباً بك! تم تأكيد تحويلك بنجاح وفتح جميع المقررات والمحاضرات والخرائط بالكامل.",
      link: "/courses",
      notification_type: "success",
    })

    revalidatePath("/courses")
    revalidatePath("/dashboard")
    revalidatePath("/admin")

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "فشل تفعيل الطلب"
    return { success: false, error: msg }
  }
}

/**
 * Admin action: Reject payment request with reason
 */
export async function rejectPaymentRequestAction(
  requestId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, user: adminUser } = await assertAdminCaller()

    const cleanReason = reason ? sanitizeInput(reason) : "لم يتم التأكد من صحة التحويل"

    // 1. Update payment request
    const { error: reqErr } = await client
      .from("payment_requests")
      .update({
        status: "rejected",
        admin_notes: cleanReason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.id,
      })
      .eq("id", requestId)

    if (reqErr) {
      return { success: false, error: reqErr.message }
    }

    // 2. Set profile back to unpaid
    await client
      .from("profiles")
      .update({
        subscription_status: "unpaid",
      })
      .eq("id", userId)

    // 3. Notify student
    await dispatchRealNotification({
      target_type: "user",
      target_user_id: userId,
      title: "تنبيه بخصوص طلب التفعيل ⚠️",
      message: `تعذر تأكيد تحويلك: ${cleanReason}. يرجى مراجعة الرقم المرجعي أو إعادة المحاولة.`,
      link: "/courses",
      notification_type: "warning",
    })

    revalidatePath("/courses")
    revalidatePath("/dashboard")
    revalidatePath("/admin")

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "فشل رفض الطلب"
    return { success: false, error: msg }
  }
}

/**
 * Admin direct action: Toggle user subscription status directly from members list
 */
export async function toggleUserSubscriptionAction(
  userId: string,
  newStatus: "active" | "unpaid"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { client } = await assertAdminCaller()

    const { error } = await client
      .from("profiles")
      .update({
        subscription_status: newStatus,
      })
      .eq("id", userId)

    if (error) {
      return { success: false, error: error.message }
    }

    if (newStatus === "active") {
      await dispatchRealNotification({
        target_type: "user",
        target_user_id: userId,
        title: "تم تفعيل اشتراكك يدوياً من الإدارة ⚡",
        message: "أصبح بإمكانك الآن تصفح كافة المواد والمحاضرات في المنصة.",
        link: "/courses",
        notification_type: "success",
      })
    }

    revalidatePath("/courses")
    revalidatePath("/admin")
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "فشل تعديل حالة الاشتراك"
    return { success: false, error: msg }
  }
}
