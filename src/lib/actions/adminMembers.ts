"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { sanitizeInput } from "@/lib/security"
import type { UserRole } from "@/types/database"

export interface AdminMember {
  id: string
  display_name: string | null
  email?: string | null
  university: string | null
  level: number | null
  role: UserRole
  status?: string | null
  subscription_status?: string | null
  avatar_url?: string | null
  created_at: string
}

export interface AdminMembersResult {
  success: boolean
  members?: AdminMember[]
  error?: string
}

/**
 * Helper to strictly verify the caller is an authenticated administrator.
 */
async function assertAdminCaller() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("غير مصرح: يجب تسجيل الدخول كمسؤول")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role
  if (role !== "admin") {
    throw new Error("غير مصرح: هذا الإجراء مخصص لمدير المنصة فقط")
  }

  return { supabase, user }
}

/**
 * Fetch all platform members for the admin management panel.
 */
export async function getAdminMembers(): Promise<AdminMembersResult> {
  try {
    const { supabase } = await assertAdminCaller()

    // Fetch all profiles
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, email, university, level, role, status, subscription_status, avatar_url, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch admin members:", error.message)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      members: (data as unknown as AdminMember[]) || [],
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع أثناء جلب الأعضاء"
    return { success: false, error: msg }
  }
}

/**
 * Update member details (display_name, role, level, university, status)
 */
export async function updateAdminMember(params: {
  id: string
  display_name: string
  role: UserRole
  level: number
  university?: string
  status?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdminCaller()

    const cleanName = sanitizeInput(params.display_name)
    const cleanUniversity = params.university ? sanitizeInput(params.university) : ""
    const cleanStatus = params.status ? sanitizeInput(params.status) : "active"

    // Use admin client if available to ensure permission, or standard client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    const { error } = await client
      .from("profiles")
      .update({
        display_name: cleanName,
        role: params.role,
        level: params.level,
        university: cleanUniversity,
        status: cleanStatus,
      })
      .eq("id", params.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/admin")
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ أثناء تحديث بيانات العضو"
    return { success: false, error: msg }
  }
}

/**
 * Quick change of member role (e.g. promote to admin/editor or demote to student)
 */
export async function quickChangeMemberRole(
  memberId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdminCaller()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    const { error } = await client
      .from("profiles")
      .update({ role: newRole })
      .eq("id", memberId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/admin")
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ أثناء تغيير الرتبة"
    return { success: false, error: msg }
  }
}

/**
 * Delete or suspend a member profile
 */
export async function deleteAdminMember(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdminCaller()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    const { error } = await client
      .from("profiles")
      .delete()
      .eq("id", memberId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/admin")
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ أثناء حذف العضو"
    return { success: false, error: msg }
  }
}

