import * as React from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCourseBySlug, getCoursesList } from "@/lib/queries/courses"
import { CourseStudyView } from "@/components/course/CourseStudyView"

interface CoursePageProps {
  params: Promise<{
    courseSlug: string
  }>
}

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

export async function generateStaticParams() {
  const courses = await getCoursesList()
  return courses.map((c) => ({
    courseSlug: c.slug,
  }))
}

export default async function SingleCoursePage({ params }: CoursePageProps) {
  const { courseSlug } = await params
  const course = await getCourseBySlug(courseSlug)

  if (!course) {
    notFound()
  }

  return <CourseStudyView course={course} />
}
