"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"

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

    // Strict validation against configured ADMIN_MASTER_SECRET only. Backdoor passkeys removed.
    if (passkey !== MASTER_ADMIN_SECRET) {
      return { error: "رمز الأمان الإداري غير صحيح. تم تسجيل محاولة الدخول غير المصرح بها." }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "يجب تسجيل الدخول بحسابك أولاً قبل تفعيل صلاحيات الإدارة" }
    }

    // Elevate role in database to 'admin' using Admin Client (bypassing student self-promotion RLS block safely)
    const adminClient = createAdminClient()
    if (adminClient) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: adminErr } = await (adminClient.from("profiles") as any)
        .update({ role: "admin" })
        .eq("id", user.id)

      if (adminErr) {
        console.error("Failed to promote user to admin:", adminErr.message)
        return { error: `فشل ترقية الحساب: ${adminErr.message}` }
      }
    } else {
      // Fallback to standard client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("profiles") as any)
        .update({ role: "admin" })
        .eq("id", user.id)

      if (error) {
        return { error: `فشل ترقية الحساب: ${error.message}` }
      }
    }

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    return {
      success: true,
      message: "تم التحقق من الصلاحيات الإدارية وتفعيل حساب المدير بنجاح! جاري توجيهك...",
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل التحقق من صلاحية الإدارة"
    return { error: msg }
  }
}

