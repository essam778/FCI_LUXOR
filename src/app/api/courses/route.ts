import { NextResponse } from "next/server"
import { getCoursesList } from "@/lib/queries/courses"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { isFreeTrialCourse, maskCourseForTeaser } from "@/lib/subscriptionUtils"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const courses = await getCoursesList()
  
  // Verify caller authorization
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hasFullAccess = false

  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase
    const { data: profile } = await client
      .from("profiles")
      .select("role, subscription_status")
      .eq("id", user.id)
      .single()

    const role = profile?.role || "student"
    const subStatus = profile?.subscription_status || "unpaid"

    if (role === "admin" || role === "editor" || subStatus === "active" || subStatus === "lifetime") {
      hasFullAccess = true
    }
  }

  // If full access, return raw list
  if (hasFullAccess) {
    return NextResponse.json(courses)
  }

  // Otherwise, protect premium assets: strip videos, slides, quizzes from locked courses
  const sanitizedCourses = courses.map((course) => {
    if (isFreeTrialCourse(course)) {
      return course
    }
    return maskCourseForTeaser(course)
  })

  return NextResponse.json(sanitizedCourses)
}

