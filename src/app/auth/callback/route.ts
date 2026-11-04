import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

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

  if (code) {
    const supabase = await createClient()
    const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && authData?.user) {
      const user = authData.user

      // Determine correct host for reverse proxies / Vercel
      const forwardedHost = request.headers.get("x-forwarded-host")
      const forwardedProto = request.headers.get("x-forwarded-proto") || "https"
      const isLocalEnv = process.env.NODE_ENV === "development"
      const baseUrl = isLocalEnv
        ? origin
        : forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : origin

      // Single device session token handling for OAuth user:
      const deviceToken = crypto.randomUUID()
      const cookieStore = await cookies()
      cookieStore.set("fci_device_session", deviceToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
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
        .select("id, role, subscription_status")
        .eq("id", user.id)
        .maybeSingle()

      if (existingProfile) {
        // Update active_session_token without overwriting existing role or subscription
        await client
          .from("profiles")
          .update({
            active_session_token: deviceToken,
            email: user.email,
            display_name: displayName,
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
          active_session_token: deviceToken,
        })
      }

      return NextResponse.redirect(`${baseUrl}${next}`)
    }
  }

  // Redirect to login if code exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
