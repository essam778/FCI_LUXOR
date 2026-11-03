import * as React from "react"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCourseBySlug } from "@/lib/queries/courses"
import { CourseStudyView } from "@/components/course/CourseStudyView"
import { CoursePaywall } from "@/components/course/CoursePaywall"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import type { PaymentRequestItem } from "@/lib/actions/subscriptions"
import { isFreeTrialCourse } from "@/lib/subscriptionUtils"

interface CoursePageProps {
  params: Promise<{
    courseSlug: string
  }>
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { courseSlug } = await params
  const course = await getCourseBySlug(courseSlug)

  if (!course) {
    return {
      title: "المقرر غير موجود | منصة حاسبات",
    }
  }

  return {
    title: `${course.title} (${course.code}) | منصة حاسبات`,
    description: course.description || `منهج ومحاضرات مادة ${course.title} لطلاب كليات الحاسبات والذكاء الاصطناعي.`,
    openGraph: {
      title: `${course.title} (${course.code})`,
      description: course.description || `استعرض شروحات ومحاضرات مقرر ${course.title}`,
      type: "article",
    },
  }
}

export default async function SingleCoursePage({ params }: CoursePageProps) {
  const { courseSlug } = await params
  const course = await getCourseBySlug(courseSlug)

  if (!course) {
    notFound()
  }

  // 1. Strict Authentication Check: Student must be logged in to enter any course
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirectTo=/courses/${courseSlug}`)
  }

  // 2. Fetch User Profile & Subscription Status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = createAdminClient() || supabase

  const { data: profile } = await client
    .from("profiles")
    .select("role, subscription_status")
    .eq("id", user.id)
    .single()

  const role = profile?.role || "student"
  const subscriptionStatus = profile?.subscription_status || "unpaid"

  // 3. Superusers (Admin & Editor) always have full access
  if (role === "admin" || role === "editor") {
    return <CourseStudyView course={course} />
  }

  // 4. Free Trial Course (e.g. Electronics ELEC101) is open for evaluation to all registered students
  const isFree = isFreeTrialCourse(course)
  if (isFree) {
    return <CourseStudyView course={course} isFreeTrial={true} />
  }

  // 5. Active Paid Subscription has full access
  if (subscriptionStatus === "active" || subscriptionStatus === "lifetime") {
    return <CourseStudyView course={course} />
  }

  // 6. Otherwise: Show Paywall & Activation Screen
  const { data: latestReq } = await client
    .from("payment_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <CoursePaywall
      course={course}
      initialPendingRequest={latestReq as PaymentRequestItem | null}
    />
  )
}
