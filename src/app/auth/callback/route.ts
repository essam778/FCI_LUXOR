import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { addDeviceToken, MAX_ACTIVE_DEVICES } from "@/lib/auth/deviceSession"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? "/dashboard"

  // Prevent Open Redirect: ensure next is a relative path starting with a single '/'
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")
      ? rawNext
      : "/dashboard"

  // Determine correct host for reverse proxies / Vercel
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https"
  const isLocalEnv = process.env.NODE_ENV === "development"
  const baseUrl = isLocalEnv
    ? origin
    : forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin

  // Check if provider returned an error
  const oauthError = searchParams.get("error")
  const oauthErrorDescription = searchParams.get("error_description")
  if (oauthError || oauthErrorDescription) {
    console.error("[AuthCallback] OAuth provider returned error:", {
      error: oauthError,
      description: oauthErrorDescription,
    })
    const msg = oauthErrorDescription || "فشل تسجيل الدخول بواسطة Google أو تم إلغاؤه"
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_failed&message=${encodeURIComponent(msg)}`
    )
  }

  if (!code) {
    console.warn("[AuthCallback] Missing authorization code in request")
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_failed&message=${encodeURIComponent("رمز التفويض مفقود أو غير صالح")}`
    )
  }

  const supabase = await createClient()
  const { data: authData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !authData?.user) {
    console.error("[AuthCallback] Failed exchanging code for session:", exchangeError)
    const errorMsg = exchangeError?.message?.includes("code verifier")
      ? "انتهت صلاحية جلسة تسجيل الدخول، يُرجى إعادة المحاولة."
      : exchangeError?.message || "فشل التحقق من جلسة الدخول"
    return NextResponse.redirect(
      `${baseUrl}/login?error=auth_callback_failed&message=${encodeURIComponent(errorMsg)}`
    )
  }

  const user = authData.user

  // Multi-device session token handling (up to 2 devices: e.g. Mobile + Laptop/Tablet)
  const deviceToken = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set("fci_device_session", deviceToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "طالب"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = createAdminClient() || supabase

  // Check if existing profile
  const { data: existingProfile } = await client
    .from("profiles")
    .select("id, role, subscription_status, active_session_token, display_name")
    .eq("id", user.id)
    .maybeSingle()

  const updatedTokens = addDeviceToken(
    existingProfile?.active_session_token,
    deviceToken,
    MAX_ACTIVE_DEVICES
  )

  if (existingProfile) {
    // Update active_session_token with 2-device retention without overwriting role or subscription
    await client
      .from("profiles")
      .update({
        active_session_token: updatedTokens,
        email: user.email,
        display_name: existingProfile.display_name || displayName,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", user.id)
  } else {
    // Insert fresh profile for new OAuth user
    await client.from("profiles").insert({
      id: user.id,
      email: user.email,
      display_name: displayName,
      role: "student",
      subscription_status: "unpaid",
      active_session_token: updatedTokens,
      last_active_at: new Date().toISOString(),
    })
  }

  return NextResponse.redirect(`${baseUrl}${next}`)
}
