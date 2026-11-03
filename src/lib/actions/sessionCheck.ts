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

    // If a session token was previously recorded in DB and does not match this device
    if (dbToken && clientToken && dbToken !== clientToken) {
      // Sign out from this device
      cookieStore.delete("fci_device_session")
      await supabase.auth.signOut()
      return { valid: false, isLoggedIn: false, reason: "other_device" }
    }

    // If client has no session token recorded (e.g. legacy session), set it now
    if (!clientToken && dbToken) {
      cookieStore.set("fci_device_session", dbToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      })
    }

    return { valid: true, isLoggedIn: true }
  } catch (err) {
    console.error("[verifyDeviceSessionAction] error:", err)
    return { valid: true, isLoggedIn: true }
  }
}

