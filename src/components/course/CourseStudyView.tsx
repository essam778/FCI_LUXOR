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
  return null
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
  return [
    {
      id: `${lecture.id}-q1`,
      question: `ما هو الهدف التعليمي الأساسي لمحاضرة "${lecture.title}"؟`,
      options: [
        "فهم المفاهيم الأساسية والتطبيق البرمجي السليم",
        "حفظ الأكواد دون تطبيق عملي",
        "تخطي شيتات المعمل والتركيز على النظري فقط",
        "إهمال شروط الحدود وتعقيد الخوارزمية",
      ],
      correctIndex: 0,
      explanation: "الهدف الأكاديمي دائماً هو الجمع بين الاستيعاب النظري والتطبيق البرمجي الصحيح وحل الشيتات.",
    },
    {
      id: `${lecture.id}-q2`,
      question: "وفقاً لتوجيهات أساتذة المادة، ما الذي يجب الانتباه له في الامتحانات وشيتات الدكتور؟",
      options: [
        "التركيز على شروط الحدود (Boundary Cases) والتعقيد الحسابي والخطوات المنطقية",
        "إهمال المدخلات الخاطئة وحالات الاختبار الاستثنائية",
        "كتابة حلول عشوائية دون ترتيب",
        "تجاهل خطوات الحل النموذجية",
      ],
      correctIndex: 0,
      explanation: "أساتذة حاسبات بالأقصر يهتمون بحالات الاختبار الدقيقة والشروط الحدية في ورقة الإجابة.",
    },
  ]
}

export function CourseStudyView({ course }: CourseStudyViewProps) {
  const parsed = parseCourseTitle(course.title)
  const coverImg =
    course.imageUrl ||
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80"

  const levelText =
    course.level === 1
      ? "الفرقة الأولى"
      : course.level === 2
      ? "الفرقة الثانية"
      : course.level === 3
      ? "الفرقة الثالثة"
      : "الفرقة الرابعة"

  const semText = course.semester === 1 ? "الترم الأول" : "الترم الثاني"

  // Open/close state for lectures (First lecture open by default, but NO video autoplay)
  const [openLectures, setOpenLectures] = React.useState<Record<string, boolean>>({
    [course.lectures[0]?.id || ""]: true,
  })

  // Which video is active per lecture
  const [activeVideoPerLecture, setActiveVideoPerLecture] = React.useState<Record<string, string>>({})

  // Video loaded state: video only loads when student explicitly clicks "تشغيل الفيديو"
  // This guarantees NO AUTOPLAY and NO unintended sound or data usage!
  const [videoLoaded, setVideoLoaded] = React.useState<Record<string, boolean>>({})

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
  const totalLecs = course.lectures.length
  const totalTopics = course.lectures.reduce((acc, lec) => acc + (lec.topics?.length || 0), 0)
  const totalVids = course.lectures.reduce(
    (acc, l) => acc + (l.videos?.length || (l.videoUrl ? 1 : 0)),
    0
  )
  const totalPdfs = course.lectures.reduce(
    (acc, l) => acc + (l.pdfs?.length || (l.pdfUrl ? 1 : 0)),
    0
  )

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-8 text-start" dir="rtl">
      {/* 1. Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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
        <span className="text-foreground font-bold truncate">{parsed.ar}</span>
      </nav>

      {/* 2. Course Hero Banner */}
      <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl overflow-hidden shadow-xl space-y-6">
        {/* Course Cover Image Banner */}
        <div className="h-48 sm:h-64 w-full relative overflow-hidden bg-muted">
          <Image
            src={coverImg}
            alt={course.title}
            fill
            unoptimized
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/35 to-black/30" />

          {/* Badges on image */}
          <div className="absolute top-4 start-4 end-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black px-3 py-1 rounded-lg bg-primary text-primary-foreground shadow-sm">
                {course.code}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-card/90 backdrop-blur-md border border-border text-foreground">
                {levelText}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-card/90 backdrop-blur-md border border-border text-foreground">
                {semText}
              </span>
            </div>

            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1">
              <ShieldCheck className="size-3.5" />
              <span>منهج معتمد ومتاح</span>
            </span>
          </div>
        </div>

        {/* Course Header Details */}
        <div className="p-6 sm:p-8 pt-0 space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight leading-snug">
              {parsed.ar}
            </h1>
            {parsed.en && (
              <p dir="ltr" className="text-xs sm:text-sm font-mono text-muted-foreground text-start">
                {parsed.en}
              </p>
            )}
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {course.description}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/60">
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center space-y-0.5">
              <div className="text-lg sm:text-xl font-black text-foreground flex items-center justify-center gap-1.5">
                <Layers className="size-4 text-primary" />
                <span>{totalLecs}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">محاضرات المقرر</div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center space-y-0.5">
              <div className="text-lg sm:text-xl font-black text-foreground flex items-center justify-center gap-1.5">
                <FileText className="size-4 text-emerald-500" />
                <span>{totalTopics}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">موضوعات وشروحات</div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center space-y-0.5">
              <div className="text-lg sm:text-xl font-black text-foreground flex items-center justify-center gap-1.5">
                <Video className="size-4 text-sky-500" />
                <span>{totalVids}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">فيديوهات الشرح</div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center space-y-0.5">
              <div className="text-lg sm:text-xl font-black text-foreground flex items-center justify-center gap-1.5">
                <FileText className="size-4 text-amber-500" />
                <span>{totalPdfs}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">سلايدات PDF</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Lectures List (قائمة المحاضرات والدروس المنظمة) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-lg sm:text-2xl font-black text-foreground flex items-center gap-2">
            <BookOpen className="size-6 text-primary" />
            <span>محاضرات المنهج ({totalLecs} محاضرات)</span>
          </h2>
          <span className="text-xs text-muted-foreground">اضغط على المحاضرة لعرض الشرح والملفات</span>
        </div>

        {course.lectures.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/60 space-y-2">
            <Layers className="size-10 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-foreground">المحاضرات قيد الرفع والاعتماد الأكاديمي</h3>
            <p className="text-xs text-muted-foreground">سيتم إضافة الفيديوهات والسلايدات قريباً.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {course.lectures.map((lecture, lecIdx) => {
              const isOpen = !!openLectures[lecture.id]
              const videos = getLectureVideos(lecture)
              const pdfs = getLecturePdfs(lecture)
              const roadmaps = getLectureRoadmaps(lecture)
              const quizQuestions = getLectureQuizQuestions(lecture)

              const activeVidUrl = activeVideoPerLecture[lecture.id] || videos[0]?.url
              const embedUrl = getEmbedUrl(activeVidUrl)
              const isVidLoaded = !!videoLoaded[lecture.id]

              // Clean title
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
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-card/85 backdrop-blur-md shadow-xs ${
                    isOpen ? "border-primary/60 ring-1 ring-primary/20 shadow-md" : "border-border/80 hover:border-border"
                  }`}
                >
                  {/* Lecture Header Row (Click to toggle) */}
                  <div
                    onClick={() => toggleLecture(lecture.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 select-none transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="size-8 sm:size-9 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-xs sm:text-sm flex items-center justify-center shrink-0">
                        {lecture.number || lecIdx + 1}
                      </span>
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-foreground hover:text-primary transition-colors leading-snug line-clamp-1">
                          محاضرة {lecture.number || lecIdx + 1}: {cleanTitle || lecture.title}
                        </h3>
                        {lecture.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {lecture.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                        {videos.length > 0 && (
                          <span className="inline-flex items-center gap-1 font-bold bg-muted/60 px-2 py-0.5 rounded-md border border-border/50 text-foreground">
                            <Play className="size-3 text-sky-500" />
                            {videos.length} {videos.length === 1 ? "فيديو" : "فيديوهات"}
                          </span>
                        )}
                        {pdfs.length > 0 && (
                          <span className="inline-flex items-center gap-1 font-bold bg-muted/60 px-2 py-0.5 rounded-md border border-border/50 text-foreground">
                            <FileText className="size-3 text-amber-500" />
                            {pdfs.length} PDF
                          </span>
                        )}
                      </div>

                      <div
                        className={`size-8 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground transition-transform duration-200 ${
                          isOpen ? "rotate-180 bg-primary text-primary-foreground shadow-xs" : ""
                        }`}
                      >
                        <ChevronDown className="size-4 stroke-[2.5]" />
                      </div>
                    </div>
                  </div>

                  {/* Lecture Content Details (When Open) */}
                  {isOpen && (
                    <div className="p-4 sm:p-6 border-t border-border/70 space-y-6 bg-muted/10">
                      {/* 1. Doctor Exam Notes (if any) */}
                      {doctorNotes && doctorNotes.length > 0 && (
                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2 text-start">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs sm:text-sm">
                            <Sparkles className="size-4" />
                            <span>توجيهات ونقاط تركيز الدكتور في الامتحانات:</span>
                          </div>
                          <div className="space-y-1.5 ps-6">
                            {doctorNotes.map((dn, dnIdx) => (
                              <div key={dnIdx} className="text-xs text-foreground font-medium leading-relaxed">
                                <span className="font-bold text-amber-600 dark:text-amber-400">• {dn.title}: </span>
                                <span>{dn.note}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Video Player Section (NO AUTOPLAY) */}
                      {videos.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                              <Video className="size-4 text-sky-500" />
                              <span>فيديو شرح المحاضرة</span>
                            </h4>
                            {videos.length > 1 && (
                              <div className="flex items-center gap-1 overflow-x-auto">
                                {videos.map((v, vIdx) => (
                                  <button
                                    key={v.id || vIdx}
                                    type="button"
                                    onClick={() => {
                                      setActiveVideoPerLecture((prev) => ({ ...prev, [lecture.id]: v.url }))
                                      setVideoLoaded((prev) => ({ ...prev, [lecture.id]: true }))
                                    }}
                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                      activeVidUrl === v.url
                                        ? "bg-sky-500 text-white border-sky-600 shadow-xs"
                                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                                    }`}
                                  >
                                    الجزء {vIdx + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl border border-border/80 bg-black overflow-hidden relative aspect-video w-full shadow-lg">
                            {isVidLoaded && embedUrl ? (
                              <iframe
                                src={embedUrl}
                                title={lecture.title}
                                className="w-full h-full border-0"
                                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              /* Video Thumbnail with Click to Play - Ensures NO AUTOPLAY */
                              <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-br from-slate-950 via-slate-900 to-black p-6 text-center space-y-3">
                                <div className="size-16 rounded-2xl bg-primary/20 border-2 border-primary/40 text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play className="size-8 fill-primary ps-1" />
                                </div>
                                <div className="space-y-1 max-w-md">
                                  <h5 className="text-sm sm:text-base font-bold text-white">
                                    {lecture.title}
                                  </h5>
                                  <p className="text-xs text-slate-400">
                                    اضغط لتشغيل الشرح بجودة عالية وبدون إعلانات مزعجة
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => setVideoLoaded((prev) => ({ ...prev, [lecture.id]: true }))}
                                  className="btn-primary-glow font-black text-xs h-9 px-6 rounded-xl cursor-pointer"
                                >
                                  <Play className="size-3.5 fill-current" />
                                  <span>تشغيل الشرح الآن</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3. PDF Slides & Downloads */}
                      {pdfs.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                            <FileText className="size-4 text-amber-500" />
                            <span>سلايدات ومذكرات المحاضرة</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {pdfs.map((pdf, pIdx) => (
                              <a
                                key={pdf.id || pIdx}
                                href={pdf.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3.5 rounded-xl border border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-between gap-3 group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="size-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                    <FileText className="size-4" />
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="text-xs font-bold text-foreground truncate group-hover:text-amber-500 transition-colors">
                                      {pdf.title}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                      {pdf.size || "ملف PDF معتمد"}
                                    </div>
                                  </div>
                                </div>

                                <div className="size-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                                  <Download className="size-3.5" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. Topics Checklist */}
                      {lecture.topics && lecture.topics.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                            <Layers className="size-4 text-primary" />
                            <span>الموضوعات المغطاة في المحاضرة</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {lecture.topics.map((t, tIdx) => (
                              <div
                                key={t.id || tIdx}
                                className="p-3 rounded-xl border border-border/70 bg-card/60 flex items-center gap-2.5 text-xs text-foreground"
                              >
                                <span className="size-5 rounded-md bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                                  {tIdx + 1}
                                </span>
                                <span className="font-medium truncate">{t.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. Roadmaps & Visual Infographics (if any) */}
                      {roadmaps.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                            <Workflow className="size-4 text-cyan-500" />
                            <span>الخرائط الذهنية ومخططات المفاهيم</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {roadmaps.map((map) => (
                              <div
                                key={map.id}
                                onClick={() => setPreviewRoadmap(map)}
                                className="rounded-xl border border-cyan-500/30 bg-card overflow-hidden cursor-pointer group hover:border-cyan-500 transition-all shadow-xs"
                              >
                                <div className="relative aspect-video w-full bg-muted/40 overflow-hidden">
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
                                <div className="p-3">
                                  <h5 className="text-xs font-bold text-foreground">{map.title}</h5>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 6. Interactive Quiz */}
                      {quizQuestions.length > 0 && (
                        <div className="p-4 sm:p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                              <HelpCircle className="size-4 text-purple-500" />
                              <span>اختبر استيعابك للمحاضرة ({quizQuestions.length} أسئلة)</span>
                            </h4>

                            {isSubmitted && (
                              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                                نتيجتك: {correctCount} من {quizQuestions.length}
                              </span>
                            )}
                          </div>

                          <div className="space-y-4">
                            {quizQuestions.map((q, qIdx) => {
                              const chosen = answersForLec[q.id]

                              return (
                                <div
                                  key={q.id || qIdx}
                                  className="p-3.5 sm:p-4 rounded-xl border border-border bg-card space-y-2.5 text-xs text-start"
                                >
                                  <div className="font-bold text-foreground">
                                    {qIdx + 1}. {q.question}
                                  </div>

                                  <div className="space-y-1.5">
                                    {q.options.map((opt, optIdx) => {
                                      const isSelected = chosen === optIdx
                                      const isCorrect = q.correctIndex === optIdx

                                      let optStyle =
                                        "border-border bg-muted/20 text-foreground hover:bg-muted/40"
                                      if (isSelected && !isSubmitted) {
                                        optStyle = "border-primary bg-primary/10 text-primary font-bold"
                                      } else if (isSubmitted) {
                                        if (isCorrect) {
                                          optStyle =
                                            "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                                        } else if (isSelected && !isCorrect) {
                                          optStyle =
                                            "border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400"
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
                                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                            isSubmitted ? "cursor-default" : "cursor-pointer"
                                          } ${optStyle}`}
                                        >
                                          <span>{opt}</span>
                                          {isSubmitted && isCorrect && (
                                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                                          )}
                                          {isSubmitted && isSelected && !isCorrect && (
                                            <XCircle className="size-4 text-rose-500 shrink-0" />
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>

                                  {isSubmitted && q.explanation && (
                                    <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                                      💡 <strong className="text-foreground">التفسير الأكاديمي:</strong> {q.explanation}
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
                                className="text-xs font-bold gap-1.5 cursor-pointer"
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
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. Roadmap Modal */}
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
