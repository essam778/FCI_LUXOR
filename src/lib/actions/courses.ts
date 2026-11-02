"use server"

import { revalidatePath } from "next/cache"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { sanitizeInput } from "@/lib/security"
import type { Course } from "@/data/coursesData"

async function assertAdminCaller() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("غير مصرح: يجب تسجيل الدخول أولاً")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile as { role?: string } | null)?.role
  if (role !== "admin" && role !== "editor") {
    throw new Error("غير مصرح: هذه العملية مخصصة للمشرفين والمديرين فقط")
  }

  return { supabase, user }
}

/**
 * Save or update a course in Supabase database.
 */
export async function saveCourseToDatabase(course: {
  slug: string
  code: string
  title: string
  description?: string
  level: number
  semester: number
  status?: "published" | "draft" | "reviewed"
}): Promise<{ success: boolean; courseId?: string; error?: string }> {
  try {
    const { supabase } = await assertAdminCaller()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    const cleanTitle = sanitizeInput(course.title)
    const cleanCode = sanitizeInput(course.code)
    const cleanDesc = course.description ? sanitizeInput(course.description) : ""
    const slug = course.slug.toLowerCase().replace(/\s+/g, "-")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from("courses") as any)
      .upsert(
        {
          slug,
          code: cleanCode,
          title: cleanTitle,
          description: cleanDesc,
          level: course.level,
          semester: course.semester,
          status: course.status || "published",
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/courses")
    revalidatePath("/admin")
    return { success: true, courseId: data?.id }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ أثناء حفظ المقرر"
    return { success: false, error: msg }
  }
}

/**
 * Save or update a lecture/chapter in Supabase database.
 */
export async function saveChapterToDatabase(chapter: {
  courseId: string
  slug: string
  position: number
  title: string
  summary?: string
  difficulty?: number
}): Promise<{ success: boolean; chapterId?: string; error?: string }> {
  try {
    const { supabase } = await assertAdminCaller()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    const cleanTitle = sanitizeInput(chapter.title)
    const cleanSummary = chapter.summary ? sanitizeInput(chapter.summary) : ""
    const slug = chapter.slug.toLowerCase().replace(/\s+/g, "-")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.from("chapters") as any)
      .upsert(
        {
          course_id: chapter.courseId,
          slug,
          position: chapter.position,
          title: cleanTitle,
          summary: cleanSummary,
          difficulty: chapter.difficulty || 2,
          status: "published",
        },
        { onConflict: "course_id,slug" }
      )
      .select("id")
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/courses")
    revalidatePath("/admin")
    return { success: true, chapterId: data?.id }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ أثناء حفظ المحاضرة"
    return { success: false, error: msg }
  }
}

/**
 * Sync entire course object from Admin to Database.
 */
export async function syncFullCourseToDatabase(course: Course): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdminCaller()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    // 1. Upsert Course
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dbCourse, error: cErr } = await (client.from("courses") as any)
      .upsert(
        {
          slug: course.slug,
          code: course.code,
          title: course.title,
          description: course.description,
          level: course.level,
          semester: course.semester,
          status: course.status || "published",
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single()

    if (cErr || !dbCourse) {
      return { success: false, error: cErr?.message || "فشل مزامنة المقرر" }
    }

    // 2. Upsert Lectures
    for (let i = 0; i < course.lectures.length; i++) {
      const lec = course.lectures[i]
      const lecSlug = `lec-${lec.number || i + 1}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbChapter } = await (client.from("chapters") as any)
        .upsert(
          {
            course_id: dbCourse.id,
            slug: lecSlug,
            position: lec.number || i + 1,
            title: lec.title,
            summary: lec.summary,
            difficulty: 2,
            status: "published",
          },
          { onConflict: "course_id,slug" }
        )
        .select("id")
        .single()

      if (dbChapter) {
        // Upsert default topic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbTopic } = await (client.from("topics") as any)
          .upsert(
            {
              chapter_id: dbChapter.id,
              slug: `${lecSlug}-overview`,
              position: 1,
              title: lec.title,
              content_md: lec.summary,
              importance: 3,
              status: "published",
            },
            { onConflict: "chapter_id,slug" }
          )
          .select("id")
          .single()

        if (dbTopic) {
          // Upsert video resource if exists
          if (lec.videoUrl) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (client.from("resources") as any).insert({
              topic_id: dbTopic.id,
              type: "video",
              title: "فيديو الشرح الأساسي",
              url: lec.videoUrl,
              position: 1,
            })
          }
          // Upsert PDF resource if exists
          if (lec.pdfUrl) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (client.from("resources") as any).insert({
              topic_id: dbTopic.id,
              type: "slide",
              title: lec.pdfName || "سلايدات المحاضرة",
              url: lec.pdfUrl,
              position: 2,
            })
          }
        }
      }
    }

    revalidatePath("/courses")
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ أثناء مزامنة المقرر"
    return { success: false, error: msg }
  }
}

/**
 * Upload a course cover image directly to the 'course-covers' Supabase storage bucket.
 */
export async function uploadCourseCoverAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { supabase } = await assertAdminCaller()
    const file = formData.get("file") as File | null
    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: "Please select an image file to upload." }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase
    const ext = file.name.split(".").pop() || "jpg"
    const fileName = `cover-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const { data, error } = await client.storage
      .from("course-covers")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    const {
      data: { publicUrl },
    } = client.storage.from("course-covers").getPublicUrl(data.path)

    revalidatePath("/courses")
    revalidatePath("/admin")
    return { success: true, url: publicUrl }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to upload course cover image"
    return { success: false, error: msg }
  }
}
