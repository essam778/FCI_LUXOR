import { notFound } from "next/navigation"
import { cookies } from "next/headers"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { AdminDashboard } from "@/components/admin/AdminDashboard"

export const metadata: Metadata = {
  title: "لوحة الإدارة الأكاديمية | منصة حاسبات والمعلومات",
  description: "لوحة التحكم وإدارة المحتوى الأكاديمي للمشرفين والمديرين.",
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not logged in, pretend the page does not exist (404)
  if (!user) {
    notFound()
  }

  // Check role in profiles table
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const profile = data as { role?: string } | null
  const cookieStore = await cookies()
  const hasAdminCookie = cookieStore.get("fci_admin_verified")?.value === "true"
  const isDatabaseAdmin = profile?.role === "admin"

  // Only authorized administrators can access. Otherwise return 404 Not Found!
  if (!isDatabaseAdmin && !hasAdminCookie) {
    notFound()
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <AdminDashboard adminEmail={user.email || ""} />
    </div>
  )
}
