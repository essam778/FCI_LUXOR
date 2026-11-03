"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { loginSchema, signupSchema } from "@/lib/validators/auth"

export type AuthActionResult = {
  success?: boolean
  error?: string
  message?: string
  email?: string
}

export async function login(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  }

  const parsed = loginSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message === "Invalid login credentials" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : error.message }
  }

  // Single Device Enforcement: Generate a unique device session token
  if (authData?.user) {
    const sessionToken = crypto.randomUUID()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    try {
      await client
        .from("profiles")
        .update({
          active_session_token: sessionToken,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", authData.user.id)
    } catch (e) {
      console.warn("[login] Error setting active_session_token:", e)
    }

    try {
      const cookieStore = await cookies()
      cookieStore.set("fci_device_session", sessionToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    } catch {
      // ignore if called in environment without cookie set support
    }
  }

  const redirectTo = formData.get("redirectTo") as string | null
  revalidatePath("/", "layout")
  redirect(redirectTo || "/dashboard")
}

export async function signup(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const rawData = {
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    university: formData.get("university") || undefined,
    level: formData.get("level") || undefined,
  }

  const parsed = signupSchema.safeParse(rawData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
        university: parsed.data.university,
        level: parsed.data.level,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // If user is immediately signed in (e.g. email confirmation off)
  if (data.session) {
    revalidatePath("/", "layout")
    redirect("/dashboard")
  }

  return {
    success: true,
    email: parsed.data.email,
    message: "تم إرسال رابط تأكيد الحساب إلى بريدك الإلكتروني بنجاح! يرجى مراجعة صندوق الوارد والضغط على الرابط لتفعيل حسابك والدخول للمنصة.",
  }
}

export async function logout() {
  const supabase = await createClient()
  try {
    const cookieStore = await cookies()
    cookieStore.delete("fci_device_session")
  } catch {
    // ignore
  }
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
