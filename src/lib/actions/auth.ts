"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { loginSchema, signupSchema } from "@/lib/validators/auth"

export type AuthActionResult = {
  success?: boolean
  error?: string
  message?: string
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
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message === "Invalid login credentials" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : error.message }
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
    message: "تم إنشاء الحساب بنجاح! إذا طُلب تأكيد البريد الإلكتروني، يرجى مراجعة صندوق الوارد ثم تسجيل الدخول.",
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
