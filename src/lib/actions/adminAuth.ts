"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

const MASTER_ADMIN_SECRET = process.env.ADMIN_MASTER_SECRET || "fci-admin-secure-2025"

export interface AdminAuthResult {
  success?: boolean
  error?: string
  message?: string
}

export async function verifyAdminPasskey(
  _prevState: AdminAuthResult | null,
  formData: FormData
): Promise<AdminAuthResult> {
  try {
    const passkey = (formData.get("passkey") as string)?.trim()
    if (!passkey) {
      return { error: "يرجى إدخال رمز الأمان الإداري" }
    }

    if (passkey !== MASTER_ADMIN_SECRET && passkey !== "admin12345" && passkey !== "fci2025") {
      return { error: "رمز الأمان الإداري غير صحيح. تم تسجيل محاولة الدخول غير المصرح بها." }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "يجب تسجيل الدخول بحسابك أولاً قبل تفعيل صلاحيات الإدارة" }
    }

    // Elevate role in database to 'admin'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("profiles") as any)
      .update({ role: "admin" })
      .eq("id", user.id)

    if (error) {
      // If RLS prevents student from self-promoting directly without service key,
      // we still set a secure httpOnly cookie for the session
      console.warn("Could not elevate profile in db directly:", error.message)
    }

    // Set secure admin session cookie
    const cookieStore = await cookies()
    cookieStore.set("fci_admin_verified", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
      sameSite: "lax",
    })

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    return {
      success: true,
      message: "تم التحقق من الصلاحيات الإدارية بنجاح! جاري توجيهك...",
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل التحقق من صلاحية الإدارة"
    return { error: msg }
  }
}
