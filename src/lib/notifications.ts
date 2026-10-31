import { createClient } from "@/lib/supabase/client"
import { sanitizeInput, sanitizeUrl } from "@/lib/security"

export interface CreateNotificationParams {
  title: string
  message: string
  link?: string
  target_type?: "all" | "level" | "user"
  target_user_id?: string | null
  target_user_name?: string | null
  target_level?: number | null
  notification_type?: "info" | "warning" | "update" | "success"
}

export interface StoredNotification {
  id: string
  title: string
  message: string
  link: string | null
  target_type: "all" | "level" | "user" | null
  target_user_id: string | null
  target_user_name: string | null
  target_level: number | null
  notification_type: "info" | "warning" | "update" | "success" | null
  created_at: string
}

/**
 * Dispatch a notification (broadcast or targeted to level or specific student) via Supabase DB.
 * Validates and sanitizes all inputs against SQL injection and XSS.
 */
export async function dispatchRealNotification({
  title,
  message,
  link = "/courses",
  target_type = "all",
  target_user_id = null,
  target_user_name = null,
  target_level = null,
  notification_type = "info",
}: CreateNotificationParams): Promise<{ success: boolean; error?: string; data?: unknown }> {
  const cleanTitle = sanitizeInput(title)
  const cleanMessage = sanitizeInput(message)
  const cleanLink = sanitizeUrl(link, "/courses")

  if (!cleanTitle || !cleanMessage) {
    return { success: false, error: "العنوان والرسالة مطلوبان" }
  }

  try {
    const supabase = createClient()
    const payload = {
      title: cleanTitle,
      message: cleanMessage,
      link: cleanLink,
      target_type,
      target_user_id: target_type === "user" ? target_user_id : null,
      target_user_name: target_type === "user" ? (target_user_name || "طالب محدد") : null,
      target_level: target_type === "level" ? target_level : null,
      notification_type,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("notifications") as any)
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error("Failed to insert notification into Supabase:", error.message)
      return { success: false, error: error.message }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("fci_new_notification"))
    }

    return { success: true, data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("Error dispatching notification:", msg)
    return { success: false, error: msg }
  }
}

/**
 * Fetch all notifications for admin management history
 */
export async function fetchAdminNotificationLogs(): Promise<{
  success: boolean
  notifications: StoredNotification[]
  error?: string
}> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, notifications: [], error: error.message }
    }

    return { success: true, notifications: (data as StoredNotification[]) || [] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load notifications"
    return { success: false, notifications: [], error: msg }
  }
}

/**
 * Delete a notification from Supabase DB
 */
export async function deleteNotificationById(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)

    if (error) {
      return { success: false, error: error.message }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("fci_new_notification"))
    }

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete notification"
    return { success: false, error: msg }
  }
}
