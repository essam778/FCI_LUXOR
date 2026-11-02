"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  BookOpen,
  ChevronDown,
  Layers,
  FileText,
  Play,
  HelpCircle,
  Sparkles,
  Download,
  ExternalLink,
  Workflow,
  Maximize2,
  X,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Video,
  Cloud,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Course, LectureChapter, VideoItem, PdfItem, RoadmapItem, QuizQuestion } from "@/data/coursesData"

interface CourseStudyViewProps {
  course: Course
}

function parseCourseTitle(title: string): { ar: string; en: string } {
  const match = title.match(/^(.*?)\s*\((.*?)\)$/)
  if (match) {
    return { ar: match[1].trim(), en: match[2].trim() }
  }
  return { ar: title, en: "" }
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
    // Standard embed domain with rel=0 for maximum compatibility with regional viewers
    return `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=0${listParam}`
  }

  // Standalone YouTube playlist
  if (playlistMatch && (url.includes("youtube.com") || url.includes("youtu.be"))) {
    return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}&rel=0`
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

export function CourseStudyView({ course }: CourseStudyViewProps) {
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

  // Open/close state for lectures (All lectures start collapsed or clean, NO auto-open video)
  const [openLectures, setOpenLectures] = React.useState<Record<string, boolean>>({})

  // Granular sub-section toggle inside each lecture: video, pdf, notes, topics, roadmap, quiz
  const [openSections, setOpenSections] = React.useState<Record<string, Record<string, boolean>>>({})

  const toggleSection = (lectureId: string, section: "video" | "pdf" | "notes" | "topics" | "roadmap" | "quiz") => {
    setOpenSections((prev) => {
      const current = prev[lectureId] || {}
      const currentlyOpen = current[section] !== undefined ? current[section] : (section === "video")
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
    return section === "video"
  }

  // Which video is active per lecture
  const [activeVideoPerLecture, setActiveVideoPerLecture] = React.useState<Record<string, string>>({})

  // Roadmap preview modal
  const [previewRoadmap, setPreviewRoadmap] = React.useState<RoadmapItem | null>(null)

  // Per-lecture quiz state
  const [quizAnswers, setQuizAnswers] = React.useState<Record<string, Record<string | number, number>>>({})
  const [quizSubmitted, setQuizSubmitted] = React.useState<Record<string, boolean>>({})

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
      {/* 1. Breadcrumb Navigation (Compact for Mobile) */}
      <nav className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
        <Link href="/" className="hover:text-foreground transition-colors">
          الرئيسية
        </Link>
        <span>/</span>
        <Link href="/courses" className="hover:text-foreground transition-colors">
          المقررات الدراسية
        </Link>
        <span>/</span>
        <span className="text-muted-foreground">{semText}</span>
        <span>/</span>
        <span className="text-foreground font-bold truncate max-w-[150px] sm:max-w-none">{parsed.ar}</span>
      </nav>

      {/* 2. Course Hero Banner */}
      <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl overflow-hidden shadow-lg space-y-4 sm:space-y-6">
        {/* Cover Image Banner */}
        <div className="h-36 sm:h-56 md:h-64 w-full relative overflow-hidden bg-muted">
          <Image
            src={coverImg}
            alt={activeCourse.title}
            fill
            unoptimized
            className="object-cover"
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

                    <div className="shrink-0 flex items-center">
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
                      {/* Sub-item 1: الشرح والفيديوهات (NO AUTOPLAY & NO FRAME BEFORE SELECTION!) */}
                      {videos.length > 0 && (
                        <div className="space-y-2">
                          {/* Section Header Bar matching User Screenshot */}
                          <div
                            onClick={() => toggleSection(lecture.id, "video")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-4 py-3 sm:py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Video className="size-4 text-emerald-400" />
                              <span className="text-sm sm:text-base font-bold text-emerald-400">
                                الشرح ({videos.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400">
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
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-4 py-3 sm:py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <HelpCircle className="size-4 text-emerald-400" />
                              <span className="text-sm sm:text-base font-bold text-emerald-400">
                                التطبيق التفاعلي ({quizQuestions.length} أسئلة)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-400">
                              {isSubmitted && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                                  {correctCount} / {quizQuestions.length}
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

                          {/* Section Content */}
                          {isSectionOpen(lecture.id, "quiz") && (
                            <div className="p-3.5 sm:p-5 rounded-xl border border-slate-800/80 bg-[#091122] space-y-4 animate-in fade-in-50 duration-150">
                              <div className="space-y-3.5">
                                {quizQuestions.map((q, qIdx) => {
                                  const chosen = answersForLec[q.id]
                                  return (
                                    <div
                                      key={q.id || qIdx}
                                      className="p-3 sm:p-4 rounded-xl border border-slate-800 bg-[#0c1424] space-y-2 text-xs text-start"
                                    >
                                      <div className="font-bold text-slate-100 text-xs sm:text-sm leading-snug whitespace-pre-wrap">
                                        {qIdx + 1}. {q.question}
                                      </div>

                                      <div className="space-y-1.5 pt-1">
                                        {q.options.map((opt, optIdx) => {
                                          const isSelected = chosen === optIdx
                                          const isCorrect = q.correctIndex === optIdx

                                          let optStyle =
                                            "border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-800/60"
                                          if (isSelected && !isSubmitted) {
                                            optStyle = "border-sky-500 bg-sky-500/15 text-sky-300 font-bold"
                                          } else if (isSubmitted) {
                                            if (isCorrect) {
                                              optStyle =
                                                "border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold"
                                            } else if (isSelected && !isCorrect) {
                                              optStyle =
                                                "border-rose-500 bg-rose-500/15 text-rose-400"
                                            }
                                          }

                                          return (
                                            <div
                                              key={optIdx}
                                              onClick={() => {
                                                if (!isSubmitted) {
                                                  handleSelectQuizAnswer(lecture.id, q.id, optIdx)
                                                }
                                              }}
                                              className={`p-2.5 sm:p-3 rounded-lg border text-xs sm:text-sm flex items-center justify-between gap-2 transition-all ${
                                                isSubmitted ? "cursor-default" : "cursor-pointer"
                                              } ${optStyle}`}
                                            >
                                              <span className="leading-relaxed whitespace-pre-wrap">{opt}</span>
                                              {isSubmitted && isCorrect && (
                                                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                                              )}
                                              {isSubmitted && isSelected && !isCorrect && (
                                                <XCircle className="size-4 text-rose-400 shrink-0" />
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>

                                      {isSubmitted && q.explanation && (
                                        <p className="text-[11px] sm:text-xs text-slate-400 pt-2 border-t border-slate-800 leading-relaxed whitespace-pre-wrap">
                                          💡 <strong className="text-slate-200">التفسير الأكاديمي:</strong> {q.explanation}
                                        </p>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="pt-2 flex items-center justify-end gap-2">
                                {isSubmitted ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResetQuiz(lecture.id)}
                                    className="text-xs font-bold gap-1.5 cursor-pointer h-9 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                                  >
                                    <RotateCcw className="size-3.5" />
                                    <span>إعادة المحاولة</span>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    disabled={Object.keys(answersForLec).length === 0}
                                    onClick={() => handleSubmitQuiz(lecture.id)}
                                    className="btn-primary-glow text-xs font-black px-6 h-9 rounded-xl cursor-pointer"
                                  >
                                    <span>تصحيح الكويز وإظهار النتيجة</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sub-item 3: ما ورد في امتحانات سابقة ونقاط التركيز */}
                      {doctorNotes && doctorNotes.length > 0 && (
                        <div className="space-y-2">
                          <div
                            onClick={() => toggleSection(lecture.id, "notes")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-4 py-3 sm:py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="size-4 text-emerald-400" />
                              <span className="text-sm sm:text-base font-bold text-emerald-400">
                                ما ورد في امتحانات سابقة ونقاط التركيز
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400">
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
                              <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs">
                                <Sparkles className="size-3.5 shrink-0" />
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
                          <div
                            onClick={() => toggleSection(lecture.id, "pdf")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-4 py-3 sm:py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 text-emerald-400" />
                              <span className="text-sm sm:text-base font-bold text-emerald-400">
                                سلايدات ومذكرات الـ PDF ({pdfs.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400">
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
                          <div
                            onClick={() => toggleSection(lecture.id, "roadmap")}
                            className="bg-[#061510] hover:bg-[#081e16] border border-emerald-500/50 rounded-xl px-4 py-3 sm:py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Workflow className="size-4 text-emerald-400" />
                              <span className="text-sm sm:text-base font-bold text-emerald-400">
                                الخرائط الذهنية والمخططات ({roadmaps.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400">
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
                                        <div className="p-4 text-center space-y-2">
                                          <Cloud className="size-8 text-sky-400 mx-auto" />
                                          <h6 className="text-xs font-bold text-slate-100">{map.title}</h6>
                                          <a
                                            href={map.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:underline"
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
    </div>
  )
}
