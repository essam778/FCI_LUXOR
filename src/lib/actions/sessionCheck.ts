"use server"

import { cookies } from "next/headers"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import {
  parseDeviceTokens,
  addDeviceToken,
  MAX_ACTIVE_DEVICES,
} from "@/lib/auth/deviceSession"

/**
 * Verify whether the current browser device session token is among the active allowed devices (up to 2).
 * If a 3rd device has logged in, older devices are evicted and automatically signed out.
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
      .maybeSingle()

    // If admin or editor, allow multi-device management without restrictions
    if (profile?.role === "admin" || profile?.role === "editor") {
      return { valid: true, isLoggedIn: true }
    }

    const rawTokens = profile?.active_session_token
    const activeTokens = parseDeviceTokens(rawTokens)

    // Case 1: If profile has no active tokens yet (e.g. legacy user or fresh registration), establish one:
    if (activeTokens.length === 0) {
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

    // Case 2: Client presents a device token:
    if (clientToken) {
      // If the client's token is one of the active devices, allow access
      if (activeTokens.includes(clientToken)) {
        return { valid: true, isLoggedIn: true }
      }

      // Token not found -> A 3rd newer device logged in and pushed this device out
      cookieStore.delete("fci_device_session")
      try {
        await supabase.auth.signOut({ scope: "local" })
      } catch {
        // ignore sign out failure
      }
      return { valid: false, isLoggedIn: false, reason: "other_device" }
    }

    // Case 3: Client has a valid Supabase auth session, but no device cookie yet:
    // If fewer than MAX_ACTIVE_DEVICES (2) are registered, adopt this device as device #2!
    if (activeTokens.length < MAX_ACTIVE_DEVICES) {
      const freshToken = crypto.randomUUID()
      const updatedTokens = addDeviceToken(rawTokens, freshToken, MAX_ACTIVE_DEVICES)
      await client
        .from("profiles")
        .update({
          active_session_token: updatedTokens,
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

    // Case 4: Client has no device cookie and max devices (2) are already active:
    // Unauthorized additional device attempting to use session without formal login
    cookieStore.delete("fci_device_session")
    try {
      await supabase.auth.signOut({ scope: "local" })
    } catch {
      // ignore
    }
    return { valid: false, isLoggedIn: false, reason: "other_device" }
  } catch (err) {
    console.error("[verifyDeviceSessionAction] error:", err)
    return { valid: true, isLoggedIn: true }
  }
}
