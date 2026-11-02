import { NextResponse } from "next/server"
import { getCoursesList } from "@/lib/queries/courses"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const courses = await getCoursesList()
  return NextResponse.json(courses)
}

