import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getCoursesList } from "@/lib/queries/courses"
import { AdminDashboard } from "@/components/admin/AdminDashboard"

export const metadata: Metadata = {
  title: "Admin Control Center | FCI Luxor",
  description: "Executive administrative portal and curriculum management system for FCI Luxor.",
}

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not logged in, redirect straight to login
  if (!user) {
    redirect("/login?next=/admin")
  }

  // Check role in profiles table
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const profile = data as { role?: string } | null
  const isDatabaseAdmin = profile?.role === "admin"

  // If not authorized as admin, redirect to student dashboard
  if (!isDatabaseAdmin) {
    redirect("/dashboard")
  }

  // Fetch true live courses from Supabase (Source of Truth)
  const initialCourses = await getCoursesList()

  return (
    <div className="min-h-screen bg-background relative" dir="ltr">
      <AdminDashboard adminEmail={user.email || ""} initialCourses={initialCourses} />
    </div>
  )
}
