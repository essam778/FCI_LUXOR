import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { Course, QuizQuestion } from "@/data/coursesData"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbCourseToCourse(c: any): Course {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chaptersList = (c.chapters as any[]) || []
  chaptersList.sort((a, b) => (a.position || 0) - (b.position || 0))

  return {
    id: c.id,
    slug: c.slug,
    code: c.code || "",
    title: c.title,
    description: c.description || "",
    level: c.level || 1,
    semester: (c.semester || 1) as 1 | 2,
    status: (c.status || "published") as Course["status"],
    imageUrl:
      c.image_url ||
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
    studyPlanDays: 7,
    lectures: chaptersList.map((ch, idx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const topicsList = (ch.topics as any[]) || []
      topicsList.sort((a, b) => (a.position || 0) - (b.position || 0))

      // Extract all videos, pdfs, roadmaps, and quiz
      const videosList: { id: string; title: string; url: string; source?: string }[] = []
      const pdfsList: { id: string; title: string; url: string; size?: string }[] = []
      const roadmapsList: { id: string; title: string; imageUrl: string; description?: string }[] = []
      let quizList: QuizQuestion[] = []

      let videoUrl: string | undefined
      let pdfUrl: string | undefined
      let pdfName: string | undefined

      for (const t of topicsList) {
        // Check for serialized quiz questions stored in mindmap_md
        if (t.mindmap_md) {
          try {
            const parsedQuiz = JSON.parse(t.mindmap_md)
            if (Array.isArray(parsedQuiz) && parsedQuiz.length > 0) {
              quizList = parsedQuiz
            }
          } catch {
            // Not JSON, ignore
          }
        }

        // Sort resources strictly by position
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resourcesSorted = ((t.resources as any[]) || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0))

        for (const r of resourcesSorted) {
          if (r.type === "video" && r.url) {
            if (!videoUrl) videoUrl = r.url
            videosList.push({
              id: r.id,
              title: r.title || "فيديو شرح",
              url: r.url,
              source: r.source_name || "YouTube",
            })
          } else if ((r.type === "slide" || r.type === "book") && r.url) {
            if (!pdfUrl) {
              pdfUrl = r.url
              pdfName = r.title
            }
            pdfsList.push({
              id: r.id,
              title: r.title || "ملف المحاضرة",
              url: r.url,
              size: "PDF",
            })
          } else if (
            (r.type === "roadmap" ||
              (r.type === "link" &&
                (r.source_name === "roadmap" ||
                  r.title?.includes("خريطة") ||
                  r.title?.includes("خريطه") ||
                  r.title?.includes("مخطط")))) &&
            r.url
          ) {
            roadmapsList.push({
              id: r.id,
              title: r.title || "خريطة المفابيم",
              imageUrl: r.url,
            })
          } else if (r.type === "link" && r.url) {
            // If the link has .pdf or is named like a slide/book, treat as PDF
            const isPdf =
              r.url.toLowerCase().includes(".pdf") ||
              r.title?.toLowerCase().includes("pdf") ||
              r.title?.includes("سلايد") ||
              r.title?.includes("مذكرة")
            if (isPdf) {
              if (!pdfUrl) {
                pdfUrl = r.url
                pdfName = r.title
              }
              pdfsList.push({
                id: r.id,
                title: r.title || "ملف المحاضرة (PDF)",
                url: r.url,
                size: "PDF",
              })
            } else {
              // Otherwise treat as concept map / external study link
              roadmapsList.push({
                id: r.id,
                title: r.title || "خريطة المفاهيم",
                imageUrl: r.url,
              })
            }
          }
        }
      }

      // Custom topics created by the admin (excluding auto overview)
      const customTopics = topicsList
        .filter((t) => !t.slug?.endsWith("-overview"))
        .map((t) => ({
          id: t.id,
          slug: t.slug,
          title: t.title,
          summary: t.content_md || "",
          importance: t.importance || 3,
          doctorNote: Array.isArray(t.doctor_favorites) ? t.doctor_favorites.join(" • ") : undefined,
        }))

      return {
        id: ch.id,
        number: ch.position || idx + 1,
        title: ch.title,
        summary: ch.summary || "",
        videoUrl: videoUrl || videosList[0]?.url,
        pdfUrl: pdfUrl || pdfsList[0]?.url,
        pdfName: pdfName || pdfsList[0]?.title,
        videos: videosList,
        pdfs: pdfsList,
        roadmaps: roadmapsList,
        quiz: quizList,
        topics: customTopics,
      }
    }),
  }
}

/**
 * Fetch all published courses strictly from Supabase database.
 * Deduplicated per-request via React.cache().
 */
export const getCoursesList = cache(async (): Promise<Course[]> => {
  try {
    const supabase = await createClient()
    const { data: dbCourses, error } = await supabase
      .from("courses")
      .select(`
        id,
        slug,
        code,
        title,
        description,
        level,
        semester,
        status,
        image_url,
        chapters (
          id,
          slug,
          position,
          title,
          summary,
          difficulty,
          status,
          topics (
            id,
            slug,
            position,
            title,
            content_md,
            mindmap_md,
            importance,
            doctor_favorites,
            resources (
              id,
              type,
              title,
              url,
              start_time,
              source_name,
              position
            )
          )
        )
      `)
      .eq("status", "published")
      .order("level", { ascending: true })

    if (error || !dbCourses || dbCourses.length === 0) {
      return []
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dbCourses as any[]).map((c) => mapDbCourseToCourse(c))
  } catch (e) {
    console.error("[getCoursesList error]", e)
    return []
  }
})

/**
 * Get a single course by its slug or code strictly from Supabase database.
 * Optimized targeted query + deduplicated per-request via React.cache().
 */
export const getCourseBySlug = cache(async (slugOrCode: string): Promise<Course | null> => {
  try {
    const clean = decodeURIComponent(slugOrCode).trim()
    const isUuid = UUID_REGEX.test(clean)
    const supabase = await createClient()

    // Targeted single-course query directly by slug or code
    let query = supabase
      .from("courses")
      .select(`
        id,
        slug,
        code,
        title,
        description,
        level,
        semester,
        status,
        image_url,
        chapters (
          id,
          slug,
          position,
          title,
          summary,
          difficulty,
          status,
          topics (
            id,
            slug,
            position,
            title,
            content_md,
            mindmap_md,
            importance,
            doctor_favorites,
            resources (
              id,
              type,
              title,
              url,
              start_time,
              source_name,
              position
            )
          )
        )
      `)
      .limit(1)

    if (isUuid) {
      query = query.or(`slug.ilike.${clean},code.ilike.${clean},id.eq.${clean}`)
    } else {
      query = query.or(`slug.ilike.${clean},code.ilike.${clean}`)
    }

    const { data: dbCourse, error } = await query.maybeSingle()

    if (!error && dbCourse) {
      return mapDbCourseToCourse(dbCourse)
    }

    // Safe fallback to full scan in case of complex non-ASCII or legacy code
    const allCourses = await getCoursesList()
    const normalized = clean.toLowerCase()
    return (
      allCourses.find(
        (c) =>
          c.slug.toLowerCase() === normalized ||
          c.code.toLowerCase() === normalized ||
          c.id.toLowerCase() === normalized
      ) || null
    )
  } catch (e) {
    console.error("[getCourseBySlug error]", e)
    return null
  }
})
