import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ fill, priority, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || "mocked-image"} />
  },
}))

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => Promise.resolve({ error: null }),
      delete: () => Promise.resolve({ error: null }),
    }),
  }),
}))

import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"
import { StudentNotesWidget } from "@/components/notes/StudentNotesWidget"
import { CourseStudyView } from "@/components/course/CourseStudyView"
import type { Course } from "@/data/coursesData"

const mockCourse: Course = {
  id: "course-elec-1",
  slug: "electronics-101",
  code: "ELEC101",
  title: "أساسيات الإلكترونيات (Electronics 101)",
  description: "دورة تعليمية شاملة لأساسيات الإلكترونيات",
  level: 1,
  semester: 1,
  status: "published",
  imageUrl: "https://example.com/elec.jpg",
  studyPlanDays: 7,
  lectures: [
    {
      id: "lec-1",
      number: 1,
      title: "مقدمة في الدوائر الكهربائية",
      summary: "شرح قانون أوم وقوانين كيرشوف",
      videoUrl: "https://youtube.com/watch?v=mockvideo",
      pdfUrl: "https://example.com/lecture1.pdf",
      pdfName: "سلايدات المحاضرة الأولى",
      videos: [
        {
          id: "v-1",
          title: "فيديو قانون أوم",
          url: "https://youtube.com/watch?v=mockvideo",
          source: "YouTube",
        },
      ],
      pdfs: [
        {
          id: "p-1",
          title: "سلايدات المحاضرة الأولى",
          url: "https://example.com/lecture1.pdf",
          size: "PDF",
        },
      ],
      roadmaps: [
        {
          id: "r-1",
          title: "خريطة المفاهيم",
          imageUrl: "https://example.com/map1.png",
        },
      ],
      quiz: [],
      topics: [],
    },
  ],
}

describe("UI Components (Integration Tests)", () => {
  describe("PasswordStrengthMeter", () => {
    it("should render empty state when no password is typed", () => {
      render(<PasswordStrengthMeter password="" />)
      expect(screen.getByText("قوة كلمة المرور:")).toBeInTheDocument()
      expect(screen.getByText("في انتظار الإدخال")).toBeInTheDocument()
    })

    it("should display strong status when all criteria are satisfied", () => {
      render(<PasswordStrengthMeter password="SuperSecurePassword123!" />)
      expect(screen.getByText("قوية جداً ومحمية بالكامل")).toBeInTheDocument()
      expect(screen.getByText("100%")).toBeInTheDocument()
    })
  })

  describe("CourseStudyView", () => {
    it("should render course title and course code badge", () => {
      render(<CourseStudyView course={mockCourse} isFreeTrial={true} />)
      expect(screen.getByRole("heading", { level: 1, name: /أساسيات الإلكترونيات/i })).toBeInTheDocument()
      expect(screen.getByText("ELEC101")).toBeInTheDocument()
    })

    it("should display the colorful exit button linking to /courses", () => {
      render(<CourseStudyView course={mockCourse} isFreeTrial={true} />)
      const exitButton = screen.getByRole("link", { name: /الخروج وتصفح جميع المواد/i })
      expect(exitButton).toBeInTheDocument()
      expect(exitButton).toHaveAttribute("href", "/courses")
    })

    it("should render lecture item and allow expanding content", async () => {
      const user = userEvent.setup()
      render(<CourseStudyView course={mockCourse} isFreeTrial={true} />)

      // Lecture row is visible
      const lectureHeader = screen.getByText(/محاضرة 1/i)
      expect(lectureHeader).toBeInTheDocument()
      expect(screen.getByText(/شرح قانون أوم وقوانين كيرشوف/i)).toBeInTheDocument()

      // Click to toggle lecture accordion open
      await user.click(lectureHeader)

      // Sub-section for video explanations is visible
      const videoSectionHeader = screen.getByText("الشرح")
      expect(videoSectionHeader).toBeInTheDocument()

      // Expand video section
      await user.click(videoSectionHeader)
      expect(screen.getByText(/فيديو قانون أوم/i)).toBeInTheDocument()
    })
  })

  describe("StudentNotesWidget", () => {
    it("should open notebook and render starter notes for preview users", async () => {
      const user = userEvent.setup()
      render(<StudentNotesWidget initialUser={null} />)

      const triggerBtn = screen.getByLabelText(/افتح دفتر الملاحظات السحابي/i)
      await user.click(triggerBtn)

      expect(screen.getByText(/دفتر الملاحظات السحابي/i)).toBeInTheDocument()
      expect(screen.getByText(/ملاحظات هامة — مادة الإلكترونيات/i)).toBeInTheDocument()
    })

    it("should filter notes by search query", async () => {
      const user = userEvent.setup()
      render(<StudentNotesWidget initialUser={null} />)

      const triggerBtn = screen.getByLabelText(/افتح دفتر الملاحظات السحابي/i)
      await user.click(triggerBtn)

      const searchInput = screen.getByPlaceholderText(/ابحث في ملاحظاتك/i)
      await user.type(searchInput, "CS101")

      // Only the CS101 note should match
      expect(screen.getByText(/خوارزميات البرمجة الهيكلية/i)).toBeInTheDocument()
      expect(screen.queryByText(/ملاحظات هامة — مادة الإلكترونيات/i)).not.toBeInTheDocument()
    })
  })
})
