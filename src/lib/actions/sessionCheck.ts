"use server"

import { cookies } from "next/headers"
import { createClient, createAdminClient } from "@/lib/supabase/server"

/**
 * Verify whether the current browser device session token matches the database.
 * If another device has logged in with the same account, this token will not match,
 * signaling that this device should be automatically signed out.
 */
export async function verifyDeviceSessionAction(): Promise<{
  valid: boolean
  isLoggedIn: boolean
  reason?: "other_device" | "expired"
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { valid: true, isLoggedIn: false }
    }

    const cookieStore = await cookies()
    const clientToken = cookieStore.get("fci_device_session")?.value

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase
    const { data: profile } = await client
      .from("profiles")
      .select("active_session_token, role")
      .eq("id", user.id)
      .single()

    // If admin or editor, do not strictly kick them out to allow multi-device management
    if (profile?.role === "admin" || profile?.role === "editor") {
      return { valid: true, isLoggedIn: true }
    }

    const dbToken = profile?.active_session_token

    // If profile has no active token yet (legacy account), establish one now:
    if (!dbToken) {
      const freshToken = crypto.randomUUID()
      await client
        .from("profiles")
        .update({
          active_session_token: freshToken,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      cookieStore.set("fci_device_session", freshToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      })
      return { valid: true, isLoggedIn: true }
    }

    // If a database token is active, the browser MUST present a matching cookie.
    // If clientToken is missing or mismatches dbToken, another device has logged in or cookie was stripped.
    if (!clientToken || clientToken !== dbToken) {
      cookieStore.delete("fci_device_session")
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore sign out failure
      }
      return { valid: false, isLoggedIn: false, reason: "other_device" }
    }

    return { valid: true, isLoggedIn: true }
  } catch (err) {
    console.error("[verifyDeviceSessionAction] error:", err)
    return { valid: true, isLoggedIn: true }
  }
}

