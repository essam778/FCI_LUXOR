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
 * Permanently delete a course and all its chapters, topics, and resources from Supabase.
 */
export async function deleteCourseFromDatabase(courseIdOrSlug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await assertAdminCaller()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = createAdminClient() || supabase

    // Find course by id or slug
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetCourse } = await (client.from("courses") as any)
      .select("id, slug")
      .or(`id.eq.${courseIdOrSlug},slug.eq.${courseIdOrSlug}`)
      .single()

    const realId = targetCourse?.id || courseIdOrSlug

    // 1. Get all chapters to delete topics & resources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: chapters } = await (client.from("chapters") as any)
      .select("id")
      .eq("course_id", realId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chapterIds = (chapters || []).map((ch: any) => ch.id)
    if (chapterIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: topics } = await (client.from("topics") as any)
        .select("id")
        .in("chapter_id", chapterIds)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topicIds = (topics || []).map((t: any) => t.id)
      if (topicIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.from("resources") as any).delete().in("topic_id", topicIds)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.from("topics") as any).delete().in("id", topicIds)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.from("chapters") as any).delete().in("id", chapterIds)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from("courses") as any).delete().eq("id", realId)
    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/courses")
    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ أثناء حذف المقرر"
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
 * Sync entire course object from Admin to Database strictly.
 * Uses chapter ID (when available from DB) to avoid slug-mismatch mass-deletion.
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

    // 2. Load existing chapters from DB to compare
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingChapters } = await (client.from("chapters") as any)
      .select("id, slug")
      .eq("course_id", dbCourse.id)

    // Build the set of slugs/ids we WILL upsert
    // Strategy: use lec.id directly when it looks like a DB UUID (not "lec-..." or "custom-...")
    const isDbUuid = (id: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    const getSlugForLecture = (lec: Course["lectures"][number], i: number): string => {
      const num = typeof lec.number === "number" && lec.number > 0 ? lec.number : i + 1
      return `lec-${num}`
    }

    // Build set of "identifiers" for current lectures (DB ids or slugs)
    const currentChapterIds = new Set(
      course.lectures.map((lec) => (isDbUuid(lec.id) ? lec.id : null)).filter(Boolean)
    )
    const currentSlugs = new Set(course.lectures.map((lec, i) => getSlugForLecture(lec, i)))

    // Build a map from existing slug → existing chapter id (for reuse without delete)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingSlugToId = new Map<string, string>((existingChapters || []).map((ec: any) => [ec.slug, ec.id]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingIdToSlug = new Map<string, string>((existingChapters || []).map((ec: any) => [ec.id, ec.slug]))

    // Delete only chapters that are NOT referenced by current lectures (either by id or slug)
    if (existingChapters && existingChapters.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toDelete = (existingChapters as any[])
        .filter((ec) => {
          // Keep if its id is explicitly referenced
          if (currentChapterIds.has(ec.id)) return false
          // Keep if its slug matches current slugs
          if (currentSlugs.has(ec.slug)) return false
          return true
        })
        .map((ec) => ec.id)

      if (toDelete.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: topicsToDelete } = await (client.from("topics") as any)
          .select("id")
          .in("chapter_id", toDelete)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topicIds = (topicsToDelete || []).map((t: any) => t.id)
        if (topicIds.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (client.from("resources") as any).delete().in("topic_id", topicIds)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (client.from("topics") as any).delete().in("id", topicIds)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (client.from("chapters") as any).delete().in("id", toDelete)
        // Cleanup maps
        for (const id of toDelete) {
          const slug = existingIdToSlug.get(id)
          if (slug) existingSlugToId.delete(slug)
          existingIdToSlug.delete(id)
        }
      }
    }

    // 3. Upsert Lectures and ALL attached media (videos, pdfs, roadmaps, quiz)
    for (let i = 0; i < course.lectures.length; i++) {
      const lec = course.lectures[i]
      const lecSlug = getSlugForLecture(lec, i)
      const lecNumber = typeof lec.number === "number" && lec.number > 0 ? lec.number : i + 1

      // Build upsert payload
      // If lec.id is a real DB UUID, upsert by id (most reliable — avoids slug conflicts)
      // If lec.id is a local id (lec-timestamp), upsert by course_id+slug conflict
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chapterPayload: any = {
        course_id: dbCourse.id,
        slug: lecSlug,
        position: lecNumber,
        title: lec.title,
        summary: lec.summary || "",
        difficulty: 2,
        status: "published",
      }
      if (isDbUuid(lec.id)) {
        // Include the real DB id so Supabase does a targeted UPDATE
        chapterPayload.id = lec.id
      } else if (existingSlugToId.has(lecSlug)) {
        // We know the existing DB id for this slug, pin it
        chapterPayload.id = existingSlugToId.get(lecSlug)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbChapter, error: chErr } = await (client.from("chapters") as any)
        .upsert(chapterPayload, { onConflict: "course_id,slug" })
        .select("id")
        .single()

      if (chErr || !dbChapter) {
        console.error("[syncFullCourse] Chapter upsert failed:", chErr?.message)
        continue
      }

      // Serialize quiz questions in mindmap_md for full DB persistence
      const serializedQuiz = Array.isArray(lec.quiz) && lec.quiz.length > 0 ? JSON.stringify(lec.quiz) : null

      // Upsert overview topic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbTopic, error: topErr } = await (client.from("topics") as any)
        .upsert(
          {
            chapter_id: dbChapter.id,
            slug: `${lecSlug}-overview`,
            position: 1,
            title: lec.title,
            content_md: lec.summary || "",
            mindmap_md: serializedQuiz,
            importance: 3,
            status: "published",
          },
          { onConflict: "chapter_id,slug" }
        )
        .select("id")
        .single()

      if (topErr || !dbTopic) {
        console.error("[syncFullCourse] Topic upsert failed:", topErr?.message)
        continue
      }

      // Clear previous resources then re-insert fresh set
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client.from("resources") as any).delete().eq("topic_id", dbTopic.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resourcesToInsert: any[] = []

      // ALL Videos
      const videos =
        Array.isArray(lec.videos) && lec.videos.length > 0
          ? lec.videos
          : lec.videoUrl
          ? [{ id: "v1", title: "فيديو الشرح الأساسي", url: lec.videoUrl }]
          : []

      videos.forEach((v, vIdx) => {
        if (v.url && v.url.trim()) {
          resourcesToInsert.push({
            topic_id: dbTopic.id,
            type: "video",
            title: v.title || `فيديو ${vIdx + 1}`,
            url: v.url.trim(),
            source_name: v.source || "YouTube",
            position: vIdx + 1,
          })
        }
      })

      // ALL PDFs
      const pdfs =
        Array.isArray(lec.pdfs) && lec.pdfs.length > 0
          ? lec.pdfs
          : lec.pdfUrl
          ? [{ id: "p1", title: lec.pdfName || "سلايدات المحاضرة", url: lec.pdfUrl }]
          : []

      pdfs.forEach((p, pIdx) => {
        if (p.url && p.url.trim()) {
          resourcesToInsert.push({
            topic_id: dbTopic.id,
            type: "slide",
            title: p.title || `ملف المحاضرة ${pIdx + 1}`,
            url: p.url.trim(),
            position: 10 + pIdx,
          })
        }
      })

      // ALL Roadmaps / Mindmaps
      if (Array.isArray(lec.roadmaps)) {
        lec.roadmaps.forEach((m, mIdx) => {
          if (m.imageUrl && m.imageUrl.trim()) {
            resourcesToInsert.push({
              topic_id: dbTopic.id,
              type: "roadmap",
              title: m.title || `خريطة المفاهيم ${mIdx + 1}`,
              url: m.imageUrl.trim(),
              position: 20 + mIdx,
            })
          }
        })
      }

      if (resourcesToInsert.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: resErr } = await (client.from("resources") as any).insert(resourcesToInsert)
        if (resErr) {
          console.error("[syncFullCourse] Resource insert failed:", resErr.message, JSON.stringify(resourcesToInsert.map(r => ({ type: r.type, url: r.url?.substring(0, 80) }))))
          return { success: false, error: `فشل حفظ الملفات المرفقة بالمحاضرة "${lec.title}": ${resErr.message}` }
        }
      }

      // Upsert any custom sub-topics inside the lecture
      if (Array.isArray(lec.topics)) {
        for (let tIdx = 0; tIdx < lec.topics.length; tIdx++) {
          const top = lec.topics[tIdx]
          const topSlug = top.slug || `${lecSlug}-topic-${tIdx + 1}`
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (client.from("topics") as any).upsert(
            {
              chapter_id: dbChapter.id,
              slug: topSlug,
              position: tIdx + 2,
              title: top.title,
              content_md: top.summary || "",
              importance: top.importance || 3,
              doctor_favorites: top.doctorNote ? [top.doctorNote] : [],
              status: "published",
            },
            { onConflict: "chapter_id,slug" }
          )
        }
      }
    }

    revalidatePath("/courses")
    revalidatePath(`/courses/${course.slug}`)
    revalidatePath(`/courses/${course.code}`)
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
