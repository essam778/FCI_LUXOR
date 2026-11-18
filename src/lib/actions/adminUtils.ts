"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types/database"

export interface AssertAdminOptions {
  /**
   * If true (default), allows both 'admin' and 'editor' roles.
   * If false, allows only 'admin' role.
   */
  allowEditor?: boolean
}

/**
 * Centrally verifies that the caller is an authenticated user with sufficient permissions (admin/editor).
 * Throws an Error if unauthorized, or returns the authenticated Supabase instances and user object.
 */
export async function assertAdminCaller(options?: AssertAdminOptions) {
  const allowEditor = options?.allowEditor ?? true
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("غير مصرح: يجب تسجيل الدخول أولاً")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = createAdminClient() || supabase
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role?: UserRole } | null)?.role
  const allowed = allowEditor ? (role === "admin" || role === "editor") : role === "admin"

  if (!allowed) {
    const roleMsg = allowEditor
      ? "غير مصرح: هذه العملية مخصصة للمشرفين والمديرين فقط"
      : "غير مصرح: هذا الإجراء مخصص لمدير المنصة فقط"
    throw new Error(roleMsg)
  }

  return { supabase, client, adminClient: client, user, role }
}
