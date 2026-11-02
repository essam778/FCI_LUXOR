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
      return COURSES_DATA
    }

    // Map database courses to frontend Course format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: Course[] = (dbCourses as any[]).map((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chaptersList = (c.chapters as any[]) || []
      chaptersList.sort((a, b) => (a.position || 0) - (b.position || 0))

      const official = COURSES_DATA.find(
        (o) => o.slug === c.slug || o.code === c.code || o.id === c.id
      )

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
          official?.imageUrl ||
          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
        studyPlanDays: official?.studyPlanDays || 7,
        lectures: chaptersList.map((ch, idx) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const topicsList = (ch.topics as any[]) || []
          topicsList.sort((a, b) => (a.position || 0) - (b.position || 0))

          // Extract all videos, pdfs, and roadmaps from topics
          const videosList: { id: string; title: string; url: string; source?: string }[] = []
          const pdfsList: { id: string; title: string; url: string; size?: string }[] = []
          const roadmapsList: { id: string; title: string; imageUrl: string; description?: string }[] = []

          let videoUrl: string | undefined
          let pdfUrl: string | undefined
          let pdfName: string | undefined

          for (const t of topicsList) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const r of (t.resources as any[]) || []) {
              if (r.type === "video" && r.url) {
                if (!videoUrl) videoUrl = r.url
                videosList.push({
                  id: r.id,
                  title: r.title || "فيديو شرح",
                  url: r.url,
                  source: r.source_name || "YouTube",
                })
              }
              if ((r.type === "slide" || r.type === "book") && r.url) {
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
              }
              if (r.type === "roadmap" && r.url) {
                roadmapsList.push({
                  id: r.id,
                  title: r.title || "خريطة المفاهيم",
                  imageUrl: r.url,
                })
              }
            }
          }

          const officialLec = official?.lectures.find(
            (ol) => ol.id === ch.id || ol.number === idx + 1 || ol.title === ch.title
          )

          const finalVideos =
            videosList.length > 0
              ? videosList
              : officialLec?.videos ||
                (videoUrl ? [{ id: `${ch.id}-v1`, title: "فيديو الشرح الأساسي", url: videoUrl }] : [])

          const finalPdfs =
            pdfsList.length > 0
              ? pdfsList
              : officialLec?.pdfs ||
                (pdfUrl ? [{ id: `${ch.id}-p1`, title: pdfName || "سلايدات المحاضرة", url: pdfUrl }] : [])

          return {
            id: ch.id,
            number: idx + 1,
            title: ch.title,
            summary: ch.summary || "",
            videoUrl: videoUrl || finalVideos[0]?.url,
            pdfUrl: pdfUrl || finalPdfs[0]?.url,
            pdfName: pdfName || finalPdfs[0]?.title,
            videos: finalVideos,
            pdfs: finalPdfs,
            roadmaps: roadmapsList.length > 0 ? roadmapsList : officialLec?.roadmaps || [],
            quiz: officialLec?.quiz || [],
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
