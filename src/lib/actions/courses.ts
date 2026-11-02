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

    // 1. Upsert Course with cover image
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
          image_url: course.imageUrl,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single()

    if (cErr || !dbCourse) {
      return { success: false, error: cErr?.message || "فشل مزامنة المقرر" }
    }

    // 2. Delete chapters that were removed by admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingChapters } = await (client.from("chapters") as any)
      .select("id, slug")
      .eq("course_id", dbCourse.id)

    const currentSlugs = new Set(
      course.lectures.map((lec, i) => `lec-${lec.number || i + 1}`)
    )

    if (existingChapters && existingChapters.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toDelete = (existingChapters as any[])
        .filter((ec) => !currentSlugs.has(ec.slug))
        .map((ec) => ec.id)

      if (toDelete.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.from("chapters") as any)
          .delete()
          .in("id", toDelete)
      }
    }

    // 3. Upsert Lectures and ALL attached media (videos, pdfs, roadmaps)
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
            summary: lec.summary || "",
            difficulty: 2,
            status: "published",
          },
          { onConflict: "course_id,slug" }
        )
        .select("id")
        .single()

      if (dbChapter) {
        // Upsert overview topic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbTopic } = await (client.from("topics") as any)
          .upsert(
            {
              chapter_id: dbChapter.id,
              slug: `${lecSlug}-overview`,
              position: 1,
              title: lec.title,
              content_md: lec.summary || "",
              importance: 3,
              status: "published",
            },
            { onConflict: "chapter_id,slug" }
          )
          .select("id")
          .single()

        if (dbTopic) {
          // Clear previous resources to prevent duplicates
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (client.from("resources") as any)
            .delete()
            .eq("topic_id", dbTopic.id)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const resourcesToInsert: any[] = []

          // 1. ALL Videos attached to lecture
          const videos =
            Array.isArray(lec.videos) && lec.videos.length > 0
              ? lec.videos
              : lec.videoUrl
              ? [{ id: `v1`, title: "فيديو الشرح الأساسي", url: lec.videoUrl }]
              : []

          videos.forEach((v, vIdx) => {
            if (v.url) {
              resourcesToInsert.push({
                topic_id: dbTopic.id,
                type: "video",
                title: v.title || `فيديو ${vIdx + 1}`,
                url: v.url,
                source_name: v.source || "YouTube",
                position: vIdx + 1,
              })
            }
          })

          // 2. ALL PDFs attached to lecture
          const pdfs =
            Array.isArray(lec.pdfs) && lec.pdfs.length > 0
              ? lec.pdfs
              : lec.pdfUrl
              ? [{ id: `p1`, title: lec.pdfName || "سلايدات المحاضرة", url: lec.pdfUrl }]
              : []

          pdfs.forEach((p, pIdx) => {
            if (p.url) {
              resourcesToInsert.push({
                topic_id: dbTopic.id,
                type: "slide",
                title: p.title || `ملف المحاضرة ${pIdx + 1}`,
                url: p.url,
                position: 10 + pIdx,
              })
            }
          })

          // 3. ALL Roadmaps attached to lecture
          if (Array.isArray(lec.roadmaps)) {
            lec.roadmaps.forEach((m, mIdx) => {
              if (m.imageUrl) {
                resourcesToInsert.push({
                  topic_id: dbTopic.id,
                  type: "roadmap",
                  title: m.title || `خريطة المفاهيم ${mIdx + 1}`,
                  url: m.imageUrl,
                  position: 20 + mIdx,
                })
              }
            })
          }

          if (resourcesToInsert.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (client.from("resources") as any).insert(resourcesToInsert)
          }
        }
      }
    }

    revalidatePath("/courses")
    revalidatePath(`/courses/${course.slug}`)
    revalidatePath("/")
    revalidatePath("/admin")
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
