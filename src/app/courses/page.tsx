import * as React from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getCoursesList } from "@/lib/queries/courses"
import { CoursesExplorer } from "@/components/course/CoursesExplorer"

export const metadata: Metadata = {
  title: "المقررات والمناهج الدراسية | منصة حاسبات",
  description: "استعرض مقررات كليات الحاسبات والمعلومات مقسمة حسب الفرق الدراسية والفصول مع تفاصيل المحاضرات والموضوعات.",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CoursesPage() {
  let userLevel: number = 1
  let displayName: string | null = null
  let userRole: string = "guest"
  let subscriptionStatus: string = "unpaid"

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("level, display_name, role, subscription_status")
        .eq("id", user.id)
        .single()

      const profile = data as {
        level?: number | null
        display_name?: string | null
        role?: string | null
        subscription_status?: string | null
      } | null

      if (profile?.level) {
        userLevel = profile.level
      }
      displayName = profile?.display_name || user.email?.split("@")[0] || null
      userRole = profile?.role || "student"
      subscriptionStatus = profile?.subscription_status || "unpaid"
    }
  } catch {
    // If not authenticated, default to level 1 and guest
  }

  const initialCourses = await getCoursesList()

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
      <React.Suspense
        fallback={
          <div className="py-20 text-center text-xs text-muted-foreground space-y-2">
            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p>جاري تحميل المقررات والمحاضرات...</p>
          </div>
        }
      >
        <CoursesExplorer
          userLevel={userLevel}
          userDisplayName={displayName}
          userRole={userRole}
          subscriptionStatus={subscriptionStatus}
          initialCourses={initialCourses}
        />
      </React.Suspense>
    </div>
  )
}
