import { createClient } from "@/lib/supabase/server"
import { COURSES_DATA, type Course } from "@/data/coursesData"

/**
 * Fetch all published courses from Supabase.
 * Falls back seamlessly to bundled COURSES_DATA if database records are empty or network fails.
 */
export async function getCoursesList(): Promise<Course[]> {
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
      return COURSES_DATA
    }

    // Map database courses to frontend Course format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: Course[] = (dbCourses as any[]).map((c) => {
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
        lectures: chaptersList.map((ch, idx) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const topicsList = (ch.topics as any[]) || []
          topicsList.sort((a, b) => (a.position || 0) - (b.position || 0))

          // Extract primary video and pdf from topics if available
          let videoUrl: string | undefined
          let pdfUrl: string | undefined
          let pdfName: string | undefined

          for (const t of topicsList) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const r of (t.resources as any[]) || []) {
              if (r.type === "video" && !videoUrl) videoUrl = r.url
              if (r.type === "slide" || r.type === "book") {
                if (!pdfUrl) {
                  pdfUrl = r.url
                  pdfName = r.title
                }
              }
            }
          }

          return {
            id: ch.id,
            number: idx + 1,
            title: ch.title,
            summary: ch.summary || "",
            videoUrl,
            pdfUrl,
            pdfName,
            topics: topicsList.map((t) => ({
              id: t.id,
              slug: t.slug,
              title: t.title,
              summary: t.content_md || "",
              importance: t.importance || 3,
              doctorNote: Array.isArray(t.doctor_favorites) ? t.doctor_favorites.join(" • ") : undefined,
            })),
          }
        }),
      }
    })

    return mapped.length > 0 ? mapped : COURSES_DATA
  } catch {
    return COURSES_DATA
  }
}

/**
 * Get a single course by its slug or code
 */
export async function getCourseBySlug(slugOrCode: string): Promise<Course | null> {
  const allCourses = await getCoursesList()
  const normalized = decodeURIComponent(slugOrCode).toLowerCase()
  return (
    allCourses.find(
      (c) =>
        c.slug.toLowerCase() === normalized ||
        c.code.toLowerCase() === normalized ||
        c.id.toLowerCase() === normalized
    ) || null
  )
}
