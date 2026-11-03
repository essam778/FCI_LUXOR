import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Ensure profile exists for OAuth user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "طالب"

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("profiles") as any).upsert(
          {
            id: user.id,
            email: user.email,
            display_name: displayName,
            role: "student",
            subscription_status: "unpaid",
          },
          { onConflict: "id", ignoreDuplicates: true }
        )
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect to login if code exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
