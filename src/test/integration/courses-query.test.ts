import { describe, it, expect, vi, beforeEach } from "vitest"
import { getCoursesList, getCourseBySlug } from "@/lib/queries/courses"

// Mock the Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient } from "@/lib/supabase/server"

describe("Courses Query & Mapping (Integration Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch courses and correctly sort chapters and partition resources", async () => {
    const mockDbCourse = {
      id: "course-123",
      slug: "electronics-101",
      code: "ELEC101",
      title: "أساسيات الإلكترونيات",
      description: "كورس تمهيدي لدوائر الإلكترونيات",
      level: 1,
      semester: 1,
      status: "published",
      image_url: "https://example.com/banner.jpg",
      chapters: [
        {
          id: "ch-2",
          position: 2,
          title: "الفصل الثاني: المقاومات والمكثفات",
          summary: "دراسة المقاومة والمكثف في دوائر التيار المستمر",
          topics: [],
        },
        {
          id: "ch-1",
          position: 1,
          title: "الفصل الأول: مدخل للتيار والجهد",
          summary: "مقدمة شاملة",
          topics: [
            {
              id: "t-1",
              slug: "intro-circuit",
              title: "قانون أوم",
              position: 1,
              content_md: "شرح قانون أوم الرياضي",
              importance: 5,
              doctor_favorites: ["مهم في الامتحان النهائي"],
              mindmap_md: JSON.stringify([
                {
                  id: 1,
                  question: "ما هي وحدة قياس المقاومة الكهربائية؟",
                  options: ["أوم", "فولت", "أمبير", "واط"],
                  correctIndex: 0,
                  explanation: "وحدة قياس المقاومة هي الأوم (Ohm)",
                },
              ]),
              resources: [
                {
                  id: "res-video",
                  type: "video",
                  title: "شرح قانون أوم بالفيديو",
                  url: "https://youtube.com/watch?v=mock123",
                  source_name: "YouTube",
                  position: 1,
                },
                {
                  id: "res-pdf",
                  type: "slide",
                  title: "ملخص السلايدات (PDF)",
                  url: "https://example.com/lecture1.pdf",
                  position: 2,
                },
                {
                  id: "res-map",
                  type: "roadmap",
                  title: "خريطة المفاهيم للتيار",
                  url: "https://example.com/roadmap1.png",
                  position: 3,
                },
              ],
            },
          ],
        },
      ],
    }

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [mockDbCourse],
        error: null,
      }),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

    const courses = await getCoursesList()
    expect(courses).toHaveLength(1)

    const course = courses[0]
    expect(course.title).toBe("أساسيات الإلكترونيات")
    expect(course.code).toBe("ELEC101")
    expect(course.lectures).toHaveLength(2)

    // Chapters must be sorted ascending by position
    expect(course.lectures[0].title).toBe("الفصل الأول: مدخل للتيار والجهد")
    expect(course.lectures[1].title).toBe("الفصل الثاني: المقاومات والمكثفات")

    // First chapter resources mapped properly
    const firstLecture = course.lectures[0]
    expect(firstLecture.videoUrl).toBe("https://youtube.com/watch?v=mock123")
    expect(firstLecture.pdfUrl).toBe("https://example.com/lecture1.pdf")
    expect(firstLecture.videos).toHaveLength(1)
    expect(firstLecture.pdfs).toHaveLength(1)
    expect(firstLecture.roadmaps).toHaveLength(1)

    // Quiz questions parsed from mindmap_md JSON
    expect(firstLecture.quiz).toHaveLength(1)
    expect(firstLecture.quiz?.[0]?.question).toContain("وحدة قياس المقاومة")
    expect(firstLecture.quiz?.[0]?.correctIndex).toBe(0)

    // Topics mapped with doctor's notes
    expect(firstLecture.topics).toHaveLength(1)
    expect(firstLecture.topics[0].doctorNote).toBe("مهم في الامتحان النهائي")
  })

  it("should return null gracefully if course is not found in database", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }
    // Also satisfy getCoursesList fallback if maybeSingle returns null
    ;(mockSupabase.order as any).mockResolvedValue({
      data: [],
      error: null,
    })

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

    const course = await getCourseBySlug("non-existent-course")
    expect(course).toBeNull()
  })
})
