"use client"

import * as React from "react"
import {
  ShieldCheck,
  PlusCircle,
  Bell,
  BookOpen,
  Layers,
  HelpCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  FileText,
  Video,
  Link as LinkIcon,
  Upload,
  X,
  Search,
  ExternalLink,
  Sparkles,
  Workflow,
  Play,
} from "lucide-react"

import { Users } from "lucide-react"
import { AdminMembersTab } from "./AdminMembersTab"
import { AdminNotificationsTab } from "./AdminNotificationsTab"
import type { AdminMember } from "@/lib/actions/adminMembers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { dispatchRealNotification } from "@/lib/notifications"
import { sanitizeInput } from "@/lib/security"
import {
  COURSES_DATA,
  ACADEMIC_YEARS,
  type Course,
  type LectureChapter,
  type TopicItem,
  type VideoItem,
  type PdfItem,
  type RoadmapItem,
  type QuizQuestion,
} from "@/data/coursesData"

function sanitize(input: string): string {
  return sanitizeInput(input)
}

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

interface AttachedResource {
  id: string
  courseId: string
  lectureId?: string
  type: "pdf" | "video" | "roadmap" | "link"
  title: string
  url: string
  date: string
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [activeTab, setActiveTab] = React.useState<"courses" | "resources" | "members" | "announcements">("courses")
  const [preselectedNotifyMember, setPreselectedNotifyMember] = React.useState<AdminMember | null>(null)
  const [coursesList, setCoursesList] = React.useState<Course[]>(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("fci_admin_courses")
        localStorage.removeItem("fci_admin_courses_v2")
        const stored = localStorage.getItem("fci_admin_courses_v3")
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Keep only current official courses plus courses explicitly created by admin
            return parsed.filter(
              (c: Course) =>
                c.id.startsWith("admin-") ||
                COURSES_DATA.some((official) => official.id === c.id)
            )
          }
        }
      } catch {
        // ignore
      }
    }
    return COURSES_DATA
  })

  // Attached resources list
  const [resourcesList, setResourcesList] = React.useState<AttachedResource[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fci_attached_resources")
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          // ignore
        }
      }
    }
    return [
      {
        id: "res-1",
        courseId: "l1-s1-cs101",
        type: "pdf",
        title: "سلايدات المحاضرة الأولى: مقدمة في الخوارزميات وتدفق البيانات (PDF)",
        url: "https://example.com/slides-lec1.pdf",
        date: "2025-10-25",
      },
      {
        id: "res-2",
        courseId: "l1-s1-cs101",
        type: "video",
        title: "شرح عملي لحل مسائل هياكل البيانات والتعقيد الحسابي (YouTube)",
        url: "https://youtube.com",
        date: "2025-10-28",
      },
    ]
  })

  const [savedStatus, setSavedStatus] = React.useState<string | null>(null)
  const [filterYear, setFilterYear] = React.useState<number>(1)
  const [searchFilter, setSearchFilter] = React.useState<string>("")

  // Course Add/Edit Modal
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null)
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = React.useState(false)

  // Course Form Fields
  const [formTitle, setFormTitle] = React.useState("")
  const [formCode, setFormCode] = React.useState("")
  const [formLevel, setFormLevel] = React.useState("1")
  const [formSemester, setFormSemester] = React.useState("1")
  const [formDesc, setFormDesc] = React.useState("")
  const [formStudyPlanDays, setFormStudyPlanDays] = React.useState("7")

  // Divide course & add lecture state
  const [managingLecturesCourse, setManagingLecturesCourse] = React.useState<Course | null>(null)
  const [newLectureTitle, setNewLectureTitle] = React.useState("")
  const [newLectureSummary, setNewLectureSummary] = React.useState("")
  const [newLectureVideoUrl, setNewLectureVideoUrl] = React.useState("")
  const [newLecturePdfUrl, setNewLecturePdfUrl] = React.useState("")
  const [newLecturePdfName, setNewLecturePdfName] = React.useState("")
  const [newTopicTitle, setNewTopicTitle] = React.useState("")
  const [newTopicDoctorNote, setNewTopicDoctorNote] = React.useState("")
  const [selectedLectureForTopic, setSelectedLectureForTopic] = React.useState<string>("")

  // Edit Existing Lecture State
  const [editingLecture, setEditingLecture] = React.useState<LectureChapter | null>(null)
  const [editLectureTitle, setEditLectureTitle] = React.useState("")
  const [editLectureSummary, setEditLectureSummary] = React.useState("")
  const [editLectureVideos, setEditLectureVideos] = React.useState<VideoItem[]>([])
  const [editLecturePdfs, setEditLecturePdfs] = React.useState<PdfItem[]>([])
  const [editLectureRoadmaps, setEditLectureRoadmaps] = React.useState<RoadmapItem[]>([])
  const [editLectureQuiz, setEditLectureQuiz] = React.useState<QuizQuestion[]>([])

  // Sub-inputs for adding media inside edit lecture modal
  const [newSubVideoTitle, setNewSubVideoTitle] = React.useState("")
  const [newSubVideoUrl, setNewSubVideoUrl] = React.useState("")

  const [newSubPdfTitle, setNewSubPdfTitle] = React.useState("")
  const [newSubPdfUrl, setNewSubPdfUrl] = React.useState("")

  const [newSubMapTitle, setNewSubMapTitle] = React.useState("")
  const [newSubMapUrl, setNewSubMapUrl] = React.useState("")
  const [newSubMapDesc, setNewSubMapDesc] = React.useState("")

  // Sub-inputs for adding a quiz question
  const [newQuizQuestion, setNewQuizQuestion] = React.useState("")
  const [newQuizOpt0, setNewQuizOpt0] = React.useState("")
  const [newQuizOpt1, setNewQuizOpt1] = React.useState("")
  const [newQuizOpt2, setNewQuizOpt2] = React.useState("")
  const [newQuizOpt3, setNewQuizOpt3] = React.useState("")
  const [newQuizCorrectIdx, setNewQuizCorrectIdx] = React.useState("0")
  const [newQuizExplanation, setNewQuizExplanation] = React.useState("")

  // Resource Upload Form State
  const [resCourseId, setResCourseId] = React.useState<string>(coursesList[0]?.id || "")
  const [resLectureId, setResLectureId] = React.useState<string>("")
  const [resType, setResType] = React.useState<"pdf" | "video" | "roadmap" | "link">("pdf")
  const [resTitle, setResTitle] = React.useState("")
  const [resUrl, setResUrl] = React.useState("")


  // Sync courses with localStorage
  const persistCourses = (updated: Course[]) => {
    setCoursesList(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("fci_admin_courses_v3", JSON.stringify(updated))
    }
  }


  // Sync resources with localStorage
  const persistResources = (updated: AttachedResource[]) => {
    setResourcesList(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("fci_attached_resources", JSON.stringify(updated))
    }
  }

  // Open Edit Course
  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course)
    setFormTitle(course.title)
    setFormCode(course.code)
    setFormLevel(String(course.level))
    setFormSemester(String(course.semester))
    setFormDesc(course.description)
    setFormStudyPlanDays(String(course.studyPlanDays || 7))
  }

  // Save Edit Course
  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle || !formCode) return

    const sanitizedTitle = sanitize(formTitle)
    const sanitizedCode = sanitize(formCode)
    const sanitizedDesc = sanitize(formDesc)
    const parsedLevel = parseInt(formLevel, 10) as 1 | 2 | 3 | 4
    const parsedSemester = parseInt(formSemester, 10) as 1 | 2
    const parsedDays = parseInt(formStudyPlanDays, 10) || 7

    if (editingCourse) {
      // Update existing course
      const updated = coursesList.map((c) =>
        c.id === editingCourse.id
          ? {
              ...c,
              title: sanitizedTitle,
              code: sanitizedCode,
              description: sanitizedDesc,
              level: parsedLevel,
              semester: parsedSemester,
              studyPlanDays: parsedDays,
            }
          : c
      )
      persistCourses(updated)
      setSavedStatus(`تم تحديث بيانات مقرر "${sanitizedTitle}" بنجاح!`)
      setEditingCourse(null)
    } else {
      // Add new course
      const newCourse: Course = {
        id: `custom-${Date.now()}`,
        slug: sanitizedCode.toLowerCase().replace(/\s+/g, "-"),
        code: sanitizedCode,
        title: sanitizedTitle,
        description: sanitizedDesc,
        level: parsedLevel,
        semester: parsedSemester,
        status: "published",
        studyPlanDays: parsedDays,
        lectures: [],
      }
      const updated = [newCourse, ...coursesList]
      persistCourses(updated)
      setSavedStatus(`تمت إضافة المقرر الجديد "${sanitizedTitle}" بنجاح!`)
      setIsAddCourseModalOpen(false)
    }

    setTimeout(() => setSavedStatus(null), 3500)
  }

  // Delete Course
  const handleDeleteCourse = (courseId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المقرر وجميع المحاضرات التابعة له؟")) {
      const updated = coursesList.filter((c) => c.id !== courseId)
      persistCourses(updated)
      setSavedStatus("تم حذف المقرر بنجاح.")
      setTimeout(() => setSavedStatus(null), 3000)
    }
  }

  // Add Lecture to Course
  const handleAddLecture = (e: React.FormEvent) => {
    e.preventDefault()
    if (!managingLecturesCourse || !newLectureTitle) return

    const newLec: LectureChapter = {
      id: `lec-${Date.now()}`,
      number: managingLecturesCourse.lectures.length + 1,
      title: sanitize(newLectureTitle),
      summary: sanitize(newLectureSummary) || "ملخص وشرح المحاضرة",
      videoUrl: newLectureVideoUrl.trim() ? sanitize(newLectureVideoUrl) : undefined,
      pdfUrl: newLecturePdfUrl.trim() ? sanitize(newLecturePdfUrl) : undefined,
      pdfName: newLecturePdfName.trim() ? sanitize(newLecturePdfName) : undefined,
      topics: [],
    }

    const updatedCourse = {
      ...managingLecturesCourse,
      lectures: [...managingLecturesCourse.lectures, newLec],
    }

    const updatedList = coursesList.map((c) =>
      c.id === managingLecturesCourse.id ? updatedCourse : c
    )

    persistCourses(updatedList)
    setManagingLecturesCourse(updatedCourse)
    setNewLectureTitle("")
    setNewLectureSummary("")
    setNewLectureVideoUrl("")
    setNewLecturePdfUrl("")
    setNewLecturePdfName("")
    setSavedStatus(`تمت إضافة المحاضرة "${newLec.title}" وربط وسائطها بنجاح!`)

    // Broadcast real notification to all students in Supabase DB
    dispatchRealNotification({
      title: `محاضرة جديدة: ${managingLecturesCourse.title}`,
      message: `تمت إضافة المحاضرة ${newLec.number}: "${newLec.title}" بمقرر ${managingLecturesCourse.code}`,
      link: `/courses?courseId=${managingLecturesCourse.id}&lecId=${newLec.id}`,
    })

    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Delete Lecture from Course
  const handleDeleteLecture = (lectureId: string) => {
    if (!managingLecturesCourse) return
    const updatedLectures = managingLecturesCourse.lectures
      .filter((l) => l.id !== lectureId)
      .map((l, idx) => ({ ...l, number: idx + 1 }))

    const updatedCourse = {
      ...managingLecturesCourse,
      lectures: updatedLectures,
    }

    const updatedList = coursesList.map((c) =>
      c.id === managingLecturesCourse.id ? updatedCourse : c
    )

    persistCourses(updatedList)
    setManagingLecturesCourse(updatedCourse)
    setSavedStatus("تم حذف المحاضرة وتحديث الترقيم.")
    setTimeout(() => setSavedStatus(null), 3000)
  }


  // Add Topic inside a Lecture
  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault()
    if (!managingLecturesCourse || !selectedLectureForTopic || !newTopicTitle) return

    const sanitizedTopicTitle = sanitize(newTopicTitle)
    const newTop: TopicItem = {
      id: `top-${Date.now()}`,
      slug: sanitizedTopicTitle.toLowerCase().replace(/\s+/g, "-"),
      title: sanitizedTopicTitle,
      importance: 4,
      doctorNote: newTopicDoctorNote ? sanitize(newTopicDoctorNote) : undefined,
      durationMinutes: 30,
    }

    const updatedLectures = managingLecturesCourse.lectures.map((lec) => {
      if (lec.id === selectedLectureForTopic) {
        return {
          ...lec,
          topics: [...lec.topics, newTop],
        }
      }
      return lec
    })

    const updatedCourse = {
      ...managingLecturesCourse,
      lectures: updatedLectures,
    }

    const updatedList = coursesList.map((c) =>
      c.id === managingLecturesCourse.id ? updatedCourse : c
    )

    persistCourses(updatedList)
    setManagingLecturesCourse(updatedCourse)
    setNewTopicTitle("")
    setNewTopicDoctorNote("")
    setSavedStatus(`تمت إضافة الموضوع الدراسي بنجاح!`)
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Open Edit Lecture Modal
  const handleOpenEditLecture = (lec: LectureChapter) => {
    setEditingLecture(lec)
    setEditLectureTitle(lec.title)
    setEditLectureSummary(lec.summary || "")

    const initialVideos: VideoItem[] =
      lec.videos && lec.videos.length > 0
        ? [...lec.videos]
        : lec.videoUrl
        ? [{ id: `v-${Date.now()}`, title: "فيديو الشرح الأساسي", url: lec.videoUrl, source: "YouTube" }]
        : []

    const initialPdfs: PdfItem[] =
      lec.pdfs && lec.pdfs.length > 0
        ? [...lec.pdfs]
        : lec.pdfUrl
        ? [{ id: `pdf-${Date.now()}`, title: lec.pdfName || "سلايدات المحاضرة", url: lec.pdfUrl, size: "PDF" }]
        : []

    const initialRoadmaps: RoadmapItem[] = lec.roadmaps ? [...lec.roadmaps] : []
    const initialQuiz: QuizQuestion[] = lec.quiz ? [...lec.quiz] : []

    setEditLectureVideos(initialVideos)
    setEditLecturePdfs(initialPdfs)
    setEditLectureRoadmaps(initialRoadmaps)
    setEditLectureQuiz(initialQuiz)

    setNewSubVideoTitle("")
    setNewSubVideoUrl("")
    setNewSubPdfTitle("")
    setNewSubPdfUrl("")
    setNewSubMapTitle("")
    setNewSubMapUrl("")
    setNewSubMapDesc("")

    setNewQuizQuestion("")
    setNewQuizOpt0("")
    setNewQuizOpt1("")
    setNewQuizOpt2("")
    setNewQuizOpt3("")
    setNewQuizCorrectIdx("0")
    setNewQuizExplanation("")
  }

  // Nested media management handlers inside edit lecture
  const handleAddVideoToEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubVideoTitle || !newSubVideoUrl) return
    const newV: VideoItem = {
      id: `v-${Date.now()}`,
      title: sanitize(newSubVideoTitle),
      url: sanitize(newSubVideoUrl),
      source: "YouTube",
      duration: "شرح جديد",
    }
    setEditLectureVideos((prev) => [...prev, newV])
    setNewSubVideoTitle("")
    setNewSubVideoUrl("")
  }

  const handleDeleteVideoFromEdit = (vidId: string) => {
    setEditLectureVideos((prev) => prev.filter((v) => v.id !== vidId))
  }

  const handleAddPdfToEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubPdfTitle || !newSubPdfUrl) return
    const newP: PdfItem = {
      id: `pdf-${Date.now()}`,
      title: sanitize(newSubPdfTitle),
      url: sanitize(newSubPdfUrl),
      size: "PDF",
    }
    setEditLecturePdfs((prev) => [...prev, newP])
    setNewSubPdfTitle("")
    setNewSubPdfUrl("")
  }

  const handleDeletePdfFromEdit = (pdfId: string) => {
    setEditLecturePdfs((prev) => prev.filter((p) => p.id !== pdfId))
  }

  const handleAddRoadmapToEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubMapTitle || !newSubMapUrl) return
    const newM: RoadmapItem = {
      id: `map-${Date.now()}`,
      title: sanitize(newSubMapTitle),
      imageUrl: sanitize(newSubMapUrl),
      description: newSubMapDesc ? sanitize(newSubMapDesc) : undefined,
    }
    setEditLectureRoadmaps((prev) => [...prev, newM])
    setNewSubMapTitle("")
    setNewSubMapUrl("")
    setNewSubMapDesc("")
  }

  const handleDeleteRoadmapFromEdit = (mapId: string) => {
    setEditLectureRoadmaps((prev) => prev.filter((m) => m.id !== mapId))
  }

  // Quiz Builder Handlers inside edit lecture
  const handleAddQuizQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuizQuestion.trim() || !newQuizOpt0.trim() || !newQuizOpt1.trim()) return

    const options = [
      sanitize(newQuizOpt0),
      sanitize(newQuizOpt1),
      sanitize(newQuizOpt2 || "لا شيء مما سبق"),
      sanitize(newQuizOpt3 || "جميع ما سبق"),
    ]

    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      question: sanitize(newQuizQuestion),
      options,
      correctIndex: parseInt(newQuizCorrectIdx, 10) || 0,
      explanation: newQuizExplanation ? sanitize(newQuizExplanation) : undefined,
    }

    setEditLectureQuiz((prev) => [...prev, newQ])
    setNewQuizQuestion("")
    setNewQuizOpt0("")
    setNewQuizOpt1("")
    setNewQuizOpt2("")
    setNewQuizOpt3("")
    setNewQuizCorrectIdx("0")
    setNewQuizExplanation("")
  }

  const handleDeleteQuizQuestion = (qId: string | number) => {
    setEditLectureQuiz((prev) => prev.filter((q) => q.id !== qId))
  }

  // Save Edit Lecture
  const handleSaveEditLecture = (e: React.FormEvent) => {
    e.preventDefault()
    if (!managingLecturesCourse || !editingLecture || !editLectureTitle) return

    const sanitizedTitle = sanitize(editLectureTitle)
    const sanitizedSummary = sanitize(editLectureSummary)

    const updatedLectures = managingLecturesCourse.lectures.map((lec) => {
      if (lec.id === editingLecture.id) {
        return {
          ...lec,
          title: sanitizedTitle,
          summary: sanitizedSummary,
          videoUrl: editLectureVideos[0]?.url || undefined,
          pdfUrl: editLecturePdfs[0]?.url || undefined,
          pdfName: editLecturePdfs[0]?.title || undefined,
          videos: editLectureVideos,
          pdfs: editLecturePdfs,
          roadmaps: editLectureRoadmaps,
          quiz: editLectureQuiz,
        }
      }
      return lec
    })

    const updatedCourse = {
      ...managingLecturesCourse,
      lectures: updatedLectures,
    }

    const updatedList = coursesList.map((c) =>
      c.id === managingLecturesCourse.id ? updatedCourse : c
    )

    persistCourses(updatedList)
    setManagingLecturesCourse(updatedCourse)
    setEditingLecture(null)
    setSavedStatus(`تم تحديث بيانات المحاضرة "${sanitizedTitle}" وجميع وسائطها المتداخلة بنجاح!`)
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Delete Topic inside Lecture
  const handleDeleteTopic = (topicId: string, lectureId: string) => {
    if (!managingLecturesCourse) return
    const updatedLectures = managingLecturesCourse.lectures.map((lec) => {
      if (lec.id === lectureId) {
        return {
          ...lec,
          topics: lec.topics.filter((t) => t.id !== topicId),
        }
      }
      return lec
    })
    const updatedCourse = { ...managingLecturesCourse, lectures: updatedLectures }
    const updatedList = coursesList.map((c) =>
      c.id === managingLecturesCourse.id ? updatedCourse : c
    )
    persistCourses(updatedList)
    setManagingLecturesCourse(updatedCourse)
    setSavedStatus("تم حذف الموضوع بنجاح.")
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Attach Resource (PDF / Video / Roadmap / Link)
  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resTitle || !resUrl) return

    const cleanResTitle = sanitize(resTitle)
    const cleanResUrl = sanitize(resUrl)

    const newRes: AttachedResource = {
      id: `res-${Date.now()}`,
      courseId: resCourseId,
      lectureId: resLectureId || undefined,
      type: resType,
      title: cleanResTitle,
      url: cleanResUrl,
      date: new Date().toISOString().split("T")[0],
    }

    const updated = [newRes, ...resourcesList]
    persistResources(updated)

    // If a specific lecture was selected, update that lecture's nested media directly!
    if (resLectureId) {
      const updatedCourses = coursesList.map((course) => {
        if (course.id === resCourseId) {
          const updatedLectures = course.lectures.map((lec) => {
            if (lec.id === resLectureId) {
              const currentVideos =
                lec.videos && lec.videos.length > 0
                  ? [...lec.videos]
                  : lec.videoUrl
                  ? [{ id: `v-${Date.now()}`, title: "فيديو الشرح الأساسي", url: lec.videoUrl, source: "YouTube" }]
                  : []

              const currentPdfs =
                lec.pdfs && lec.pdfs.length > 0
                  ? [...lec.pdfs]
                  : lec.pdfUrl
                  ? [{ id: `pdf-${Date.now()}`, title: lec.pdfName || "سلايدات المحاضرة", url: lec.pdfUrl, size: "PDF" }]
                  : []

              const currentRoadmaps = lec.roadmaps ? [...lec.roadmaps] : []

              let updatedVideos = currentVideos
              let updatedPdfs = currentPdfs
              let updatedRoadmaps = currentRoadmaps

              if (resType === "video") {
                updatedVideos = [
                  ...currentVideos,
                  { id: `v-${Date.now()}`, title: cleanResTitle, url: cleanResUrl, source: "YouTube" },
                ]
              } else if (resType === "pdf") {
                updatedPdfs = [
                  ...currentPdfs,
                  { id: `pdf-${Date.now()}`, title: cleanResTitle, url: cleanResUrl, size: "PDF" },
                ]
              } else if (resType === "roadmap") {
                updatedRoadmaps = [
                  ...currentRoadmaps,
                  { id: `map-${Date.now()}`, title: cleanResTitle, imageUrl: cleanResUrl, description: cleanResTitle },
                ]
              }

              return {
                ...lec,
                pdfUrl: resType === "pdf" ? cleanResUrl : lec.pdfUrl,
                pdfName: resType === "pdf" ? cleanResTitle : lec.pdfName,
                videoUrl: resType === "video" ? cleanResUrl : lec.videoUrl,
                videos: updatedVideos,
                pdfs: updatedPdfs,
                roadmaps: updatedRoadmaps,
              }
            }
            return lec
          })
          return { ...course, lectures: updatedLectures }
        }
        return course
      })
      persistCourses(updatedCourses)
      if (managingLecturesCourse && managingLecturesCourse.id === resCourseId) {
        const updatedManaging = updatedCourses.find((c) => c.id === resCourseId)
        if (updatedManaging) setManagingLecturesCourse(updatedManaging)
      }
    }

    setResTitle("")
    setResUrl("")
    setResLectureId("")
    setSavedStatus(`تم رفع وربط المصدر "${cleanResTitle}" بالمقرر والمحاضرة بنجاح!`)

    // Broadcast real notification to all students in Supabase DB
    const targetCourse = coursesList.find((c) => c.id === resCourseId)
    const resTypeLabel = resType === "pdf" ? "ملف PDF جديد" : resType === "video" ? "فيديو شرح جديد" : resType === "roadmap" ? "خريطة مفاهيم جديدة" : "رابط تعليمي جديد"
    dispatchRealNotification({
      title: `${resTypeLabel}: ${targetCourse?.title || "مقرر دراسي"}`,
      message: `تم رفع وإتاحة: "${cleanResTitle}"`,
      link: `/courses?courseId=${resCourseId}${resLectureId ? `&lecId=${resLectureId}` : ""}&section=${resType}`,
    })

    setTimeout(() => setSavedStatus(null), 3500)
  }

  // Delete Resource
  const handleDeleteResource = (resId: string) => {
    const updated = resourcesList.filter((r) => r.id !== resId)
    persistResources(updated)
    setSavedStatus("تم حذف المصدر بنجاح.")
    setTimeout(() => setSavedStatus(null), 3000)
  }



  // Filter courses
  const filteredCourses = coursesList.filter((course) => {
    const matchesYear = course.level === filterYear
    const matchesSearch =
      searchFilter.trim() === "" ||
      course.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      course.code.toLowerCase().includes(searchFilter.toLowerCase())
    return matchesYear && matchesSearch
  })

  return (
    <div className="space-y-8">
      {/* Executive Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 sm:size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-xs">
            <ShieldCheck className="size-6 stroke-[2.2]" />
          </div>
          <div className="space-y-1 text-start">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-foreground">
                لوحة الإدارة الأكاديمية
              </h1>
              <span className="text-[10px] sm:text-[11px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/25">
                مسؤول النظام
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>صلاحية إدارة المحتوى:</span>
              <span className="font-mono text-foreground font-semibold bg-muted/60 px-2 py-0.5 rounded-md text-[11px]">
                {adminEmail}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-2 shadow-xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>نظام الحماية ومزامنة البيانات نشط</span>
          </span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/[0.03] space-y-1.5 text-start shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">المقررات النشطة</span>
            <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="size-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{coursesList.length}</div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">قابلة للإدارة والتعديل الفوري</p>
        </div>

        <div className="p-4 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-card to-sky-500/[0.03] space-y-1.5 text-start shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">المحاضرات المسجلة</span>
            <div className="size-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Layers className="size-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {coursesList.reduce((acc, c) => acc + c.lectures.length, 0)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">محاضرة مفصلة بجميع الفرق</p>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-card to-amber-500/[0.03] space-y-1.5 text-start shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">المصادر و الـ PDFs</span>
            <div className="size-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <FileText className="size-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{resourcesList.length}</div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">ملفات وروابط مرفوعة سحابياً</p>
        </div>

        <div className="p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-card to-purple-500/[0.03] space-y-1.5 text-start shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold">الموضوعات وتركيزات الامتحان</span>
            <div className="size-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Sparkles className="size-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {coursesList.reduce(
              (acc, c) => acc + c.lectures.reduce((lAcc, l) => lAcc + l.topics.length, 0),
              0
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">عناصر وتركيزات دكاترة مسجلة</p>
        </div>
      </div>

      {savedStatus && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center gap-2 animate-in fade-in-50">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{savedStatus}</span>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/30 border border-border/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab("courses")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "courses"
              ? "bg-primary text-primary-foreground font-black shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <BookOpen className="size-4" />
          <span>إدارة المقررات والمحاضرات</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
            activeTab === "courses" ? "bg-black/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {coursesList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("resources")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "resources"
              ? "bg-primary text-primary-foreground font-black shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Upload className="size-4" />
          <span>المصادر والوسائط</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
            activeTab === "resources" ? "bg-black/20 text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {resourcesList.length}
          </span>
        </button>

                <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "members"
              ? "bg-primary text-primary-foreground font-black shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Users className="size-4" />
          <span>إدارة الأعضاء والطلاب</span>
        </button>

        <button
          onClick={() => setActiveTab("announcements")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "announcements"
              ? "bg-primary text-primary-foreground font-black shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Bell className="size-4" />
          <span>إدارة وسجل الإشعارات</span>
        </button>
      </div>

      {/* Tab 1: Courses Management & Editing */}
      {activeTab === "courses" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground me-1">الفرقة:</span>
              {ACADEMIC_YEARS.map((y) => (
                <button
                  key={y.level}
                  type="button"
                  onClick={() => setFilterYear(y.level)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterYear === y.level
                      ? "bg-primary text-primary-foreground font-black shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  الفرقة {y.level}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="ابحث بكود أو اسم المقرر..."
                  className="ps-8 pe-3 h-9 text-xs bg-muted/20 rounded-xl"
                />
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setEditingCourse(null)
                  setFormTitle("")
                  setFormCode("")
                  setFormLevel(String(filterYear))
                  setFormSemester("1")
                  setFormDesc("")
                  setFormStudyPlanDays("7")
                  setIsAddCourseModalOpen(true)
                }}
                className="text-xs font-bold gap-1.5 h-9 px-4 rounded-xl shrink-0 cursor-pointer shadow-xs"
              >
                <PlusCircle className="size-4" />
                <span>إضافة مقرر</span>
              </Button>
            </div>
          </div>

          {/* Courses Table / Cards */}
          <div className="space-y-3">
            {filteredCourses.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-2xl border border-dashed border-border text-muted-foreground text-xs">
                لا توجد مقررات مسجلة لهذه الفرقة أو مطابقة للبحث.
              </div>
            ) : (
              filteredCourses.map((course) => {
                const parsedTitle = parseCourseTitle(course.title)
                return (
                  <div
                    key={course.id}
                    className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card space-y-3.5 transition-all hover:border-primary/40 hover:shadow-sm text-start relative overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-primary/15 text-primary border border-primary/25">
                            {course.code}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-foreground">
                            {parsedTitle.ar}
                          </h3>
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/60">
                            الترم {course.semester === 1 ? "الأول" : "الثاني"}
                          </span>
                        </div>
                        {parsedTitle.en && (
                          <div dir="ltr" className="text-start">
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {parsedTitle.en}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap pt-2 md:pt-0 border-t md:border-0 border-border/60">
                        <Button
                          size="sm"
                          onClick={() => setManagingLecturesCourse(course)}
                          className="text-xs gap-1.5 h-8 font-black bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                        >
                          <Layers className="size-3.5" />
                          <span>المحاضرات ({course.lectures.length})</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(course)}
                          className="text-xs gap-1.5 h-8 font-bold hover:border-primary/40 cursor-pointer"
                        >
                          <Pencil className="size-3.5" />
                          <span>تعديل</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2.5 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only sm:not-sr-only">حذف</span>
                        </Button>
                      </div>
                    </div>

                    {/* Course stats indicator */}
                    <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span className="font-semibold text-foreground">الفرقة {course.level}</span>
                        <span>•</span>
                        <span>
                          الموضوعات:{" "}
                          <strong className="text-foreground">
                            {course.lectures.reduce((acc, l) => acc + l.topics.length, 0)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          الفيديوهات:{" "}
                          <strong className="text-foreground">
                            {course.lectures.reduce((acc, l) => acc + (l.videos?.length || (l.videoUrl ? 1 : 0)), 0)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          الملفات:{" "}
                          <strong className="text-foreground">
                            {course.lectures.reduce((acc, l) => acc + (l.pdfs?.length || (l.pdfUrl ? 1 : 0)), 0)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Upload and Attach Resources (PDF, Video, Links) */}
      {activeTab === "resources" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Resource Form */}
          <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-6 space-y-5 text-start">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Upload className="size-4 text-primary" />
                <span>رفع وإضافة مصدر جديد لمقرر</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                أرفق ملف PDF سلايدات، رابط شرح فيديو، أو بنك أسئلة لمقرر دراسي محدد.
              </p>
            </div>

            {/* Storage & Embed Guide Banner */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5 text-xs">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                <span>كيف يعمل تضمين وتخزين الفيديوهات وملفات الـ PDF؟</span>
              </span>
              <ul className="text-muted-foreground space-y-1.5 leading-relaxed text-[11px] list-disc list-inside">
                <li>
                  <strong className="text-foreground">الفيديوهات:</strong> يمكنك وضع روابط YouTube أو Vimeo مباشرة، ويقوم النظام تلقائياً بتضمين مشغل فيديو داخل صفحة المحاضرة دون الحاجة لمغادرة المنصة.
                </li>
                <li>
                  <strong className="text-foreground">ملفات الـ PDF:</strong> يمكنك رفع الملف في سلة تخزين Supabase Storage (عبر إنشاء Bucket باسم <code>course-materials</code> وضبطه كـ Public) أو استخدام رابط ملف مباشر، فيظهر للطالب عارض مدمج لقراءة السلايدات وزر تحميل مباشر.
                </li>
              </ul>
            </div>


            <form onSubmit={handleAddResource} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">اختر المقرر الدراسي:</label>
                <select
                  value={resCourseId}
                  onChange={(e) => {
                    setResCourseId(e.target.value)
                    setResLectureId("")
                  }}
                  className="w-full h-9 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id} className="bg-card">
                      {c.code} - {c.title} (فرقة {c.level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  ربط بمحاضرة محددة (لتحديث ملف الـ PDF أو الفيديو الخاص بها مباشرة):
                </label>
                <select
                  value={resLectureId}
                  onChange={(e) => setResLectureId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="" className="bg-card">
                    -- عام للمقرر ككل --
                  </option>
                  {coursesList
                    .find((c) => c.id === resCourseId)
                    ?.lectures.map((lec) => (
                      <option key={lec.id} value={lec.id} className="bg-card">
                        المحاضرة {lec.number}: {lec.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">نوع المصدر التعليمي:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setResType("pdf")}
                    className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      resType === "pdf"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/20 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="size-4" />
                    <span>ملف PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResType("video")}
                    className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      resType === "video"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/20 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Video className="size-4" />
                    <span>فيديو شرح</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResType("roadmap")}
                    className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      resType === "roadmap"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/20 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Workflow className="size-4" />
                    <span>خريطة ذهنية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResType("link")}
                    className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      resType === "link"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted/20 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LinkIcon className="size-4" />
                    <span>رابط خارجي</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">عنوان المصدر أو الملف:</label>
                <Input
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="مثال: سلايدات المحاضرة الرابعة - شجرة البحث الثنائي"
                  required
                  className="text-xs bg-muted/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  رابط الملف أو رابط الفيديو (URL):
                </label>
                <Input
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  placeholder="https://drive.google.com/... أو رابط يوتيوب أو مسار الملف"
                  required
                  className="text-xs bg-muted/20 font-mono text-start"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" className="w-full font-bold text-xs gap-1.5">
                  <Upload className="size-3.5" />
                  <span>تثبيت ونشر المصدر للطلاب</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Uploaded Resources List */}
          <div className="lg:col-span-7 space-y-4 text-start">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                المصادر المرفوعة حالياً ({resourcesList.length})
              </h3>
              <span className="text-xs text-muted-foreground">متاحة ومربوطة بالمقررات</span>
            </div>

            <div className="space-y-2.5">
              {resourcesList.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-2xl border border-border text-muted-foreground text-xs">
                  لم يتم رفع مصادر بعد. استخدم النموذج لإرفاق أول ملف.
                </div>
              ) : (
                resourcesList.map((res) => {
                  const course = coursesList.find((c) => c.id === res.courseId)
                  return (
                    <div
                      key={res.id}
                      className="p-4 rounded-xl border border-border bg-card flex items-start justify-between gap-3 text-start"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                          {res.type === "pdf" ? (
                            <FileText className="size-4" />
                          ) : res.type === "video" ? (
                            <Video className="size-4" />
                          ) : res.type === "roadmap" ? (
                            <Workflow className="size-4 text-cyan-500" />
                          ) : (
                            <LinkIcon className="size-4" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-foreground">{res.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                            <span className="font-semibold text-primary">
                              {course ? `${course.code} - ${course.title}` : "مقرر عام"}
                            </span>
                            <span>•</span>
                            <span>تاريخ الرفع: {res.date}</span>
                          </div>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono pt-1"
                          >
                            <span>فتح الرابط</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteResource(res.id)}
                        className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2 shrink-0"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Broadcast Real Announcements */}
      {/* Tab 3: Members & Students Management */}
      {activeTab === "members" && (
        <AdminMembersTab
          onDirectNotifyMember={(member) => {
            setPreselectedNotifyMember(member)
            setActiveTab("announcements")
          }}
          onStatusMessage={(msg) => {
            setSavedStatus(msg)
            setTimeout(() => setSavedStatus(null), 3500)
          }}
        />
      )}

      {/* Tab 4: Advanced Notifications Center & History */}
      {activeTab === "announcements" && (
        <AdminNotificationsTab
          initialTargetMember={preselectedNotifyMember}
          onClearInitialTargetMember={() => setPreselectedNotifyMember(null)}
          onStatusMessage={(msg) => {
            setSavedStatus(msg)
            setTimeout(() => setSavedStatus(null), 3500)
          }}
        />
      )}

      {/* Edit / Add Course Modal */}
      {(editingCourse || isAddCourseModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50 duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative text-start max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setEditingCourse(null)
                setIsAddCourseModalOpen(false)
              }}
              className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">
                {editingCourse ? `تعديل مقرر: ${editingCourse.title}` : "إضافة مقرر دراسي جديد"}
              </h3>
              <p className="text-xs text-muted-foreground">
                أدخل بيانات المادة الدراسية، الترم، والفرقة لتحديثها في قاعدة البيانات.
              </p>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">اسم المادة:</label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: هندسة البرمجيات"
                    required
                    className="text-xs bg-muted/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">كود المادة:</label>
                  <Input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="مثال: CS301"
                    required
                    className="text-xs bg-muted/20 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">الفرقة الدراسية:</label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                    className="w-full h-9 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="1" className="bg-card">الفرقة 1</option>
                    <option value="2" className="bg-card">الفرقة 2</option>
                    <option value="3" className="bg-card">الفرقة 3</option>
                    <option value="4" className="bg-card">الفرقة 4</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">الفصل الدراسي:</label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full h-9 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="1" className="bg-card">الترم الأول</option>
                    <option value="2" className="bg-card">الترم الثاني</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">خطة المذاكرة (أيام):</label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={formStudyPlanDays}
                    onChange={(e) => setFormStudyPlanDays(e.target.value)}
                    className="text-xs bg-muted/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">وصف المادة:</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="وصف مختصر للمقرر وأهم محاوره..."
                  rows={3}
                  className="w-full rounded-xl border border-input bg-muted/20 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingCourse(null)
                    setIsAddCourseModalOpen(false)
                  }}
                  className="text-xs"
                >
                  إلغاء
                </Button>
                <Button type="submit" size="sm" className="text-xs font-bold px-5">
                  حفظ التعديلات
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Divide Course / Manage Lectures Modal */}
      {managingLecturesCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50 duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative text-start max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setManagingLecturesCourse(null)}
              className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Layers className="size-5 text-primary" />
                <span>تقسيم وإدارة محاضرات: {parseCourseTitle(managingLecturesCourse.title).ar}</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                يمكنك تقسيم المادة إلى محاضرات تفصيلية، وإضافة موضوعات وتركيزات الدكتور داخل كل
                محاضرة.
              </p>
            </div>

            {/* Existing Lectures list */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground">
                المحاضرات المسجلة حالياً ({managingLecturesCourse.lectures.length}):
              </h4>
              <div className="space-y-2 max-h-52 overflow-y-auto pe-1">
                {managingLecturesCourse.lectures.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 bg-muted/20 rounded-xl text-center">
                    لا توجد محاضرات مسجلة بعد في هذا المقرر.
                  </p>
                ) : (
                  managingLecturesCourse.lectures.map((lec) => {
                    const videoCount = (lec.videos?.length || (lec.videoUrl ? 1 : 0))
                    const pdfCount = (lec.pdfs?.length || (lec.pdfUrl ? 1 : 0))
                    const mapCount = (lec.roadmaps?.length || 0)
                    const quizCount = (lec.quiz?.length || 0)
                    return (
                      <div
                        key={lec.id}
                        className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="text-xs font-black text-foreground">
                              المحاضرة {lec.number}: {lec.title}
                            </span>
                            {videoCount > 0 && (
                              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                🎥 {videoCount > 1 ? `${videoCount} فيديوهات` : "فيديو"}
                              </span>
                            )}
                            {pdfCount > 0 && (
                              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                📄 {pdfCount > 1 ? `${pdfCount} PDFs` : "PDF"}
                              </span>
                            )}
                            {mapCount > 0 && (
                              <span className="text-[10px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                                🗺️ {mapCount > 1 ? `${mapCount} خرائط` : "خريطة"}
                              </span>
                            )}
                            {quizCount > 0 && (
                              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                ❓ {quizCount} أسئلة
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {lec.topics.length} عناصر
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditLecture(lec)}
                              className="text-muted-foreground hover:text-primary p-1 transition-colors cursor-pointer"
                              title="تعديل المحاضرة والوسائط (PDF وفيديو)"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLecture(lec.id)}
                              className="text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                              title="حذف المحاضرة"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                        {lec.summary && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{lec.summary}</p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Add New Lecture Section with Video & PDF */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <PlusCircle className="size-3.5 text-primary" />
                  <span>إضافة محاضرة جديدة مع مشغل فيديو مدمج وملف PDF:</span>
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  ضع رابط يوتيوب ليتم تضمينه تلقائياً كمشغل مدمج، ورابط ملف الـ PDF ليتمكن الطلاب من قراءته وتحميله.
                </p>
              </div>

              <form onSubmit={handleAddLecture} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={newLectureTitle}
                    onChange={(e) => setNewLectureTitle(e.target.value)}
                    placeholder="عنوان المحاضرة (مثال: القوائم المترابطة)"
                    required
                    className="text-xs bg-muted/20"
                  />
                  <Input
                    value={newLectureSummary}
                    onChange={(e) => setNewLectureSummary(e.target.value)}
                    placeholder="ملخص سريع لمحتوى المحاضرة"
                    className="text-xs bg-muted/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    value={newLectureVideoUrl}
                    onChange={(e) => setNewLectureVideoUrl(e.target.value)}
                    placeholder="رابط فيديو الشرح (YouTube link)"
                    className="text-xs bg-muted/20 font-mono"
                  />
                  <Input
                    value={newLecturePdfUrl}
                    onChange={(e) => setNewLecturePdfUrl(e.target.value)}
                    placeholder="رابط ملف الـ PDF (مباشر أو سحابي)"
                    className="text-xs bg-muted/20 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Input
                    value={newLecturePdfName}
                    onChange={(e) => setNewLecturePdfName(e.target.value)}
                    placeholder="اسم ملف الـ PDF التوضيحي (مثال: سلايدات محاضرة 1.pdf)"
                    className="text-xs bg-muted/20 max-w-sm"
                  />
                  <Button type="submit" size="sm" className="text-xs font-bold shrink-0">
                    إضافة المحاضرة والوسائط
                  </Button>
                </div>
              </form>
            </div>


            {/* Add Topic inside Lecture Section */}
            {managingLecturesCourse.lectures.length > 0 && (
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <HelpCircle className="size-3.5 text-primary" />
                  <span>إضافة موضوع دراسي وتركيز دكتور داخل محاضرة:</span>
                </h4>
                <form onSubmit={handleAddTopic} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={selectedLectureForTopic}
                      onChange={(e) => setSelectedLectureForTopic(e.target.value)}
                      required
                      className="h-9 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">اختر المحاضرة...</option>
                      {managingLecturesCourse.lectures.map((l) => (
                        <option key={l.id} value={l.id} className="bg-card">
                          محاضرة {l.number}: {l.title}
                        </option>
                      ))}
                    </select>

                    <Input
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      placeholder="عنوان الموضوع (مثال: Singly vs Doubly)"
                      required
                      className="text-xs bg-muted/20"
                    />

                    <Input
                      value={newTopicDoctorNote}
                      onChange={(e) => setNewTopicDoctorNote(e.target.value)}
                      placeholder="تركيز الدكتور (مهم للامتحان)"
                      className="text-xs bg-muted/20"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" className="text-xs font-bold">
                      إضافة الموضوع
                    </Button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setManagingLecturesCourse(null)}
                className="text-xs font-bold"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lecture Modal */}
      {editingLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50 duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative text-start max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingLecture(null)}
              className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Pencil className="size-4 text-primary" />
                <span>تعديل بيانات المحاضرة والوسائط</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                المحاضرة {editingLecture.number}: {editingLecture.title}
              </p>
            </div>

            <form onSubmit={handleSaveEditLecture} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">عنوان المحاضرة:</label>
                <Input
                  value={editLectureTitle}
                  onChange={(e) => setEditLectureTitle(e.target.value)}
                  placeholder="عنوان المحاضرة..."
                  required
                  className="text-xs bg-muted/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">ملخص المحاضرة:</label>
                <textarea
                  value={editLectureSummary}
                  onChange={(e) => setEditLectureSummary(e.target.value)}
                  placeholder="ملخص محتوى المحاضرة..."
                  rows={2}
                  className="w-full rounded-xl border border-input bg-muted/20 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* SECTION 1: VIDEOS MANAGER */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Video className="size-3.5 text-primary" />
                    <span>فيديوهات الشرح المسجلة ({editLectureVideos.length}):</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">يمكن ربط أكثر من فيديو للمحاضرة</span>
                </div>

                {editLectureVideos.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
                    {editLectureVideos.map((v) => (
                      <div
                        key={v.id}
                        className="p-2 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Play className="size-3 text-primary shrink-0" />
                          <span className="font-semibold text-foreground truncate">{v.title}</span>
                          <span className="text-[10px] text-muted-foreground truncate font-mono">({v.url})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteVideoFromEdit(v.id)}
                          className="text-muted-foreground hover:text-destructive p-1 cursor-pointer shrink-0"
                          title="حذف هذا الفيديو"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Add Video Form */}
                <div className="p-2.5 rounded-xl bg-card border border-border/80 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={newSubVideoTitle}
                      onChange={(e) => setNewSubVideoTitle(e.target.value)}
                      placeholder="عنوان الفيديو (مثال: فيديو 2: حل مسائل المعمل)"
                      className="text-xs bg-muted/20"
                    />
                    <Input
                      value={newSubVideoUrl}
                      onChange={(e) => setNewSubVideoUrl(e.target.value)}
                      placeholder="رابط يوتيوب..."
                      className="text-xs bg-muted/20 font-mono text-start"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddVideoToEdit}
                      disabled={!newSubVideoTitle || !newSubVideoUrl}
                      className="text-[11px] font-bold h-7 cursor-pointer"
                    >
                      + إضافة فيديو للمحاضرة
                    </Button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PDFS & SLIDES MANAGER */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-amber-500" />
                    <span>ملفات وسلايدات الـ PDF ({editLecturePdfs.length}):</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">سلايدات، شيتات، أو ملخصات</span>
                </div>

                {editLecturePdfs.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
                    {editLecturePdfs.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="size-3 text-amber-500 shrink-0" />
                          <span className="font-semibold text-foreground truncate">{p.title}</span>
                          <span className="text-[10px] text-muted-foreground truncate font-mono">({p.url})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePdfFromEdit(p.id)}
                          className="text-muted-foreground hover:text-destructive p-1 cursor-pointer shrink-0"
                          title="حذف هذا الملف"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Add PDF Form */}
                <div className="p-2.5 rounded-xl bg-card border border-border/80 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={newSubPdfTitle}
                      onChange={(e) => setNewSubPdfTitle(e.target.value)}
                      placeholder="اسم الملف (مثال: شيت التمارين والحلول.pdf)"
                      className="text-xs bg-muted/20"
                    />
                    <Input
                      value={newSubPdfUrl}
                      onChange={(e) => setNewSubPdfUrl(e.target.value)}
                      placeholder="رابط مباشر أو سحابي للملف..."
                      className="text-xs bg-muted/20 font-mono text-start"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddPdfToEdit}
                      disabled={!newSubPdfTitle || !newSubPdfUrl}
                      className="text-[11px] font-bold h-7 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      + إضافة ملف PDF
                    </Button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ROADMAPS & INFOGRAPHICS MANAGER */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Workflow className="size-3.5 text-cyan-500" />
                    <span>الخرائط الذهنية والرود ماب ({editLectureRoadmaps.length}):</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">مخططات مفاهيم ورسوم بيانية</span>
                </div>

                {editLectureRoadmaps.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
                    {editLectureRoadmaps.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Workflow className="size-3 text-cyan-500 shrink-0" />
                          <span className="font-semibold text-foreground truncate">{m.title}</span>
                          {m.description && (
                            <span className="text-[10px] text-muted-foreground truncate">({m.description})</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoadmapFromEdit(m.id)}
                          className="text-muted-foreground hover:text-destructive p-1 cursor-pointer shrink-0"
                          title="حذف هذه الخريطة"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Add Roadmap Form */}
                <div className="p-2.5 rounded-xl bg-card border border-border/80 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      value={newSubMapTitle}
                      onChange={(e) => setNewSubMapTitle(e.target.value)}
                      placeholder="عنوان الخريطة (مثال: مخطط شجرة القرارات)"
                      className="text-xs bg-muted/20"
                    />
                    <Input
                      value={newSubMapUrl}
                      onChange={(e) => setNewSubMapUrl(e.target.value)}
                      placeholder="رابط صورة الخريطة (URL)..."
                      className="text-xs bg-muted/20 font-mono text-start"
                    />
                  </div>
                  <Input
                    value={newSubMapDesc}
                    onChange={(e) => setNewSubMapDesc(e.target.value)}
                    placeholder="وصف مختصر للخريطة الذهنية (اختياري)..."
                    className="text-xs bg-muted/20"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddRoadmapToEdit}
                      disabled={!newSubMapTitle || !newSubMapUrl}
                      className="text-[11px] font-bold h-7 cursor-pointer bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      + إضافة خريطة ذهنية
                    </Button>
                  </div>
                </div>
              </div>

              {/* SECTION 4: QUIZ BUILDER */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <HelpCircle className="size-3.5 text-purple-500" />
                    <span>الكويز التفاعلي وأسئلة الفهم ({editLectureQuiz.length} أسئلة):</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">أضف أسئلة MCQ مع تحديد الإجابة الصحيحة</span>
                </div>

                {editLectureQuiz.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pe-1">
                    {editLectureQuiz.map((q, qIdx) => (
                      <div
                        key={q.id || qIdx}
                        className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground">
                            {qIdx + 1}. {q.question}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuizQuestion(q.id)}
                            className="text-muted-foreground hover:text-destructive p-1 cursor-pointer shrink-0"
                            title="حذف هذا السؤال"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          {q.options.map((opt, optIdx) => (
                            <span
                              key={optIdx}
                              className={`p-1 rounded-md px-2 truncate ${
                                q.correctIndex === optIdx
                                  ? "bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30"
                                  : "text-muted-foreground bg-muted/40"
                              }`}
                            >
                              {optIdx + 1}) {opt} {q.correctIndex === optIdx && "✓"}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Quiz Question Form */}
                <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2 text-start">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">نص السؤال:</label>
                    <Input
                      value={newQuizQuestion}
                      onChange={(e) => setNewQuizQuestion(e.target.value)}
                      placeholder="مثال: ما هو ناتج تحويل العدد الثنائي 1010 إلى عشري؟"
                      className="text-xs bg-muted/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">الخيار الأول (1):</label>
                      <Input
                        value={newQuizOpt0}
                        onChange={(e) => setNewQuizOpt0(e.target.value)}
                        placeholder="الخيار الأول..."
                        className="text-xs bg-muted/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">الخيار الثاني (2):</label>
                      <Input
                        value={newQuizOpt1}
                        onChange={(e) => setNewQuizOpt1(e.target.value)}
                        placeholder="الخيار الثاني..."
                        className="text-xs bg-muted/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">الخيار الثالث (3):</label>
                      <Input
                        value={newQuizOpt2}
                        onChange={(e) => setNewQuizOpt2(e.target.value)}
                        placeholder="الخيار الثالث..."
                        className="text-xs bg-muted/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">الخيار الرابع (4):</label>
                      <Input
                        value={newQuizOpt3}
                        onChange={(e) => setNewQuizOpt3(e.target.value)}
                        placeholder="الخيار الرابع..."
                        className="text-xs bg-muted/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 items-end">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-500">اختر الإجابة الصحيحة:</label>
                      <select
                        value={newQuizCorrectIdx}
                        onChange={(e) => setNewQuizCorrectIdx(e.target.value)}
                        className="w-full h-8 rounded-lg border border-input bg-muted/20 px-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="0" className="bg-card">الخيار الأول هو الصحيح</option>
                        <option value="1" className="bg-card">الخيار الثاني هو الصحيح</option>
                        <option value="2" className="bg-card">الخيار الثالث هو الصحيح</option>
                        <option value="3" className="bg-card">الخيار الرابع هو الصحيح</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">توضيح الإجابة (اختياري):</label>
                      <Input
                        value={newQuizExplanation}
                        onChange={(e) => setNewQuizExplanation(e.target.value)}
                        placeholder="سبب صحة هذا الخيار..."
                        className="text-xs bg-muted/20"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddQuizQuestion}
                      disabled={!newQuizQuestion.trim() || !newQuizOpt0.trim() || !newQuizOpt1.trim()}
                      className="text-[11px] font-bold h-7 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      + إضافة السؤال للكويز
                    </Button>
                  </div>
                </div>
              </div>

              {/* Topics inside this lecture */}
              {editingLecture.topics.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <label className="text-xs font-bold text-foreground">
                    عناصر ومحاور المحاضرة المسجلة ({editingLecture.topics.length}):
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
                    {editingLecture.topics.map((t, idx) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono font-bold text-[10px] text-muted-foreground">{idx + 1}.</span>
                          <span className="font-semibold text-foreground truncate">{t.title}</span>
                          {t.doctorNote && (
                            <span className="text-[10px] text-primary shrink-0">({t.doctorNote})</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTopic(t.id, editingLecture.id)}
                          className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                          title="حذف هذا الموضوع"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingLecture(null)}
                  className="text-xs cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button type="submit" size="sm" className="text-xs font-bold px-5 cursor-pointer">
                  حفظ التعديلات ونشرها
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
