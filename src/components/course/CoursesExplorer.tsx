"use client"

import * as React from "react"
import {
  BookOpen,
  ChevronDown,
  Layers,
  Search,
  FileText,
  Play,
  HelpCircle,
  Sparkles,
  Download,
  Eye,
  ArrowRight,
  Monitor,
  Code2,
  Cpu,
  Atom,
  Calculator,
  MessageSquare,
  Languages,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Inbox,
  Workflow,
  Maximize2,
  ExternalLink,
  X,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ACADEMIC_YEARS,
  COURSES_DATA,
  type Course,
  type LectureChapter,
  type VideoItem,
  type PdfItem,
  type RoadmapItem,
} from "@/data/coursesData"

interface CoursesExplorerProps {
  userLevel?: number | null
  userDisplayName?: string | null
}

// Helper to convert standard video URL to safe embed URL
function getEmbedUrl(url?: string): string | null {
  if (!url) return null
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }
  return url
}

// Icon helper per course code
function getCourseIcon(code: string) {
  const c = code.toUpperCase()
  if (c.includes("IT")) return Monitor
  if (c.includes("CS") || c.includes("PROG")) return Code2
  if (c.includes("ELEC") || c.includes("LOGIC")) return Cpu
  if (c.includes("PHYS")) return Atom
  if (c.includes("MATH")) return Calculator
  if (c.includes("COMM")) return MessageSquare
  if (c.includes("ENG")) return Languages
  return BookOpen
}

// Separate Arabic title from English title in parentheses to prevent mobile BiDi wrapping bugs
function parseCourseTitle(title: string): { ar: string; en: string | null } {
  const match = title.match(/^(.*?)\s*[\(\[]([A-Za-z0-9\s.,&/\-_]+)[\)\]]$/)
  if (match && match[1].trim() && match[2].trim()) {
    return {
      ar: match[1].trim(),
      en: match[2].trim(),
    }
  }
  return { ar: title, en: null }
}

// Normalized media getters for backward compatibility
function getLectureVideos(lecture: LectureChapter): VideoItem[] {
  if (lecture.videos && lecture.videos.length > 0) return lecture.videos
  if (lecture.videoUrl) {
    return [
      {
        id: `${lecture.id}-v1`,
        title: "فيديو الشرح الأساسي للمحاضرة",
        url: lecture.videoUrl,
        duration: "شرح شامل",
        source: "YouTube",
      },
    ]
  }
  return []
}

function getLecturePdfs(lecture: LectureChapter): PdfItem[] {
  if (lecture.pdfs && lecture.pdfs.length > 0) return lecture.pdfs
  if (lecture.pdfUrl) {
    return [
      {
        id: `${lecture.id}-pdf1`,
        title: lecture.pdfName || "سلايدات ومذكرة المحاضرة الرسمية",
        url: lecture.pdfUrl,
        size: "ملف PDF",
      },
    ]
  }
  return []
}

function getLectureRoadmaps(lecture: LectureChapter): RoadmapItem[] {
  return lecture.roadmaps || []
}

// OneDrive and Cloud URL helpers
function isOneDriveUrl(url?: string): boolean {
  if (!url) return false
  return (
    url.includes("sharepoint.com") ||
    url.includes("1drv.ms") ||
    url.includes("onedrive.live.com")
  )
}


// Quiz Generator for lectures (checks custom quiz created by Admin first)
function getLectureQuizQuestions(lecture: LectureChapter) {
  if (lecture.quiz && lecture.quiz.length > 0) {
    return lecture.quiz
  }
  return [
    {
      id: 1,
      question: `ما هو المفهوم الأساسي الذي تركز عليه ${lecture.title}؟`,
      options: [
        lecture.summary || "المفاهيم النظرية والتطبيقية الأساسية",
        "حفظ الأكواد والتعاريف دون فهم",
        "تخطي شيتات وتمارين المعمل",
        "الاعتماد على التخمين أثناء الاختبارات",
      ],
      correctIndex: 0,
      explanation: "يركز المنهج الأكاديمي على فهم الأساس المنطقي والتطبيق العملي وفق شيتات الكلية.",
    },
    {
      id: 2,
      question: "ما هي أفضل ممارسة أثناء دراسة ومراجعة هذه المحاضرة؟",
      options: [
        "حل نماذج امتحانات السنوات السابقة وكتابة الكود باليد",
        "قراءة السلايدات فقط بدون تطبيق",
        "تأجيل الأسئلة ليلة الامتحان فقط",
        "عدم مراجعة أسئلة الـ MCQ السابقة",
      ],
      correctIndex: 0,
      explanation: "الكتابة اليدوية وحل امتحانات الفصول السابقة يضمن التميز ودرجة الـ A+.",
    },
    {
      id: 3,
      question: "وفقاً لتوجيهات أساتذة المادة، ما الذي يجب الانتباه له في شيتات الدكتور؟",
      options: [
        "التركيز على شروط الحدود (Boundary Cases) والتعقيد الحسابي",
        "إهمال المدخلات الخاطئة",
        "كتابة حلول عشوائية",
        "تجاهل خطوات الحل النموذجية",
      ],
      correctIndex: 0,
      explanation: "أساتذة حاسبات يهتمون بحالات الاختبار الدقيقة والشروط الحدية في ورقة الإجابة.",
    },
  ]
}

export function CoursesExplorer({ userLevel = 1 }: CoursesExplorerProps) {
  const searchParams = useSearchParams()

  // Academic year is determined by userLevel, no manual switcher buttons here
  const selectedYear = userLevel && userLevel >= 1 && userLevel <= 4 ? userLevel : 1
  const [searchQuery, setSearchQuery] = React.useState<string>("")

  // Navigation View: "semesters_boxes" (showing Sem 1 & Sem 2 boxes) or "semester_details" (inside a semester)
  const [currentView, setCurrentView] = React.useState<"semesters_boxes" | "semester_details">("semesters_boxes")
  const [activeSemester, setActiveSemester] = React.useState<1 | 2>(1)

  // Expanded items state
  const [expandedCourses, setExpandedCourses] = React.useState<Record<string, boolean>>({
    "l1-s1-it101": true,
  })
  const [expandedLectures, setExpandedLectures] = React.useState<Record<string, boolean>>({
    "l1-s1-it-lec1": true,
  })

  // Active media sub-selection
  const [activeVideoPerLecture, setActiveVideoPerLecture] = React.useState<Record<string, string>>({})
  const [previewRoadmap, setPreviewRoadmap] = React.useState<RoadmapItem | null>(null)

  const toggleLecture = (lectureId: string) => {
    setExpandedLectures((prev) => ({
      ...prev,
      [lectureId]: !prev[lectureId],
    }))
  }

  // Open/closed state for nested sections inside each lecture
  // e.g. openSections[lectureId] = { video: true, pdf: false, ... }
  const [openSections, setOpenSections] = React.useState<Record<string, Record<string, boolean>>>({
    "l1-s1-it-lec1": { video: true, pdf: false, roadmap: false, quiz: false, topics: false },
  })

  const toggleLectureSection = (lectureId: string, section: "video" | "pdf" | "roadmap" | "quiz" | "topics") => {
    setOpenSections((prev) => {
      const current = prev[lectureId] || {}
      return {
        ...prev,
        [lectureId]: {
          ...current,
          [section]: !current[section],
        },
      }
    })
  }

  const isSectionOpen = (
    lectureId: string,
    section: "video" | "pdf" | "roadmap" | "quiz" | "topics",
    defaultOpen = false
  ): boolean => {
    const current = openSections[lectureId]
    if (!current || current[section] === undefined) {
      return defaultOpen
    }
    return current[section]
  }

  // Per-lecture quiz state
  const [quizAnswers, setQuizAnswers] = React.useState<Record<string, Record<string | number, number>>>({})
  const [quizSubmitted, setQuizSubmitted] = React.useState<Record<string, boolean>>({})

  const handleSelectQuizAnswer = (lectureId: string, qId: string | number, optIdx: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [lectureId]: {
        ...(prev[lectureId] || {}),
        [qId]: optIdx,
      },
    }))
  }

  const handleResetQuiz = (lectureId: string) => {
    setQuizAnswers((prev) => ({ ...prev, [lectureId]: {} }))
    setQuizSubmitted((prev) => ({ ...prev, [lectureId]: false }))
  }

  const handleSubmitQuiz = (lectureId: string) => {
    setQuizSubmitted((prev) => ({ ...prev, [lectureId]: true }))
  }

  // Courses list with local persistence support using v3 key
  const [allCourses, setAllCourses] = React.useState<Course[]>(COURSES_DATA)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("fci_admin_courses")
        localStorage.removeItem("fci_admin_courses_v2")
        const stored = localStorage.getItem("fci_admin_courses_v3")
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Keep only current official courses plus courses explicitly created by admin
            const valid = parsed.filter(
              (c: Course) =>
                c.id.startsWith("admin-") ||
                COURSES_DATA.some((official) => official.id === c.id)
            )
            setAllCourses(valid)
          }
        }
      } catch {
        // ignore
      }
    }
  }, [])

  // Deep linking handler: Automatically navigate to course/lecture/section when triggered via URL (e.g. notifications)
  React.useEffect(() => {
    if (!searchParams) return
    const courseIdParam = searchParams.get("courseId")
    const lecIdParam = searchParams.get("lecId")
    const semParam = searchParams.get("sem")
    const sectionParam = searchParams.get("section") as "video" | "pdf" | "roadmap" | "quiz" | null

    if (courseIdParam || lecIdParam || semParam) {
      if (courseIdParam) {
        const found = allCourses.find((c) => c.id === courseIdParam)
        if (found) {
          setActiveSemester(found.semester as 1 | 2)
        } else if (semParam === "1" || semParam === "2") {
          setActiveSemester(Number(semParam) as 1 | 2)
        }
        setCurrentView("semester_details")
        setExpandedCourses((prev) => ({ ...prev, [courseIdParam]: true }))
      } else if (semParam === "1" || semParam === "2") {
        setActiveSemester(Number(semParam) as 1 | 2)
        setCurrentView("semester_details")
      }

      if (lecIdParam) {
        setExpandedLectures((prev) => ({ ...prev, [lecIdParam]: true }))
        if (sectionParam) {
          setOpenSections((prev) => ({
            ...prev,
            [lecIdParam]: {
              ...(prev[lecIdParam] || {}),
              [sectionParam]: true,
            },
          }))
        }
      }

      const targetId = lecIdParam
        ? `lecture-${lecIdParam}`
        : courseIdParam
        ? `course-${courseIdParam}`
        : null

      if (targetId && typeof window !== "undefined") {
        setTimeout(() => {
          const el = document.getElementById(targetId)
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" })
          }
        }, 350)
      }
    }
  }, [searchParams, allCourses])

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }))
  }

  const currentYearObj = ACADEMIC_YEARS.find((y) => y.level === selectedYear) || ACADEMIC_YEARS[0]

  // Filter courses for active academic year
  const yearCourses = React.useMemo(() => {
    return allCourses.filter((course) => course.level === selectedYear)
  }, [selectedYear, allCourses])

  const term1Courses = React.useMemo(() => {
    return yearCourses.filter((c) => c.semester === 1)
  }, [yearCourses])

  const term2Courses = React.useMemo(() => {
    return yearCourses.filter((c) => c.semester === 2)
  }, [yearCourses])

  // Filtered courses when search is active
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return allCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.lectures.some((l) => l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q))
    )
  }, [searchQuery, allCourses])

  const displayedCourses = React.useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults
    }
    return activeSemester === 1 ? term1Courses : term2Courses
  }, [searchQuery, searchResults, activeSemester, term1Courses, term2Courses])

  // Render Quiz Section
  const renderQuizSection = (lecture: LectureChapter) => {
    const questions = getLectureQuizQuestions(lecture)
    const answersForLec = quizAnswers[lecture.id] || {}
    const isSubmitted = !!quizSubmitted[lecture.id]
    const score = questions.reduce(
      (acc, q) => (answersForLec[q.id] === q.correctIndex ? acc + 1 : acc),
      0
    )

    return (
      <div className="p-4 sm:p-5 rounded-2xl border-2 border-purple-500/30 bg-purple-950/10 dark:bg-purple-950/25 shadow-lg space-y-4 animate-in fade-in duration-200 text-start">
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <HelpCircle className="size-4.5" />
            </div>
            <div>
              <h5 className="text-sm font-extrabold text-foreground">
                كويز تفاعلي: {lecture.title}
              </h5>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[11px] text-muted-foreground font-semibold">
                  {questions.length} أسئلة استيعاب
                </span>
                {lecture.quiz && lecture.quiz.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    كويز مخصص من الدكتور
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleResetQuiz(lecture.id)}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RotateCcw className="size-3.5 me-1" />
            <span>إعادة تعيين</span>
          </Button>
        </div>

        <div className="space-y-3.5">
          {questions.map((q, qIdx) => {
            const selectedOpt = answersForLec[q.id]
            return (
              <div key={q.id} className="p-3.5 rounded-xl bg-card border border-border/70 space-y-2.5 text-start">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono font-bold text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/15">
                    سؤال {qIdx + 1}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                    {q.question}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedOpt === optIdx
                    const isCorrect = q.correctIndex === optIdx
                    let btnStyle = "border-border/60 hover:bg-muted/40 text-foreground"
                    if (isSubmitted) {
                      if (isCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold"
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "border-destructive bg-destructive/10 text-destructive font-bold"
                      }
                    } else if (isSelected) {
                      btnStyle = "border-purple-500 bg-purple-500/15 text-purple-400 font-bold"
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => handleSelectQuizAnswer(lecture.id, q.id, optIdx)}
                        className={`w-full text-start p-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between cursor-pointer ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {isSubmitted && isCorrect && <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />}
                        {isSubmitted && isSelected && !isCorrect && (
                          <XCircle className="size-4 text-destructive shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {isSubmitted && (
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-bold text-purple-400">توضيح الإجابة: </span>
                    {q.explanation || "يركز هذا السؤال على استيعاب المفاهيم الأساسية الواردة بالمحاضرة."}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          {isSubmitted ? (
            <div className="flex items-center justify-between w-full">
              <div className="text-xs font-bold text-foreground">
                النتيجة النهائية: <span className="text-purple-400 font-black text-sm">{score} من {questions.length}</span>{" "}
                ({score === questions.length ? "ممتاز! استيعاب كامل للمحاضرة 🎯" : "راجع الأخطاء جيداً"})
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResetQuiz(lecture.id)}
                className="gap-1.5 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>إعادة الكويز</span>
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              disabled={Object.keys(answersForLec).length === 0}
              onClick={() => handleSubmitQuiz(lecture.id)}
              className="w-full text-xs font-black py-2 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
            >
              تصحيح الكويز وإظهار النتيجة
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Render a Single Course (LEVEL 1) and its Lectures (LEVEL 2) and Contents (LEVEL 3)
  const renderCourseItem = (course: Course) => {
    const isExpanded = !!expandedCourses[course.id]
    const CourseIcon = getCourseIcon(course.code)
    const totalTopics = course.lectures.reduce((acc, lec) => acc + lec.topics.length, 0)

    return (
      /* =============================================================== */
      /* LEVEL 1: THE COURSE BOX (المادة الدراسية - الإطار الأبوي الأكبر) */
      /* Distinct Style: Grand border, electric lime accent, credit pill  */
      /* =============================================================== */
      <div
        key={course.id}
        id={`course-${course.id}`}
        className={`rounded-2xl border-2 transition-all duration-300 text-start overflow-hidden relative shadow-md ${
          isExpanded
            ? "border-primary/60 bg-card shadow-xl shadow-primary/5 ring-1 ring-primary/20"
            : "border-border/90 bg-card hover:border-primary/40 hover:shadow-lg"
        }`}
      >
        {/* Course Accent Strip on Right Border */}
        <div className={`absolute top-0 end-0 bottom-0 w-1.5 transition-colors ${isExpanded ? "bg-primary" : "bg-primary/40"}`} />

        {/* Course Card Header */}
        <div
          onClick={() => toggleCourse(course.id)}
          className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 select-none transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 sm:size-12 rounded-xl bg-primary/10 border-2 border-primary/30 text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <CourseIcon className="size-5 sm:size-6 stroke-[2.2]" />
            </div>
            <div className="space-y-1 text-start min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Course Code Badge */}
                <span className="font-mono text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0">
                  {course.code}
                </span>
                <h4 className="text-sm sm:text-lg font-black text-foreground hover:text-primary transition-colors leading-snug">
                  {parseCourseTitle(course.title).ar}
                </h4>
              </div>
              {parseCourseTitle(course.title).en && (
                <div dir="ltr" className="text-start">
                  <span className="inline-block text-[11px] sm:text-xs text-muted-foreground font-mono font-medium tracking-tight">
                    {parseCourseTitle(course.title).en}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl line-clamp-2 pt-0.5">
                {course.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-bold bg-muted/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-border/60 text-foreground text-[11px] sm:text-xs">
                <Layers className="size-3 sm:size-3.5 text-primary" />
                {course.lectures.length} محاضرات
              </span>
              <span className="inline-flex items-center gap-1 font-bold bg-muted/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-border/60 text-foreground text-[11px] sm:text-xs">
                <FileText className="size-3 sm:size-3.5 text-primary" />
                {totalTopics} موضوع
              </span>
            </div>

            <div
              className={`size-7 sm:size-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground transition-transform duration-200 ${
                isExpanded ? "rotate-180 bg-primary text-primary-foreground shadow-xs" : ""
              }`}
            >
              <ChevronDown className="size-4 sm:size-4.5 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* LEVEL 2: LECTURES LIST INSIDE THE COURSE (محاضرات المادة)       */}
        {/* Distinct Style: Indented, sky-blue frame, sub-chapter pill     */}
        {/* =============================================================== */}
        {isExpanded && (
          <div className="border-t-2 border-primary/20 bg-muted/15 dark:bg-black/25 p-3.5 sm:p-5 space-y-3.5 animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="size-5 text-sky-500" />
                <span>محاضرات المقرر ({course.lectures.length})</span>
              </span>
             
            </div>

            <div className="space-y-3">
              {course.lectures.map((lecture) => {
                const isLecExpanded = !!expandedLectures[lecture.id]
                const videos = getLectureVideos(lecture)
                const pdfs = getLecturePdfs(lecture)
                const roadmaps = getLectureRoadmaps(lecture)
                const quizQuestions = getLectureQuizQuestions(lecture)
                const activeVideoUrl = activeVideoPerLecture[lecture.id] || videos[0]?.url
                const embedVideo = getEmbedUrl(activeVideoUrl)

                // Clean lecture title to prevent repetitive "محاضرة 1 المحاضرة 1:"
                const cleanTitle = lecture.title.replace(/^(ال)?محاضرة\s*\d+[\s:ـ-]*/i, "").trim()

                return (
                  <div
                    key={lecture.id}
                    id={`lecture-${lecture.id}`}
                    className={`ms-1 sm:ms-4 rounded-xl border-2 transition-all duration-200 text-start overflow-hidden relative shadow-xs ${
                      isLecExpanded
                        ? "border-sky-500/60 bg-sky-950/10 dark:bg-sky-950/25 ring-1 ring-sky-500/30"
                        : "border-sky-500/25 bg-card hover:border-sky-500/50 hover:bg-sky-500/[0.02]"
                    }`}
                  >
                    {/* Lecture Accent Strip on Right */}
                    <div
                      className={`absolute top-0 end-0 bottom-0 w-1 transition-colors ${
                        isLecExpanded ? "bg-sky-500" : "bg-sky-500/40"
                      }`}
                    />

                    {/* Lecture Header Row - Clickable to expand/collapse lecture */}
                    <div
                      onClick={() => toggleLecture(lecture.id)}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-muted/20 select-none transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Lecture Badge */}
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-black text-[11px] sm:text-xs shrink-0 transition-colors ${
                            isLecExpanded
                              ? "bg-sky-600 dark:bg-sky-500 text-white shadow-xs"
                              : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                          }`}
                        >
                          محاضرة {lecture.number}
                        </span>
                        <h5 className="text-xs sm:text-base font-extrabold text-foreground line-clamp-2 leading-snug">
                          {cleanTitle}
                        </h5>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Subtle media indicator badges */}
                        {videos.length > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <Play className="size-3" />
                            <span>{videos.length > 1 ? `${videos.length} فيديوهات` : "فيديو"}</span>
                          </span>
                        )}
                        {pdfs.length > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <FileText className="size-3" />
                            <span>{pdfs.length > 1 ? `${pdfs.length} ملفات PDF` : "PDF"}</span>
                          </span>
                        )}
                        {roadmaps.length > 0 && (
                          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                            <Workflow className="size-3" />
                            <span>{roadmaps.length > 1 ? `${roadmaps.length} خرائط` : "خريطة"}</span>
                          </span>
                        )}
                        <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                          <HelpCircle className="size-3" />
                          <span>كويز</span>
                        </span>

                        <div
                          className={`size-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground transition-transform duration-200 ${
                            isLecExpanded ? "rotate-180 bg-sky-500 text-white" : ""
                          }`}
                        >
                          <ChevronDown className="size-3.5 stroke-[2.5]" />
                        </div>
                      </div>
                    </div>

                    {/* =============================================================== */}
                    {/* LEVEL 3: NESTED CONTENT BOXES INSIDE LECTURE                    */}
                    {/* Distinct Style: Vertically Stacked Nested Section Accordions    */}
                    {/* =============================================================== */}
                    {isLecExpanded && (
                      <div className="p-3.5 sm:p-5 border-t-2 border-sky-500/20 bg-background/95 dark:bg-black/60 space-y-3.5 animate-in slide-in-from-top-1 duration-150">
                        {/* Lecture Summary */}
                        {lecture.summary && (
                          <p className="text-xs text-muted-foreground leading-relaxed bg-card p-3 rounded-xl border border-border/80">
                            {lecture.summary}
                          </p>
                        )}

                        {/* ========================================== */}
                        {/* 1. SECTION: VIDEOS ACCORDION               */}
                        {/* ========================================== */}
                        <div className="rounded-xl border border-emerald-500/30 bg-card overflow-hidden transition-all shadow-xs">
                          <div
                            onClick={() => toggleLectureSection(lecture.id, "video")}
                            className="p-3 sm:p-3.5 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer flex items-center justify-between gap-2.5 select-none transition-colors border-b border-emerald-500/20"
                          >
                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                              <div className="size-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                                <Play className="size-3.5 fill-current" />
                              </div>
                              <h6 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                                <span className="sm:hidden">فيديوهات الشرح</span>
                                <span className="hidden sm:inline">فيديوهات الشرح والمحاضرات المسجلة</span>
                              </h6>
                              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap shrink-0">
                                {videos.length} {videos.length === 1 ? "فيديو" : "فيديوهات"}
                              </span>
                            </div>
                            <div
                              className={`size-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground transition-transform duration-200 shrink-0 ${
                                isSectionOpen(lecture.id, "video", true)
                                  ? "rotate-180 bg-emerald-500 text-white"
                                  : ""
                              }`}
                            >
                              <ChevronDown className="size-3.5" />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "video", true) && (
                            <div className="p-3.5 sm:p-4 space-y-3 bg-background/50">
                              {videos.length > 0 && embedVideo ? (
                                <div className="space-y-3">
                                  {/* Cinema Embed Player */}
                                  <div className="rounded-2xl overflow-hidden border-2 border-emerald-500/30 bg-black/80 space-y-2 p-2 sm:p-3 shadow-xl">
                                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                                      <iframe
                                        src={embedVideo}
                                        title={cleanTitle}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 size-full border-0"
                                      />
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-muted-foreground px-2 pt-1">
                                      <span className="font-bold text-foreground truncate">
                                        {videos.find((v) => v.url === activeVideoUrl)?.title || cleanTitle}
                                      </span>
                                      {activeVideoUrl && (
                                        <a
                                          href={activeVideoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-emerald-500 hover:underline font-bold inline-flex items-center gap-1 text-[11px] sm:text-xs shrink-0 self-start sm:self-auto"
                                        >
                                          <span>مشاهدة في نافذة مستقلة</span>
                                          <ExternalLink className="size-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Video Playlist Grid if multiple videos exist */}
                                  {videos.length > 1 && (
                                    <div className="space-y-2 pt-1">
                                      <span className="text-xs font-bold text-foreground">
                                        قائمة فيديوهات المحاضرة ({videos.length}):
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {videos.map((v, vIdx) => {
                                          const isPlaying = activeVideoUrl === v.url
                                          return (
                                            <button
                                              key={v.id || vIdx}
                                              type="button"
                                              onClick={() =>
                                                setActiveVideoPerLecture((prev) => ({
                                                  ...prev,
                                                  [lecture.id]: v.url,
                                                }))
                                              }
                                              className={`p-2.5 rounded-xl border text-start flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                                                isPlaying
                                                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 font-bold shadow-xs ring-1 ring-emerald-500/40"
                                                  : "bg-card border-border hover:border-emerald-500/50 text-foreground"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                  className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                                                    isPlaying
                                                      ? "bg-emerald-500 text-white shadow-xs"
                                                      : "bg-muted text-foreground"
                                                  }`}
                                                >
                                                  <Play className="size-3.5 fill-current" />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-xs font-bold truncate">{v.title}</p>
                                                  {v.duration && (
                                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                                      ⏱ {v.duration}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              {isPlaying && (
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500 text-white shrink-0">
                                                  مشغل الآن ▶
                                                </span>
                                              )}
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-6 text-center rounded-xl border border-dashed border-border bg-card text-muted-foreground text-xs space-y-1">
                                  <p className="font-bold text-foreground">لم يتم ربط فيديوهات شرح لهذه المحاضرة بعد</p>
                                  <p className="text-[11px]">يمكن للأدمن إضافة روابط يوتيوب ومقاطع المعمل من لوحة التحكم.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ========================================== */}
                        {/* 2. SECTION: PDF SLIDES & SHEETS ACCORDION  */}
                        {/* ========================================== */}
                        <div className="rounded-xl border border-amber-500/30 bg-card overflow-hidden transition-all shadow-xs">
                          <div
                            onClick={() => toggleLectureSection(lecture.id, "pdf")}
                            className="p-3 sm:p-3.5 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer flex items-center justify-between gap-2.5 select-none transition-colors border-b border-amber-500/20"
                          >
                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                              <div className="size-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                                <FileText className="size-3.5" />
                              </div>
                              <h6 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                                <span className="sm:hidden">سلايدات وملفات PDF</span>
                                <span className="hidden sm:inline">سلايدات ومذكرات الـ PDF والشيتات الرسمية</span>
                              </h6>
                              <span className="text-[10px] sm:text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 whitespace-nowrap shrink-0">
                                {pdfs.length} {pdfs.length === 1 ? "ملف" : "ملفات"}
                              </span>
                            </div>
                            <div
                              className={`size-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground transition-transform duration-200 shrink-0 ${
                                isSectionOpen(lecture.id, "pdf", false)
                                  ? "rotate-180 bg-amber-500 text-white"
                                  : ""
                              }`}
                            >
                              <ChevronDown className="size-3.5" />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "pdf", false) && (
                            <div className="p-3.5 sm:p-4 space-y-3 bg-background/50">
                              {pdfs.length > 0 ? (
                                <div className="space-y-3">
                                  {/* PDFs List */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {pdfs.map((pdf, pIdx) => {
                                      const isOneDrive = isOneDriveUrl(pdf.url)
                                      return (
                                        <div
                                          key={pdf.id || pIdx}
                                          className="p-3 rounded-xl border border-border bg-card hover:border-amber-500/40 flex items-center justify-between gap-2.5 transition-all shadow-xs"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="size-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                              <FileText className="size-5" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-bold text-foreground truncate">{pdf.title}</p>
                                              <div className="flex items-center gap-1.5 pt-0.5">
                                                {isOneDrive && (
                                                  <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                                                    OneDrive سحابي
                                                  </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground font-semibold">
                                                  {pdf.size || "PDF"}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <a
                                              href={pdf.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-xs hover:shadow inline-flex items-center gap-1.5 cursor-pointer"
                                              title={isOneDrive ? "فتح الملف في OneDrive السحابي" : "تحميل / فتح الملف"}
                                            >
                                              <Download className="size-3.5" />
                                              <span>تحميل / فتح الملف</span>
                                              <ExternalLink className="size-3 opacity-75" />
                                            </a>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>

                                  
                                </div>
                              ) : (
                                <div className="p-6 text-center rounded-xl border border-dashed border-border bg-card text-muted-foreground text-xs space-y-1">
                                  <p className="font-bold text-foreground">لم يتم رفع ملفات PDF لهذه المحاضرة بعد</p>
                                  <p className="text-[11px]">يمكن للأدمن رفع سلايدات الدكتور وملفات الشيتات من لوحة التحكم أو وضع روابط OneDrive مباشرة.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ========================================== */}
                        {/* 3. SECTION: ROADMAPS & INFOGRAPHICS        */}
                        {/* ========================================== */}
                        <div className="rounded-xl border border-cyan-500/30 bg-card overflow-hidden transition-all shadow-xs">
                          <div
                            onClick={() => toggleLectureSection(lecture.id, "roadmap")}
                            className="p-3 sm:p-3.5 bg-cyan-500/5 hover:bg-cyan-500/10 cursor-pointer flex items-center justify-between gap-2.5 select-none transition-colors border-b border-cyan-500/20"
                          >
                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                              <div className="size-7 rounded-lg bg-cyan-500/20 text-cyan-500 flex items-center justify-center shrink-0">
                                <Workflow className="size-3.5" />
                              </div>
                              <h6 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                                <span className="sm:hidden">خرائط المفاهيم</span>
                                <span className="hidden sm:inline">الخرائط الذهنية ومخططات المفاهيم (Roadmaps)</span>
                              </h6>
                              <span className="text-[10px] sm:text-[11px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 whitespace-nowrap shrink-0">
                                {roadmaps.length} {roadmaps.length === 1 ? "خريطة" : "خرائط"}
                              </span>
                            </div>
                            <div
                              className={`size-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground transition-transform duration-200 shrink-0 ${
                                isSectionOpen(lecture.id, "roadmap", false)
                                  ? "rotate-180 bg-cyan-500 text-white"
                                  : ""
                              }`}
                            >
                              <ChevronDown className="size-3.5" />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "roadmap", false) && (
                            <div className="p-3.5 sm:p-4 space-y-3 bg-background/50">
                              {roadmaps.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {roadmaps.map((map) => (
                                    <div
                                      key={map.id}
                                      className="rounded-xl border border-cyan-500/30 bg-card overflow-hidden shadow-xs hover:border-cyan-500 transition-all group"
                                    >
                                      <div
                                        onClick={() => setPreviewRoadmap(map)}
                                        className="relative aspect-video w-full bg-muted/40 cursor-pointer overflow-hidden"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={map.imageUrl}
                                          alt={map.title}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs">
                                          <Maximize2 className="size-4" />
                                          <span>عرض بالحجم الكامل</span>
                                        </div>
                                      </div>
                                      <div className="p-3.5 space-y-1.5 text-start">
                                        <h6 className="text-xs sm:text-sm font-extrabold text-foreground">
                                          {map.title}
                                        </h6>
                                        {map.description && (
                                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            {map.description}
                                          </p>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setPreviewRoadmap(map)}
                                          className="w-full mt-2 text-xs font-bold gap-1.5 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 cursor-pointer"
                                        >
                                          <Eye className="size-3.5" />
                                          <span>تكبير الخريطة الذهنية</span>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-6 text-center rounded-xl border border-dashed border-border bg-card text-muted-foreground text-xs space-y-1">
                                  <Workflow className="size-7 mx-auto text-muted-foreground/60 mb-1" />
                                  <p className="font-bold text-foreground">
                                    لم تتم إضافة خريطة مفاهيم أو Roadmap لهذه المحاضرة بعد
                                  </p>
                                  <p className="text-[11px]">
                                    يمكن للأدمن إرفاق مخططات المفاهيم والرسوم التوضيحية من لوحة التحكم.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ========================================== */}
                        {/* 4. SECTION: INTERACTIVE QUIZ ACCORDION     */}
                        {/* ========================================== */}
                        <div className="rounded-xl border border-purple-500/30 bg-card overflow-hidden transition-all shadow-xs">
                          <div
                            onClick={() => toggleLectureSection(lecture.id, "quiz")}
                            className="p-3 sm:p-3.5 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer flex items-center justify-between gap-2.5 select-none transition-colors border-b border-purple-500/20"
                          >
                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                              <div className="size-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                                <HelpCircle className="size-3.5" />
                              </div>
                              <h6 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                                <span className="sm:hidden">كويز تفاعلي</span>
                                <span className="hidden sm:inline">كويز تفاعلي لاختبار الاستيعاب الأكاديمي</span>
                              </h6>
                              <span className="text-[10px] sm:text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 whitespace-nowrap shrink-0">
                                {quizQuestions.length} {quizQuestions.length === 1 ? "سؤال" : "أسئلة"}
                              </span>
                            </div>
                            <div
                              className={`size-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground transition-transform duration-200 shrink-0 ${
                                isSectionOpen(lecture.id, "quiz", false)
                                  ? "rotate-180 bg-purple-500 text-white"
                                  : ""
                              }`}
                            >
                              <ChevronDown className="size-3.5" />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "quiz", false) && (
                            <div className="p-3.5 sm:p-4 bg-background/50">
                              {renderQuizSection(lecture)}
                            </div>
                          )}
                        </div>

                        {/* ========================================== */}
                        {/* 5. SECTION: TOPICS & DOCTOR FOCUS NOTES    */}
                        {/* ========================================== */}
                        <div className="rounded-xl border border-indigo-500/30 bg-card overflow-hidden transition-all shadow-xs">
                          <div
                            onClick={() => toggleLectureSection(lecture.id, "topics")}
                            className="p-3 sm:p-3.5 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer flex items-center justify-between gap-2.5 select-none transition-colors border-b border-indigo-500/20"
                          >
                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                              <div className="size-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                <Sparkles className="size-3.5" />
                              </div>
                              <h6 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                                <span className="sm:hidden">عناصر ومحاور الشرح</span>
                                <span className="hidden sm:inline">عناصر ومحاور الشرح ونقاط تركيز الدكتور</span>
                              </h6>
                              <span className="text-[10px] sm:text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 whitespace-nowrap shrink-0">
                                {lecture.topics.length} عناصر
                              </span>
                            </div>
                            <div
                              className={`size-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground transition-transform duration-200 shrink-0 ${
                                isSectionOpen(lecture.id, "topics", false)
                                  ? "rotate-180 bg-indigo-500 text-white"
                                  : ""
                              }`}
                            >
                              <ChevronDown className="size-3.5" />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "topics", false) && (
                            <div className="p-3.5 sm:p-4 space-y-2 bg-background/50">
                              {lecture.topics && lecture.topics.length > 0 ? (
                                <div className="space-y-2">
                                  {lecture.topics.map((t, tIdx) => (
                                    <div
                                      key={t.id}
                                      className="p-3 rounded-xl bg-card border border-border/80 hover:border-indigo-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-start"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="size-6 rounded-lg bg-muted text-foreground flex items-center justify-center text-[11px] font-mono font-bold shrink-0">
                                          {tIdx + 1}
                                        </span>
                                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                                          {t.title}
                                        </span>
                                      </div>
                                      {t.doctorNote && (
                                        <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-500 font-bold bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 shrink-0">
                                          <Sparkles className="size-3 text-amber-500" />
                                          <span>تركيز الدكتور: {t.doctorNote}</span>
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-6 text-center rounded-xl border border-dashed border-border bg-card text-muted-foreground text-xs">
                                  لا توجد عناصر مسجلة بعد لهذه المحاضرة.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8 text-center sm:text-start" dir="rtl">
      {/* Top Header - No year switcher buttons here as requested */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-border/70">
        <div className="space-y-1 text-start">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            المقررات والمناهج الدراسية
          </h1>
        
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="ابحث عن مادة، كود (CS101)، محاضرة، أو موضوع محدد..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-10 bg-card border-border/80 h-10 rounded-xl text-xs sm:text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            مسح
          </button>
        )}
      </div>

      {/* VIEW 1: SEARCH ACTIVE */}
      {searchQuery.trim() !== "" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              نتائج البحث عن &quot;{searchQuery}&quot; ({searchResults.length} مادة)
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSearchQuery("")}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              إلغاء البحث
            </Button>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
              <Search className="size-10 text-muted-foreground mx-auto" />
              <h3 className="text-base font-bold text-foreground">لم يتم العثور على نتائج مطابقة</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                جرب البحث بكلمات أخرى أو تصفح المواد مباشرة من خلال الفصول الدراسية.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((course) => renderCourseItem(course))}
            </div>
          )}
        </div>
      ) : currentView === "semesters_boxes" ? (
        /* VIEW 2: TWO MAIN SEMESTERS BOXES */
        <div className="space-y-6">
          <div className="text-start">
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
              الفصول الدراسية — {currentYearObj.name}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Semester 1 */}
            <div
              onClick={() => {
                setActiveSemester(1)
                setCurrentView("semester_details")
              }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer text-start space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  Semester 1
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                  الفصل الدراسي الأول
                </h3>
              </div>

              {/* Quick Subject Tags or Bold Empty Box */}
              {term1Courses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {term1Courses.slice(0, 7).map((c) => (
                    <span
                      key={c.id}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-muted/50 text-foreground border border-border/50"
                    >
                      {c.title.split("(")[0].trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="my-2 py-6 px-4 rounded-xl bg-muted/30 border border-dashed border-border/80 text-center space-y-1.5">
                  <p className="text-xl sm:text-2xl font-black text-foreground">
                    لم تتم إضافة مواد بعد
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المقررات قيد التجهيز والاعتماد الأكاديمي
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
                <span>{term1Courses.length > 0 ? "دخول مواد الترم الأول" : "استعراض الفصل"}</span>
                <ArrowRight className="size-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Box 2: Semester 2 */}
            <div
              onClick={() => {
                setActiveSemester(2)
                setCurrentView("semester_details")
              }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer text-start space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  Semester 2
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                  الفصل الدراسي الثاني
                </h3>
              </div>

              {/* Quick Subject Tags or Bold Empty Box */}
              {term2Courses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {term2Courses.map((c) => (
                    <span
                      key={c.id}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-muted/50 text-foreground border border-border/50"
                    >
                      {c.title.split("(")[0].trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="my-2 py-6 px-4 rounded-xl bg-muted/30 border border-dashed border-border/80 text-center space-y-1.5">
                  <p className="text-xl sm:text-2xl font-black text-foreground">
                    لم تتم إضافة مواد بعد
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المقررات قيد التجهيز والاعتماد الأكاديمي
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
                <span>{term2Courses.length > 0 ? "دخول مواد الترم الثاني" : "استعراض الفصل"}</span>
                <ArrowRight className="size-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 3: INSIDE SEMESTER VIEW (Courses and Lectures) */
        <div className="space-y-6">
          {/* Breadcrumb / Back Navigation - Glowing Neon Button without semester tabs switcher */}
          <div className="flex items-center justify-start pb-4 border-b border-border">
            <button
              type="button"
              onClick={() => setCurrentView("semesters_boxes")}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-primary/20 text-primary border-2 border-primary shadow-[0_0_20px_rgba(132,204,22,0.35)] hover:shadow-[0_0_30px_rgba(132,204,22,0.6)] hover:bg-primary hover:text-primary-foreground transition-all duration-300 cursor-pointer active:scale-95"
            >
              <ArrowRight className="size-4.5 stroke-[2.5]" />
              <span>العودة لاختيار الفصل الدراسي</span>
            </button>
          </div>

          {/* Heading for this Semester */}
          <div className="text-start">
            <h2 className="text-base sm:text-xl font-extrabold text-foreground flex flex-wrap items-center gap-2">
              <span>مواد {activeSemester === 1 ? "الفصل الدراسي الأول" : "الفصل الدراسي الثاني"}</span>
              {displayedCourses.length > 0 && (
                <span className="inline-flex items-center text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                  ({displayedCourses.length} مواد)
                </span>
              )}
            </h2>
          </div>

          {/* If no courses: Prominent, Large, Bold Empty State */}
          {displayedCourses.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-3xl border border-dashed border-border/80 bg-card/60 space-y-5 max-w-2xl mx-auto my-8 animate-in fade-in-50 duration-200">
              <div className="size-20 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto border border-border">
                <Inbox className="size-10 text-muted-foreground/80" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                  لم تتم إضافة مواد بعد
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  المقررات الدراسية لهذا الفصل ({currentYearObj.name} -{" "}
                  {activeSemester === 1 ? "الترم الأول" : "الترم الثاني"}) قيد التجهيز والاعتماد الأكاديمي، وسيتم
                  رفع المحاضرات ومصادر المذاكرة قريباً.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentView("semesters_boxes")}
                  className="text-xs font-bold gap-2 cursor-pointer"
                >
                  <ArrowRight className="size-4" />
                  <span>العودة لاختيار فصل دراسي آخر</span>
                </Button>
              </div>
            </div>
          ) : (
            /* List of active courses */
            <div className="space-y-3.5">
              {displayedCourses.map((course) => renderCourseItem(course))}
            </div>
          )}
        </div>
      )}

      {/* Roadmap Full-Screen Preview Modal */}
      {previewRoadmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl border border-cyan-500/40 bg-card p-4 sm:p-6 shadow-2xl space-y-4 relative text-start max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewRoadmap(null)}
              className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg bg-muted cursor-pointer"
            >
              <X className="size-5" />
            </button>
            <div>
              <h4 className="text-base sm:text-lg font-black text-foreground">{previewRoadmap.title}</h4>
              {previewRoadmap.description && (
                <p className="text-xs text-muted-foreground">{previewRoadmap.description}</p>
              )}
            </div>
            <div className="rounded-xl overflow-hidden border border-border bg-black max-h-[70vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewRoadmap.imageUrl}
                alt={previewRoadmap.title}
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <a
                href={previewRoadmap.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>فتح الصورة في نافذة جديدة</span>
                <ExternalLink className="size-3.5" />
              </a>
              <Button size="sm" onClick={() => setPreviewRoadmap(null)} className="text-xs font-bold">
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
