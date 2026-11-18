"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  BookOpen,
  ChevronDown,
  Layers,
  FileText,
  Play,
  HelpCircle,
  BookmarkCheck,
  Download,
  ExternalLink,
  Workflow,
  Maximize2,
  X,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Video,
  Cloud,
  Award,
  ArrowRight,
  Check,
  Target,
  AlertCircle,
  Flame,
  CheckSquare,
  Square,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Course, LectureChapter, VideoItem, PdfItem, RoadmapItem, QuizQuestion } from "@/data/coursesData"
import {
  formatDuration,
  getCourseMistakes,
  seedMistakesCache,
  recordQuizMistakes,
  clearResolvedMistake,
  clearAllCourseMistakes,
  logQuizAttempt,
  getCourseQuizHistory,
  seedQuizHistoryCache,
  getCourseProgress,
  seedProgressCache,
  addStudyTime,
  toggleLectureCompletion,
  markQuizPassed,
  calculateMastery,
  type MistakeQuestionItem,
  type CourseProgressRecord,
} from "@/lib/quizTracker"
import {
  fetchCourseProgress,
  addStudyTimeToDb,
  toggleLectureCompletionInDb,
  markQuizPassedInDb,
  fetchCourseMistakesFromDb,
  upsertMistakesToDb,
  removeMistakesFromDb,
  clearAllCourseMistakesInDb,
  logQuizAttemptToDb,
  fetchCourseQuizAttemptsFromDb,
} from "@/lib/actions/analytics"
import { parseCourseTitle } from "@/lib/utils"
import { QuizAssessmentModal, type ActiveQuizSession } from "./QuizAssessmentModal"
import { MistakeBankModal } from "./MistakeBankModal"

interface CourseStudyViewProps {
  course: Course
  isFreeTrial?: boolean
}

function getEmbedUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null
  let url = rawUrl.trim()

  // 1. If someone pasted an iframe tag, extract the src attribute
  const iframeMatch = url.match(/src=["']([^"']+)["']/)
  if (iframeMatch && iframeMatch[1]) {
    url = iframeMatch[1]
  }

  // 2. Extract YouTube Video ID
  // Supports:
  // - youtube.com/watch?v=...
  // - youtube.com/watch?feature=...&v=...
  // - youtu.be/...
  // - youtube.com/embed/...
  // - youtube.com/v/...
  // - youtube.com/live/...
  // - youtube.com/shorts/...
  // - m.youtube.com/watch?v=...
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?(?:.*&)?v=))([a-zA-Z0-9_-]{11})/i
  )

  const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1]
    const listParam = playlistMatch ? `&list=${playlistMatch[1]}` : ""
    // Privacy-enhanced nocookie embed domain for maximum compatibility and minimal bot blocks
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=0${listParam}`
  }

  // Standalone YouTube playlist
  if (playlistMatch && (url.includes("youtube.com") || url.includes("youtu.be"))) {
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistMatch[1]}&rel=0`
  }

  // 3. Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/)
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=0`
  }

  // 4. Google Drive Preview
  const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://drive.google.com/file/d/${gdriveMatch[1]}/preview`
  }

  // 5. If already an embed/preview URL
  if (url.startsWith("https://") && (url.includes("/embed/") || url.includes("/preview"))) {
    return url
  }

  return null
}

function isDirectVideoFile(url?: string): boolean {
  if (!url) return false
  const clean = url.split("?")[0].toLowerCase()
  return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg") || clean.endsWith(".m4v")
}

function isOneDriveUrl(url?: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  return (
    lower.includes("1drv.ms") ||
    lower.includes("onedrive.live.com") ||
    lower.includes("sharepoint.com") ||
    lower.includes("office.com") ||
    lower.includes("microsoft.com")
  )
}

function getLectureVideos(lecture: LectureChapter): VideoItem[] {
  if (Array.isArray(lecture.videos) && lecture.videos.length > 0) {
    return lecture.videos
  }
  if (lecture.videoUrl) {
    return [{ id: `${lecture.id}-v1`, title: "فيديو الشرح الأساسي", url: lecture.videoUrl }]
  }
  return []
}

function getLecturePdfs(lecture: LectureChapter): PdfItem[] {
  if (Array.isArray(lecture.pdfs) && lecture.pdfs.length > 0) {
    return lecture.pdfs
  }
  if (lecture.pdfUrl) {
    return [{ id: `${lecture.id}-p1`, title: lecture.pdfName || "سلايدات المحاضرة (PDF)", url: lecture.pdfUrl }]
  }
  return []
}

function getLectureRoadmaps(lecture: LectureChapter): RoadmapItem[] {
  if (Array.isArray(lecture.roadmaps) && lecture.roadmaps.length > 0) {
    return lecture.roadmaps
  }
  return []
}

function getLectureQuizQuestions(lecture: LectureChapter): QuizQuestion[] {
  if (Array.isArray(lecture.quiz) && lecture.quiz.length > 0) {
    return lecture.quiz
  }
  return []
}

export function CourseStudyView({ course, isFreeTrial = false }: CourseStudyViewProps) {
  // Course state strictly from database
  const [activeCourse, setActiveCourse] = React.useState<Course>(course)

  React.useEffect(() => {
    setActiveCourse(course)
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("fci_admin_courses")
        localStorage.removeItem("fci_admin_courses_v2")
        localStorage.removeItem("fci_admin_courses_v3")
      } catch {
        // ignore
      }
    }
  }, [course])

  const parsed = parseCourseTitle(activeCourse.title)
  const coverImg =
    activeCourse.imageUrl ||
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80"

  const levelText =
    activeCourse.level === 1
      ? "الفرقة الأولى"
      : activeCourse.level === 2
      ? "الفرقة الثانية"
      : activeCourse.level === 3
      ? "الفرقة الثالثة"
      : "الفرقة الرابعة"

  const semText = activeCourse.semester === 1 ? "الترم الأول" : "الترم الثاني"
  const semesterUrl = `/courses?semester=${activeCourse.semester || 1}`

  // Open/close state for lectures (All lectures start collapsed or clean, NO auto-open video)
  const [openLectures, setOpenLectures] = React.useState<Record<string, boolean>>({})

  // Granular sub-section toggle inside each lecture: video, pdf, notes, topics, roadmap, quiz
  const [openSections, setOpenSections] = React.useState<Record<string, Record<string, boolean>>>({})

  const searchParams = useSearchParams()
  const targetLectureParam = searchParams.get("lecture")

  React.useEffect(() => {
    if (targetLectureParam) {
      const match = activeCourse.lectures.find(
        (l) => l.id === targetLectureParam || l.id.toLowerCase() === targetLectureParam.toLowerCase()
      )
      if (match) {
        setOpenLectures((prev) => ({ ...prev, [match.id]: true }))
        setOpenSections((prev) => ({
          ...prev,
          [match.id]: {
            video: true,
            notes: true,
            topics: true,
          },
        }))
        const vids = getLectureVideos(match)
        if (vids.length > 0) {
          setActiveVideoPerLecture((prev) => ({ ...prev, [match.id]: vids[0].url }))
        }
        setTimeout(() => {
          const el = document.getElementById(`lecture-${match.id}`)
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }, 300)
      }
    }
  }, [targetLectureParam, activeCourse.lectures])

  const toggleSection = (
    lectureId: string,
    section: "video" | "pdf" | "notes" | "topics" | "roadmap" | "quiz" | "subchapters"
  ) => {
    setOpenSections((prev) => {
      const current = prev[lectureId] || {}
      // Default is false (closed) for all sections — user must explicitly open
      const currentlyOpen = current[section] !== undefined ? current[section] : false
      return {
        ...prev,
        [lectureId]: {
          ...current,
          [section]: !currentlyOpen,
        },
      }
    })
  }

  const isSectionOpen = (lectureId: string, section: string): boolean => {
    if (openSections[lectureId]?.[section] !== undefined) {
      return openSections[lectureId][section]
    }
    return false
  }

  // Which video is active per lecture
  const [activeVideoPerLecture, setActiveVideoPerLecture] = React.useState<Record<string, string>>({})

  // Roadmap preview modal
  const [previewRoadmap, setPreviewRoadmap] = React.useState<RoadmapItem | null>(null)

  // Per-lecture quiz state
  const [quizAnswers, setQuizAnswers] = React.useState<Record<string, Record<string | number, number>>>({})
  const [quizSubmitted, setQuizSubmitted] = React.useState<Record<string, boolean>>({})

  // Learning Progress & Mistake Bank State – seeded from Supabase on mount
  const [courseProgress, setCourseProgress] = React.useState<CourseProgressRecord>(() =>
    getCourseProgress(activeCourse.id)
  )
  const [mistakesList, setMistakesList] = React.useState<MistakeQuestionItem[]>(() =>
    getCourseMistakes(activeCourse.id)
  )
  const [isMistakeBankOpen, setIsMistakeBankOpen] = React.useState(false)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = React.useState(true)

  // On mount: load analytics from Supabase and seed local caches
  React.useEffect(() => {
    setIsLoadingAnalytics(true)
    Promise.all([
      fetchCourseProgress(activeCourse.id),
      fetchCourseMistakesFromDb(activeCourse.id),
      fetchCourseQuizAttemptsFromDb(activeCourse.id, 50),
    ]).then(([dbProgress, dbMistakes, dbAttempts]) => {
      if (dbProgress) {
        seedProgressCache(dbProgress)
        setCourseProgress(dbProgress)
      }
      if (dbMistakes) {
        seedMistakesCache(activeCourse.id, dbMistakes)
        setMistakesList(dbMistakes)
      }
      if (dbAttempts) {
        seedQuizHistoryCache(dbAttempts)
      }
      setIsLoadingAnalytics(false)
    }).catch(() => setIsLoadingAnalytics(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCourse.id])

  // Active Study Time Heartbeat (increments study time every 30s while tab is visible)
  // Supabase write happens every 60s to avoid too many round-trips
  const dbSyncAccumRef = React.useRef(0)
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        addStudyTime(activeCourse.id, 5)
        setCourseProgress(getCourseProgress(activeCourse.id))
        dbSyncAccumRef.current += 5
        // Sync to DB every 60 seconds (12 ticks × 5s)
        if (dbSyncAccumRef.current >= 60) {
          dbSyncAccumRef.current = 0
          addStudyTimeToDb(activeCourse.id, 60).catch(() => {/* silent */})
        }
      }
    }, 5000)

    return () => clearInterval(timer)
  }, [activeCourse.id])

  // Active Dedicated Standalone Quiz Assessment Modal
  const [activeQuizSession, setActiveQuizSession] = React.useState<ActiveQuizSession | null>(null)

  // Live Stopwatch for Active Quiz Session
  React.useEffect(() => {
    if (!activeQuizSession || activeQuizSession.isGraded) return

    const interval = setInterval(() => {
      setActiveQuizSession((prev) => {
        if (!prev || prev.isGraded) return prev
        const nextSeconds = prev.elapsedSeconds + 1

        // Auto submit if time limit reached in mock exam
        if (prev.timeLimitSeconds && nextSeconds >= prev.timeLimitSeconds) {
          handleGradeQuizSession(prev.lectureId, prev.questions)
          return { ...prev, elapsedSeconds: nextSeconds, isGraded: true }
        }

        return { ...prev, elapsedSeconds: nextSeconds }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeQuizSession?.isGraded, activeQuizSession?.questions])

  const handleStartQuizSession = (
    lecture: { id: string; title: string },
    questions: QuizQuestion[],
    options?: { isMockExam?: boolean; isMistakePractice?: boolean; timeLimitSeconds?: number }
  ) => {
    setActiveQuizSession({
      lectureId: lecture.id,
      lectureTitle: lecture.title,
      questions,
      currentIndex: 0,
      isGraded: false,
      startTime: Date.now(),
      elapsedSeconds: 0,
      isMockExam: options?.isMockExam,
      isMistakePractice: options?.isMistakePractice,
      timeLimitSeconds: options?.timeLimitSeconds,
    })
  }

  const handleReviewQuizSession = (lecture: LectureChapter, questions: QuizQuestion[]) => {
    setActiveQuizSession({
      lectureId: lecture.id,
      lectureTitle: lecture.title,
      questions,
      currentIndex: 0,
      isGraded: true,
      startTime: Date.now(),
      elapsedSeconds: 0,
    })
  }

  const handleGradeQuizSession = (lectureId: string, questions: QuizQuestion[]) => {
    const currentAnswers = quizAnswers[lectureId] || {}
    const total = questions.length
    const correct = questions.filter((q) => currentAnswers[q.id] === q.correctIndex).length
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    const duration = activeQuizSession?.elapsedSeconds || 0
    const lectureTitle = activeQuizSession?.lectureTitle || "كويز المحاضرة"
    const attemptId = `attempt-${Date.now()}`

    // 1. Record quiz attempt locally + sync to Supabase
    const attemptRecord = {
      id: attemptId,
      courseId: activeCourse.id,
      lectureId,
      lectureTitle,
      score: pct,
      totalQuestions: total,
      correctCount: correct,
      durationSeconds: duration,
      timestamp: Date.now(),
      isMockExam: activeQuizSession?.isMockExam,
    }
    logQuizAttempt(attemptRecord)
    logQuizAttemptToDb(attemptRecord).catch(() => {/* silent */})

    // 2. Record mistakes locally + sync new mistakes to Supabase, remove resolved ones
    const { newMistakes, resolvedIds } = recordQuizMistakes(
      activeCourse.id,
      lectureId,
      lectureTitle,
      questions,
      currentAnswers
    )
    setMistakesList(getCourseMistakes(activeCourse.id))

    if (newMistakes.length > 0) {
      upsertMistakesToDb(
        activeCourse.id,
        lectureId,
        lectureTitle,
        newMistakes.map((m) => ({
          questionId: m.questionId,
          questionText: m.questionText,
          options: m.options,
          correctIndex: m.correctIndex,
          userSelectedIndex: m.userSelectedIndex,
          explanation: m.explanation,
        }))
      ).catch(() => {/* silent */})
    }
    if (resolvedIds.length > 0) {
      removeMistakesFromDb(activeCourse.id, resolvedIds).catch(() => {/* silent */})
    }

    // 3. Mark quiz passed if >= 60% + sync to Supabase
    if (pct >= 60) {
      markQuizPassed(activeCourse.id, lectureId)
      setCourseProgress(getCourseProgress(activeCourse.id))
      markQuizPassedInDb(activeCourse.id, lectureId).catch(() => {/* silent */})
    }

    setQuizSubmitted((prev) => ({ ...prev, [lectureId]: true }))
    setActiveQuizSession((prev) => (prev ? { ...prev, isGraded: true } : null))
  }

  // Course-Wide Mock Exam Generator
  const handleStartCourseMockExam = () => {
    const allQuestions: QuizQuestion[] = []
    activeCourse.lectures.forEach((lec) => {
      const qList = getLectureQuizQuestions(lec)
      qList.forEach((q) => {
        allQuestions.push({
          ...q,
          question: `[${lec.title}] ${q.question}`,
        })
      })
    })

    if (allQuestions.length === 0) {
      alert("لا توجد أسئلة كافية في هذا المقرر لإنشاء امتحان مجمع حالياً.")
      return
    }

    // Shuffle and pick up to 25 questions
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 25)

    handleStartQuizSession(
      { id: "mock-exam", title: `الامتحان المجمع الشامل: ${activeCourse.title}` },
      shuffled,
      { isMockExam: true, timeLimitSeconds: Math.min(30 * 60, shuffled.length * 90) }
    )
  }

  // Practice Mistake Questions Only
  const handlePracticeMistakes = () => {
    if (mistakesList.length === 0) return
    const questions: QuizQuestion[] = mistakesList.map((m) => ({
      id: m.questionId,
      question: `[${m.lectureTitle}] ${m.questionText}`,
      options: m.options,
      correctIndex: m.correctIndex,
      explanation: m.explanation,
    }))

    setIsMistakeBankOpen(false)
    handleStartQuizSession(
      { id: "mistake-practice", title: "مراجعة وحل الأسئلة التي أخطأت فيها" },
      questions,
      { isMistakePractice: true }
    )
  }

  const handleToggleLectureComplete = (lectureId: string) => {
    // Optimistic local update
    toggleLectureCompletion(activeCourse.id, lectureId)
    setCourseProgress(getCourseProgress(activeCourse.id))
    // Persist to Supabase
    toggleLectureCompletionInDb(activeCourse.id, lectureId).catch(() => {/* silent */})
  }

  const toggleLecture = (lectureId: string) => {
    setOpenLectures((prev) => ({
      ...prev,
      [lectureId]: !prev[lectureId],
    }))
  }

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
    if (activeQuizSession) {
      handleGradeQuizSession(activeQuizSession.lectureId, activeQuizSession.questions)
    }
  }

  // Summary counts
  const totalLecs = activeCourse.lectures.length
  const totalTopics = activeCourse.lectures.reduce((acc, lec) => acc + (lec.topics?.length || 0), 0)
  const totalVids = activeCourse.lectures.reduce(
    (acc, l) => acc + (l.videos?.length || (l.videoUrl ? 1 : 0)),
    0
  )
  const totalPdfs = activeCourse.lectures.reduce(
    (acc, l) => acc + (l.pdfs?.length || (l.pdfUrl ? 1 : 0)),
    0
  )

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 text-start" dir="rtl">
      {/* 1. Top Bar: Breadcrumb + Colorful Exit to All Courses Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
        <nav className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">
            الرئيسية
          </Link>
          <span>/</span>
          <Link href="/courses" className="hover:text-foreground transition-colors">
            المقررات الدراسية
          </Link>
          <span>/</span>
          <Link href={semesterUrl} className="hover:text-foreground transition-colors font-semibold">
            {semText}
          </Link>
          <span>/</span>
          <span className="text-foreground font-bold truncate max-w-[150px] sm:max-w-none">{parsed.ar}</span>
        </nav>

        {/* Colorful Exit to Semester Courses Button requested by the user */}
        <Link
          href={semesterUrl}
          className="group relative inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black text-white shadow-lg overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-400 shadow-fuchsia-500/25"
        >
          <ArrowRight className="size-4 stroke-[2.5] rtl:rotate-0 rotate-180 group-hover:-translate-x-1 transition-transform" />
          <span>العودة لمواد {semText}</span>
          <span className="size-2 rounded-full bg-white/90 animate-ping ms-1" />
        </Link>
      </div>

      {/* Free Trial Banner */}
      {isFreeTrial && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-black text-emerald-400">
                مقرر متاح للتجربة المجانية
              </h4>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                أنت الآن تتصفح مقرر الإلكترونيات كنسخة تجريبية كاملة. لتفعيل باقي مقررات الفصل الدراسي بـ 30 جنيه فقط.
              </p>
            </div>
          </div>

          <Link
            href={semesterUrl}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-sm"
          >
            <span>استعراض باقي مواد {semText}</span>
          </Link>
        </div>
      )}

      {/* 2. Course Hero Banner */}
      <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl overflow-hidden shadow-lg space-y-4 sm:space-y-6">
        {/* Cover Image Banner */}
        <div className="h-36 sm:h-56 md:h-64 w-full relative overflow-hidden bg-muted">
          <Image
            src={coverImg}
            alt={activeCourse.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1024px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-black/25" />

          {/* Badges on image */}
          <div className="absolute top-3 start-3 end-3 flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-primary text-primary-foreground shadow-sm">
                {activeCourse.code}
              </span>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-card/90 backdrop-blur-md border border-border text-foreground">
                {levelText}
              </span>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-card/90 backdrop-blur-md border border-border text-foreground">
                {semText}
              </span>
            </div>

            <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1">
              <ShieldCheck className="size-3" />
              <span>معتمد</span>
            </span>
          </div>
        </div>

        {/* Course Header Details (Mobile Friendly Typography) */}
        <div className="p-4 sm:p-7 pt-0 space-y-3 sm:space-y-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-foreground tracking-tight leading-snug">
              {parsed.ar}
            </h1>
            {parsed.en && (
              <p dir="ltr" className="text-[11px] sm:text-xs font-mono text-muted-foreground text-start">
                {parsed.en}
              </p>
            )}
          </div>

          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed max-w-3xl line-clamp-3">
            {activeCourse.description}
          </p>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3 border-t border-border/60">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/30 border border-border/50 text-center space-y-0.5">
              <div className="text-sm sm:text-lg font-black text-foreground flex items-center justify-center gap-1">
                <Layers className="size-3.5 sm:size-4 text-primary" />
                <span>{totalLecs}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground">محاضرات</div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/30 border border-border/50 text-center space-y-0.5">
              <div className="text-sm sm:text-lg font-black text-foreground flex items-center justify-center gap-1">
                <FileText className="size-3.5 sm:size-4 text-emerald-500" />
                <span>{totalTopics}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground">موضوعات</div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/30 border border-border/50 text-center space-y-0.5">
              <div className="text-sm sm:text-lg font-black text-foreground flex items-center justify-center gap-1">
                <Video className="size-3.5 sm:size-4 text-sky-500" />
                <span>{totalVids}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground">فيديوهات</div>
            </div>

            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/30 border border-border/50 text-center space-y-0.5">
              <div className="text-sm sm:text-lg font-black text-foreground flex items-center justify-center gap-1">
                <FileText className="size-3.5 sm:size-4 text-amber-500" />
                <span>{totalPdfs}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground">سلايدات PDF</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5. Real-Time Student Learning Analytics & Mastery Dashboard */}
      {(() => {
        const completedCount = courseProgress.completedLectureIds.length
        const totalCount = Math.max(1, totalLecs)
        const progressPct = Math.round((completedCount / totalCount) * 100)
        const historyScores = getCourseQuizHistory(activeCourse.id).map((a) => a.score)
        const mastery = calculateMastery(courseProgress, totalLecs, historyScores)

        return (
          <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-4 sm:p-6 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="space-y-1 text-start">
                <div className="flex items-center gap-2">
                  <Flame className="size-5 text-amber-500 animate-pulse" />
                  <h3 className="text-sm sm:text-base font-black text-foreground">
                    مؤشرات التعلم ومستوى الإتقان
                  </h3>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${mastery.colorClass}`}>
                    {mastery.tierBadge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{mastery.description}</p>
              </div>

              {/* Action Buttons: Mock Exam & Mistake Bank */}
              <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
                <Button
                  size="sm"
                  onClick={handleStartCourseMockExam}
                  className="h-9 px-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-primary to-indigo-600 text-white shadow-sm hover:brightness-110 gap-1.5 cursor-pointer"
                >
                  <Target className="size-3.5" />
                  <span>امتحان مجمع على المادة</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsMistakeBankOpen(true)}
                  className={`h-9 px-3 rounded-xl font-bold text-xs gap-1.5 cursor-pointer border ${
                    mistakesList.length > 0
                      ? "border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <AlertCircle className="size-3.5" />
                  <span>بنك مراجعة أخطائي</span>
                  {mistakesList.length > 0 && (
                    <span className="size-4.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black flex items-center justify-center">
                      {mistakesList.length}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Metric 1: Completion Progress */}
              <div className="p-3.5 rounded-2xl border border-border/60 bg-muted/20 space-y-2 text-start">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-bold flex items-center gap-1.5">
                    <CheckSquare className="size-3.5 text-emerald-500" />
                    <span>نسبة إنجاز المنهج:</span>
                  </span>
                  <strong className="font-mono text-foreground font-black">{progressPct}%</strong>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {completedCount} من {totalLecs} محاضرات مكتملة
                </div>
              </div>

              {/* Metric 2: Active Study Time */}
              <div className="p-3.5 rounded-2xl border border-border/60 bg-muted/20 space-y-1 text-start">
                <span className="text-muted-foreground font-bold text-xs flex items-center gap-1.5">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                  </span>
                  <span>وقت المذاكرة الفعلي:</span>
                </span>
                <div className="text-base sm:text-lg font-mono font-black text-foreground pt-1">
                  {formatDuration(courseProgress.totalStudySeconds || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground">يتم احتساب الوقت أثناء وجودك داخل المادة</p>
              </div>

              {/* Metric 3: Mastery Score */}
              <div className="p-3.5 rounded-2xl border border-border/60 bg-muted/20 space-y-1 text-start">
                <span className="text-muted-foreground font-bold text-xs flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-primary" />
                  <span>مستوى الاستيعاب الأكاديمي:</span>
                </span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-xl sm:text-2xl font-mono font-black text-primary">
                    {mastery.percentage}%
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{mastery.tierName}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">محسوب بناءً على الكويزات والانتظام</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 3. Lectures List (Clean, Structured, NOT Dumped Open) */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-base sm:text-xl font-black text-foreground flex items-center gap-2">
            <BookOpen className="size-4.5 sm:size-5 text-primary" />
            <span>محاضرات المنهج ({totalLecs})</span>
          </h2>
          <span className="text-[10px] sm:text-xs text-muted-foreground">اختر المحاضرة لفتح محتواها</span>
        </div>

        {activeCourse.lectures.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-card/60 space-y-2">
            <Layers className="size-8 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-xs sm:text-sm text-foreground">المحاضرات قيد الرفع والاعتماد</h3>
            <p className="text-[11px] text-muted-foreground">سيتم إضافة المحاضرات والملفات قريباً.</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-3.5">
            {activeCourse.lectures.map((lecture, lecIdx) => {
              const isOpen = !!openLectures[lecture.id]
              const videos = getLectureVideos(lecture)
              const pdfs = getLecturePdfs(lecture)
              const roadmaps = getLectureRoadmaps(lecture)
              const quizQuestions = getLectureQuizQuestions(lecture)

              const activeVidUrl = activeVideoPerLecture[lecture.id]
              const activeVidObj = videos.find((v) => v.url === activeVidUrl)
              const embedUrl = activeVidUrl ? getEmbedUrl(activeVidUrl) : null
              const isDirectVideo = activeVidUrl ? isDirectVideoFile(activeVidUrl) : false

              const cleanTitle = lecture.title.replace(/^(ال)?محاضرة\s*\d+[\s:ـ-]*/i, "").trim()

              // Doctor notes in topics
              const doctorNotes = lecture.topics
                ?.filter((t) => t.doctorNote && t.doctorNote.trim().length > 0)
                .map((t) => ({ title: t.title, note: t.doctorNote as string }))

              // Quiz state
              const answersForLec = quizAnswers[lecture.id] || {}
              const isSubmitted = !!quizSubmitted[lecture.id]
              const correctCount = isSubmitted
                ? quizQuestions.filter((q) => answersForLec[q.id] === q.correctIndex).length
                : 0

              return (
                <div
                  key={lecture.id || lecIdx}
                  id={`lecture-${lecture.id}`}
                  className="rounded-2xl border border-slate-800/80 bg-[#070d18] shadow-lg overflow-hidden transition-all duration-200"
                >
                  {/* Lecture Header Row - Vivid Blue / Azure Banner matching user layout */}
                  <div
                    onClick={() => toggleLecture(lecture.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white rounded-2xl select-none transition-all shadow-md hover:shadow-lg hover:brightness-105"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1 text-start">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center size-6 rounded-md bg-white/20 text-white text-[11px] font-black shrink-0">
                          {lecture.number || lecIdx + 1}
                        </span>
                        <h3 className="text-sm sm:text-base md:text-lg font-black text-white leading-snug truncate">
                          محاضرة {lecture.number || lecIdx + 1}: {cleanTitle || lecture.title}
                        </h3>
                      </div>

                      {lecture.summary ? (
                        <p className="text-xs sm:text-sm text-sky-100 font-medium line-clamp-1">
                          {lecture.summary}
                        </p>
                      ) : lecture.topics && lecture.topics.length > 0 ? (
                        <p className="text-xs sm:text-sm text-sky-100 font-medium line-clamp-1">
                          {lecture.topics.map((t) => t.title).join(" ، ")}
                        </p>
                      ) : null}

                      <div className="pt-0.5">
                        <span className="inline-block text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-xs">
                          ...عرض باقي التفاصيل
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {/* Checkmark Completion Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleLectureComplete(lecture.id)
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          courseProgress.completedLectureIds.includes(lecture.id)
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "bg-white/15 text-white/90 hover:bg-white/25"
                        }`}
                        title={
                          courseProgress.completedLectureIds.includes(lecture.id)
                            ? "محاضرة مكتملة"
                            : "تحديد المحاضرة كمكتملة"
                        }
                      >
                        {courseProgress.completedLectureIds.includes(lecture.id) ? (
                          <>
                            <Check className="size-3.5 stroke-[3]" />
                            <span className="hidden sm:inline">مكتملة</span>
                          </>
                        ) : (
                          <>
                            <Square className="size-3.5" />
                            <span className="hidden sm:inline">إتمام</span>
                          </>
                        )}
                      </button>

                      <div
                        className={`size-9 sm:size-10 rounded-full bg-white/25 text-white flex items-center justify-center transition-transform duration-200 ${
                          isOpen ? "rotate-180 bg-white/35" : ""
                        }`}
                      >
                        <ChevronDown className="size-5 stroke-[2.5]" />
                      </div>
                    </div>
                  </div>

                  {/* Lecture Content (Sub-sections: NOT open all together!) */}
                  {isOpen && (
                    <div className="p-3 sm:p-4 space-y-3 bg-[#060b14]/95 border-t border-slate-800/80 animate-in slide-in-from-top-1 duration-150">
                      {/* Sub-item 0: شباتر ووحدات المحاضرة الفرعية */}
                      {lecture.subChapters && lecture.subChapters.length > 0 && (
                        <div className="space-y-2">
                          <div
                            onClick={() => toggleSection(lecture.id, "subchapters")}
                            className="bg-[#0b1428] hover:bg-[#101b38] border border-sky-500/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Layers className="size-4 text-sky-400 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-sky-400 truncate">
                                شباتر وأقسام المحاضرة ({lecture.subChapters.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 shrink-0">
                              <span>{isSectionOpen(lecture.id, "subchapters") ? "إخفاء" : "عرض"}</span>
                              <ChevronDown
                                className={`size-4 transition-transform duration-200 ${
                                  isSectionOpen(lecture.id, "subchapters") ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "subchapters") && (
                            <div className="space-y-3 pt-1 animate-in fade-in-50 duration-150">
                              {lecture.subChapters.map((sub, sIdx) => {
                                return (
                                  <div
                                    key={sub.id || sIdx}
                                    className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card/70 space-y-2.5 text-start"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="size-5 rounded-md bg-sky-500/20 text-sky-400 text-[10px] font-black flex items-center justify-center shrink-0">
                                            {sub.order || sIdx + 1}
                                          </span>
                                          <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                            {sub.title}
                                          </h4>
                                        </div>
                                        {sub.summary && (
                                          <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                                            {sub.summary}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Sub-Chapter Media Actions */}
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                      {sub.videoUrl && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveVideoPerLecture((prev) => ({
                                              ...prev,
                                              [lecture.id]: sub.videoUrl!,
                                            }))
                                            if (!isSectionOpen(lecture.id, "video")) {
                                              toggleSection(lecture.id, "video")
                                            }
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                                        >
                                          <Play className="size-3" />
                                          <span>فيديو الشرح</span>
                                        </button>
                                      )}

                                      {sub.pdfUrl && (
                                        <a
                                          href={sub.pdfUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all"
                                        >
                                          <FileText className="size-3" />
                                          <span>{sub.pdfName || "سلايدات الشابتر (PDF)"}</span>
                                          <ExternalLink className="size-2.5" />
                                        </a>
                                      )}

                                      {sub.quiz && sub.quiz.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleStartQuizSession(
                                              { id: sub.id, title: `${lecture.title} - ${sub.title}` },
                                              sub.quiz!
                                            )
                                          }
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-bold transition-all cursor-pointer"
                                        >
                                          <HelpCircle className="size-3" />
                                          <span>كويز الشابتر ({sub.quiz.length} أسئلة)</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Sub-item 1: الشرح والفيديوهات (NO AUTOPLAY & NO FRAME BEFORE SELECTION!) */}
                      {videos.length > 0 && (
                        <div className="space-y-2">
                          {/* Section Header Bar */}
                          <div
                            onClick={() => toggleSection(lecture.id, "video")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Video className="size-4 text-emerald-400 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-emerald-400 truncate">
                                الشرح
                              </span>
                              <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                {videos.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 shrink-0">
                              <span>{isSectionOpen(lecture.id, "video") ? "إخفاء" : "عرض"}</span>
                              <ChevronDown
                                className={`size-4 transition-transform duration-200 ${
                                  isSectionOpen(lecture.id, "video") ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {/* Section Content */}
                          {isSectionOpen(lecture.id, "video") && (
                            <div className="space-y-3 pt-1 animate-in fade-in-50 duration-150">
                              {/* CONDITIONAL VIDEO PLAYER: ONLY SHOWN IF A VIDEO HAS BEEN CLICKED! */}
                              {activeVidUrl && (
                                <div className="rounded-2xl border border-sky-500/40 bg-black overflow-hidden shadow-2xl">
                                  <div className="bg-[#0b1426] px-4 py-2.5 border-b border-sky-500/30 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="size-2 rounded-full bg-sky-400 animate-ping" />
                                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                                        {activeVidObj?.title || "مشغل الفيديو"}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveVideoPerLecture((prev) => ({ ...prev, [lecture.id]: "" }))
                                      }
                                      className="text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-rose-500/80 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>إغلاق المشغل</span>
                                      <X className="size-3.5" />
                                    </button>
                                  </div>
                                  <div className="relative aspect-video w-full bg-black">
                                    {embedUrl ? (
                                      <iframe
                                        key={activeVidUrl}
                                        src={embedUrl}
                                        title={activeVidObj?.title || lecture.title}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                        loading="lazy"
                                      />
                                    ) : isDirectVideo ? (
                                      <video
                                        key={activeVidUrl}
                                        src={activeVidUrl}
                                        controls
                                        className="w-full h-full bg-black"
                                        controlsList="nodownload"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
                                        <Video className="size-10 text-sky-400" />
                                        <div className="space-y-1 max-w-sm">
                                          <h5 className="text-xs sm:text-sm font-bold">{activeVidObj?.title || lecture.title}</h5>
                                          <p className="text-[11px] text-slate-400">
                                            لم نتمكن من تضمين مشغل الفيديو مباشرة داخل الصفحة.
                                          </p>
                                        </div>
                                        <a
                                          href={activeVidUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md"
                                        >
                                          <span>مشاهدة الفيديو على الرابط المباشر</span>
                                          <ExternalLink className="size-3.5" />
                                        </a>
                                      </div>
                                    )}
                                  </div>

                                  {/* In-App Consumable Lesson Content / Fallback Viewer */}
                                  <div className="p-3.5 sm:p-4 bg-[#081224] border-t border-sky-500/25 space-y-2 text-start">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                                        <FileText className="size-3.5" />
                                        <span>شرح وتلخيص المحاضرة (محتوى الدرس التفاعلي)</span>
                                      </div>
                                      {activeVidUrl && (
                                        <a
                                          href={activeVidUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[11px] font-bold text-sky-300 hover:text-white bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                          <span>مشاهدة على YouTube</span>
                                          <ExternalLink className="size-3" />
                                        </a>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                      {lecture.summary || "محتوى وشرح هذه المحاضرة متاح بالكامل ومطابق لمقرر كلية الحاسبات والمعلومات."}
                                    </p>
                                    {lecture.topics && lecture.topics.length > 0 && (
                                      <div className="pt-1 flex flex-wrap gap-1.5">
                                        {lecture.topics.map((t, idx) => (
                                          <span
                                            key={idx}
                                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700/60"
                                          >
                                            • {t.title}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Vertical Video List Matching User Screenshot */}
                              <div className="space-y-2">
                                {videos.map((v, vIdx) => {
                                  const isActive = activeVidUrl === v.url
                                  return (
                                    <div
                                      key={v.id || vIdx}
                                      onClick={() =>
                                        setActiveVideoPerLecture((prev) => ({ ...prev, [lecture.id]: v.url }))
                                      }
                                      className={`group px-4 py-3 sm:py-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                        isActive
                                          ? "bg-[#0d1d3a] border-sky-500 ring-1 ring-sky-500/40 shadow-md"
                                          : "bg-[#091122] hover:bg-[#0e1c36] border-slate-800/90 hover:border-sky-500/50"
                                      }`}
                                    >
                                      {/* Title on the right (RTL) */}
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1 text-start">
                                        <h6
                                          className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                                            isActive ? "text-sky-300 font-bold" : "text-slate-100 group-hover:text-sky-200"
                                          }`}
                                        >
                                          {v.title || `فيديو ${vIdx + 1}`}
                                        </h6>
                                      </div>

                                      {/* Circular Play Button on the left */}
                                      <div className="shrink-0 flex items-center gap-2">
                                        <div
                                          className={`size-8 rounded-full flex items-center justify-center transition-all ${
                                            isActive
                                              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/50 scale-105"
                                              : "bg-sky-500/20 text-sky-400 group-hover:bg-sky-500 group-hover:text-white"
                                          }`}
                                        >
                                          <Play className="size-3.5 fill-current ms-0.5" />
                                        </div>
                                        {v.url && (
                                          <a
                                            href={v.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="size-7 rounded-lg bg-slate-800/60 hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 flex items-center justify-center transition-colors"
                                            title="مشاهدة على YouTube في نافذة جديدة"
                                          >
                                            <ExternalLink className="size-3" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-item 2: التطبيق التفاعلي (Interactive Quiz) */}
                      {quizQuestions.length > 0 && (
                        <div className="space-y-2">
                          {/* Section Header Bar */}
                          <div
                            onClick={() => toggleSection(lecture.id, "quiz")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <HelpCircle className="size-4 text-emerald-400 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-emerald-400 truncate">
                                الاختبار التفاعلي والمفاهيم
                              </span>
                              <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                {quizQuestions.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 shrink-0">
                              {isSubmitted && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                                  {correctCount}/{quizQuestions.length} ({Math.round((correctCount / quizQuestions.length) * 100)}%)
                                </span>
                              )}
                              <div className="flex items-center gap-1">
                                <span>{isSectionOpen(lecture.id, "quiz") ? "إخفاء" : "عرض"}</span>
                                <ChevronDown
                                  className={`size-4 transition-transform duration-200 ${
                                    isSectionOpen(lecture.id, "quiz") ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Section Content - Clean Interactive Launcher Card */}
                          {isSectionOpen(lecture.id, "quiz") && (
                            <div className="p-3.5 sm:p-6 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-[#061814] to-[#040e0c] space-y-4 animate-in fade-in-50 duration-150">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1 text-start">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider font-mono">
                                      Interactive Assessment
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {quizQuestions.length} Questions
                                    </span>
                                  </div>
                                  <h4 className="text-sm sm:text-base font-bold text-foreground">
                                    اختبار تقييمي شامل لمحتوى المحاضرة
                                  </h4>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    تجربة تفاعلية مخصصة بأسئلة أكاديمية باللغة الإنجليزية ورصد فوري للدرجة مع تفسير علمي لكل سؤال.
                                  </p>
                                </div>

                                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  {isSubmitted ? (
                                    <>
                                      <Button
                                        onClick={() => handleReviewQuizSession(lecture, quizQuestions)}
                                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl gap-1.5 cursor-pointer shadow-md"
                                      >
                                        <Award className="size-4 shrink-0" />
                                        <span>عرض النتيجة ومراجعة الحل</span>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          handleResetQuiz(lecture.id)
                                          handleStartQuizSession(lecture, quizQuestions)
                                        }}
                                        className="w-full sm:w-auto text-xs font-bold h-10 px-3 rounded-xl border-slate-700 hover:bg-slate-800 text-slate-200 cursor-pointer gap-1.5"
                                      >
                                        <RotateCcw className="size-3.5 shrink-0" />
                                        <span>إعادة الاختبار</span>
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      onClick={() => handleStartQuizSession(lecture, quizQuestions)}
                                      className="w-full sm:w-auto btn-primary-glow font-bold text-xs sm:text-sm h-11 px-6 rounded-xl cursor-pointer shadow-xl shadow-primary/20"
                                    >
                                      <span>بدء الاختبار الآن</span>
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {isSubmitted && (
                                <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300/90 font-medium">
                                  <span>النتيجة المسجلة: <strong className="text-emerald-200 font-bold">{correctCount} من {quizQuestions.length}</strong> إجابات صحيحة</span>
                                  <span className="font-mono font-bold text-emerald-400">{Math.round((correctCount / quizQuestions.length) * 100)}%</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-item 3: ما ورد في امتحانات سابقة ونقاط التركيز */}
                      {doctorNotes && doctorNotes.length > 0 && (
                        <div className="space-y-2">
                          {/* Section Header Bar */}
                          {/* Section Header Bar */}
                          <div
                            onClick={() => toggleSection(lecture.id, "notes")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <BookOpen className="size-4 text-emerald-400 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-emerald-400 truncate">
                                ما ورد في امتحانات سابقة ونقاط التركيز
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 shrink-0">
                              <span>{isSectionOpen(lecture.id, "notes") ? "إخفاء" : "عرض"}</span>
                              <ChevronDown
                                className={`size-4 transition-transform duration-200 ${
                                  isSectionOpen(lecture.id, "notes") ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "notes") && (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 space-y-2.5 text-start animate-in fade-in-50 duration-150">
                              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                                <BookmarkCheck className="size-3.5 shrink-0" />
                                <span>توجيهات ونقاط تركيز الدكتور في الامتحانات السابقة:</span>
                              </div>
                              <div className="space-y-2 ps-2 sm:ps-4">
                                {doctorNotes.map((dn, dnIdx) => (
                                  <div
                                    key={dnIdx}
                                    className="text-xs text-slate-200 font-medium leading-relaxed bg-black/30 p-2.5 rounded-lg border border-amber-500/20"
                                  >
                                    <strong className="text-amber-400 block sm:inline">• {dn.title}: </strong>
                                    <span>{dn.note}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-item 4: سلايدات ومذكرات الـ PDF */}
                      {pdfs.length > 0 && (
                        <div className="space-y-2">
                          {/* Section Header Bar */}
                          <div
                            onClick={() => toggleSection(lecture.id, "pdf")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <FileText className="size-4 text-emerald-400 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-emerald-400 truncate">
                                سلايدات ومذكرات الـ PDF
                              </span>
                              <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                {pdfs.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 shrink-0">
                              <span>{isSectionOpen(lecture.id, "pdf") ? "إخفاء" : "عرض"}</span>
                              <ChevronDown
                                className={`size-4 transition-transform duration-200 ${
                                  isSectionOpen(lecture.id, "pdf") ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "pdf") && (
                            <div className="p-3 sm:p-4 rounded-xl border border-slate-800/80 bg-[#091122] space-y-2.5 animate-in fade-in-50 duration-150">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {pdfs.map((pdf, pIdx) => {
                                  const isOneDrive = isOneDriveUrl(pdf.url)
                                  return (
                                    <div
                                      key={pdf.id || pIdx}
                                      className="p-3 rounded-xl border border-slate-800 bg-[#0d162a] hover:border-amber-500/50 transition-all flex flex-col justify-between gap-2 shadow-xs"
                                    >
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <div className="size-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                          {isOneDrive ? (
                                            <Cloud className="size-4 text-sky-400" />
                                          ) : (
                                            <FileText className="size-4" />
                                          )}
                                        </div>
                                        <div className="space-y-0.5 min-w-0 flex-1 text-start">
                                          <div className="text-xs font-bold text-slate-100 truncate">
                                            {pdf.title}
                                          </div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {isOneDrive ? (
                                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                                Microsoft OneDrive
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-slate-400 font-mono">
                                                {pdf.size || "ملف PDF"}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                                        <a
                                          href={pdf.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-bold h-8 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-white transition-colors text-slate-200"
                                        >
                                          <span>{isOneDrive ? "فتح في OneDrive" : "فتح في نافذة جديدة"}</span>
                                          <ExternalLink className="size-3" />
                                        </a>

                                        <a
                                          href={pdf.url}
                                          download
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="size-8 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                                          title="تنزيل الملف المباشر"
                                        >
                                          <Download className="size-3.5" />
                                        </a>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-item 5: الخرائط الذهنية والمخططات */}
                      {roadmaps.length > 0 && (
                        <div className="space-y-2">
                          {/* Section Header Bar */}
                          <div
                            onClick={() => toggleSection(lecture.id, "roadmap")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Workflow className="size-4 text-emerald-400 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-emerald-400 truncate">
                                الخرائط الذهنية والمخططات
                              </span>
                              <span className="text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                {roadmaps.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 shrink-0">
                              <span>{isSectionOpen(lecture.id, "roadmap") ? "إخفاء" : "عرض"}</span>
                              <ChevronDown
                                className={`size-4 transition-transform duration-200 ${
                                  isSectionOpen(lecture.id, "roadmap") ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "roadmap") && (
                            <div className="p-3 sm:p-4 rounded-xl border border-slate-800/80 bg-[#091122] space-y-3 animate-in fade-in-50 duration-150">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {roadmaps.map((map) => {
                                  const isOneDriveImg = isOneDriveUrl(map.imageUrl)
                                  return (
                                    <div
                                      key={map.id}
                                      className="rounded-xl border border-slate-800 bg-[#0d162a] overflow-hidden hover:border-cyan-500/60 transition-all group"
                                    >
                                      {isOneDriveImg ? (
                                        <div className="p-4 sm:p-5 text-center space-y-3 bg-[#0d162a]">
                                          <div className="size-11 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/20">
                                            <Cloud className="size-6 text-sky-400" />
                                          </div>
                                          <div className="space-y-0.5">
                                            <h6 className="text-xs sm:text-sm font-bold text-slate-100 truncate">{map.title}</h6>
                                            <p className="text-[10px] text-muted-foreground">خريطة ومخطط ذهني مستضاف على OneDrive</p>
                                          </div>
                                          <a
                                            href={map.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold h-9 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500 hover:text-white text-sky-300 transition-colors border border-sky-500/30"
                                          >
                                            <span>فتح الصورة في OneDrive</span>
                                            <ExternalLink className="size-3.5" />
                                          </a>
                                        </div>
                                      ) : (
                                        <div
                                          onClick={() => setPreviewRoadmap(map)}
                                          className="relative aspect-video w-full bg-slate-900 cursor-pointer overflow-hidden"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={map.imageUrl}
                                            alt={map.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          />
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-bold text-xs">
                                            <Maximize2 className="size-4" />
                                            <span>عرض الخريطة بالحجم الكامل</span>
                                          </div>
                                        </div>
                                      )}
                                      {!isOneDriveImg && (
                                        <div className="p-2.5">
                                          <h5 className="text-xs font-bold text-slate-200 truncate">{map.title}</h5>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-item 6: محاور وموضوعات المحاضرة */}
                      {lecture.topics && lecture.topics.length > 0 && (
                        <div className="space-y-2">
                          <div
                            onClick={() => toggleSection(lecture.id, "topics")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-4 py-3 sm:py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Layers className="size-4 text-emerald-400" />
                              <span className="text-sm sm:text-base font-bold text-emerald-400">
                                محاور وموضوعات المحاضرة ({lecture.topics.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400">
                              <span>{isSectionOpen(lecture.id, "topics") ? "إخفاء" : "عرض"}</span>
                              <ChevronDown
                                className={`size-4 transition-transform duration-200 ${
                                  isSectionOpen(lecture.id, "topics") ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </div>

                          {isSectionOpen(lecture.id, "topics") && (
                            <div className="p-3 sm:p-4 rounded-xl border border-slate-800/80 bg-[#091122] space-y-2 animate-in fade-in-50 duration-150">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {lecture.topics.map((t, tIdx) => (
                                  <div
                                    key={t.id || tIdx}
                                    className="p-2.5 rounded-lg border border-slate-800 bg-[#0d162a] flex items-center gap-2 text-xs text-slate-200 text-start"
                                  >
                                    <span className="size-5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black flex items-center justify-center shrink-0">
                                      {tIdx + 1}
                                    </span>
                                    <span className="font-medium truncate">{t.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom Exit Banner: Prominent colorful button to exit to semester courses */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start shadow-md">
        <div className="space-y-1">
          <h4 className="text-base sm:text-lg font-black text-foreground">
            هل ترغب في دراسة مقرر دراسي آخر؟
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground">
            يمكنك العودة إلى قائمة مواد {semText} أو تصفح كافة الفصول والمقررات.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
          <Link
            href={semesterUrl}
            className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs sm:text-sm font-black text-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-400 shrink-0"
          >
            <ArrowRight className="size-4.5 stroke-[2.5] rtl:rotate-0 rotate-180 group-hover:-translate-x-1.5 transition-transform" />
            <span>العودة لمواد {semText}</span>
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
          >
            <span>اختيار فصل دراسي آخر</span>
          </Link>
        </div>
      </div>

      {/* 4. Roadmap Modal */}
      {previewRoadmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-2xl border border-cyan-500/40 bg-card p-4 sm:p-6 shadow-2xl space-y-4 relative text-start max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewRoadmap(null)}
              className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg bg-muted cursor-pointer"
            >
              <X className="size-5" />
            </button>
            <div>
              <h4 className="text-sm sm:text-base md:text-lg font-black text-foreground">{previewRoadmap.title}</h4>
              {previewRoadmap.description && (
                <p className="text-[11px] sm:text-xs text-muted-foreground">{previewRoadmap.description}</p>
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

      {/* 5. Standalone Dedicated Fullscreen Quiz Assessment Modal */}
      <QuizAssessmentModal
        courseCode={course.code}
        session={activeQuizSession}
        quizAnswers={quizAnswers}
        onClose={() => setActiveQuizSession(null)}
        onSelectAnswer={handleSelectQuizAnswer}
        onSubmitQuiz={handleSubmitQuiz}
        onResetQuiz={handleResetQuiz}
        onSetSession={setActiveQuizSession}
      />
      {/* 6. Mistake Bank Modal (بنك الأسئلة ومراجعة الأخطاء) */}
      <MistakeBankModal
        isOpen={isMistakeBankOpen}
        onClose={() => setIsMistakeBankOpen(false)}
        mistakesList={mistakesList}
        onClearAll={() => {
          clearAllCourseMistakes(activeCourse.id)
          setMistakesList([])
          clearAllCourseMistakesInDb(activeCourse.id).catch(() => {/* silent */})
        }}
        onResolveMistake={(questionId) => {
          clearResolvedMistake(activeCourse.id, questionId)
          setMistakesList(getCourseMistakes(activeCourse.id))
          removeMistakesFromDb(activeCourse.id, [questionId]).catch(() => {/* silent */})
        }}
        onPracticeMistakes={handlePracticeMistakes}
      />
    </div>
  )
}
