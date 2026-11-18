"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ShieldCheck,
  PlusCircle,
  Bell,
  BookOpen,
  Layers,
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
  Users,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
  Database,
  UploadCloud,
  CreditCard,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

import { AdminMembersTab } from "./AdminMembersTab"
import { AdminNotificationsTab } from "./AdminNotificationsTab"
import { AdminSubscriptionsTab } from "./AdminSubscriptionsTab"
import { CourseEditorModal } from "./modals/CourseEditorModal"
import { LectureStudioModal } from "./modals/LectureStudioModal"
import type { AdminMember } from "@/lib/actions/adminMembers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { dispatchRealNotification } from "@/lib/notifications"
import { syncFullCourseToDatabase, uploadCourseCoverAction, deleteCourseFromDatabase } from "@/lib/actions/courses"
import {
  ACADEMIC_YEARS,
  type Course,
  type LectureChapter,
  type TopicItem,
} from "@/data/coursesData"

import { parseCourseTitle } from "@/lib/utils"

// Preserve symbols, quotes, and mathematical syntax cleanly
function cleanText(input: unknown): string {
  if (typeof input !== "string") return ""
  return input.replace(/\0/g, "").trim()
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

export function AdminDashboard({
  adminEmail,
  initialCourses,
}: {
  adminEmail: string
  initialCourses?: Course[]
}) {
  // Navigation sidebar view
  const [currentView, setCurrentView] = React.useState<
    "overview" | "courses" | "resources" | "members" | "announcements" | "subscriptions" | "system"
  >("courses")

  const [preselectedNotifyMember, setPreselectedNotifyMember] = React.useState<AdminMember | null>(null)

  // Courses state: Uses live Supabase data as the absolute single source of truth
  const [coursesList, setCoursesList] = React.useState<Course[]>(initialCourses || [])

  // Update courses when initialCourses changes and clear any stale legacy localStorage
  React.useEffect(() => {
    if (initialCourses) {
      setCoursesList(initialCourses)
      // If there's an active workspace, refresh it from the new data
      setActiveCourseWorkspace((prev) => {
        if (!prev) return null
        const fresh = initialCourses.find((c) => c.id === prev.id)
        return fresh || prev
      })
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("fci_admin_courses")
        localStorage.removeItem("fci_admin_courses_v2")
        localStorage.removeItem("fci_admin_courses_v3")
      } catch {
        // ignore
      }
    }
  }, [initialCourses])

  const [isSyncingAll, setIsSyncingAll] = React.useState(false)
  const handleSyncAllToSupabase = async () => {
    setIsSyncingAll(true)
    setSavedStatus("جاري مزامنة كافة المقررات والمحاضرات مع قاعدة بيانات Supabase السحابية...")
    try {
      const results = await Promise.all(coursesList.map((course) => syncFullCourseToDatabase(course)))
      const successCount = results.filter((r) => r.success).length
      setSavedStatus(`تمت مزامنة ${successCount} من أصل ${coursesList.length} مقرر دراسي مع Supabase بنجاح! ☁️✓`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشلت المزامنة الشاملة")
    } finally {
      setIsSyncingAll(false)
      setTimeout(() => setSavedStatus(null), 4500)
    }
  }

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
        title: "Lecture 01 Slides: Algorithms & Data Flow Architecture (PDF)",
        url: "https://example.com/slides-lec1.pdf",
        date: "2025-10-25",
      },
      {
        id: "res-2",
        courseId: "l1-s1-cs101",
        type: "video",
        title: "Hands-on Lab: Asymptotic Notation & Big-O Analysis (YouTube)",
        url: "https://youtube.com",
        date: "2025-10-28",
      },
    ]
  })

  const [savedStatus, setSavedStatus] = React.useState<string | null>(null)
  const [filterYear, setFilterYear] = React.useState<number | "all">("all")
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
  const [formImageUrl, setFormImageUrl] = React.useState("")
  const [isUploadingCover, setIsUploadingCover] = React.useState(false)
  const coverFileInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleUploadCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await uploadCourseCoverAction(fd)
      if (res.success && res.url) {
        setFormImageUrl(res.url)
        setSavedStatus("Cover uploaded successfully to Supabase Storage!")
        setTimeout(() => setSavedStatus(null), 3000)
      } else {
        alert(res.error || "Failed to upload image to Supabase Storage.")
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error uploading cover")
    } finally {
      setIsUploadingCover(false)
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = ""
      }
    }
  }

  // Active Focused Course for In-Depth Management ("Enter Course")
  const [activeCourseWorkspace, setActiveCourseWorkspace] = React.useState<Course | null>(null)

  // Add Lecture inside Course Workspace
  const [newLectureTitle, setNewLectureTitle] = React.useState("")
  const [newLectureSummary, setNewLectureSummary] = React.useState("")
  const [newLectureVideoUrl, setNewLectureVideoUrl] = React.useState("")
  const [newLecturePdfUrl, setNewLecturePdfUrl] = React.useState("")
  const [newLecturePdfName, setNewLecturePdfName] = React.useState("")

  // Add Topic inside Lecture
  const [newTopicTitle, setNewTopicTitle] = React.useState("")
  const [newTopicDoctorNote, setNewTopicDoctorNote] = React.useState("")
  const [selectedLectureForTopic, setSelectedLectureForTopic] = React.useState<string>("")

  // Edit Existing Lecture Studio Modal
  const [editingLecture, setEditingLecture] = React.useState<LectureChapter | null>(null)

  // Topic Doctor Note Quick Editor
  const [editingTopicId, setEditingTopicId] = React.useState<string | null>(null)
  const [editTopicTitleVal, setEditTopicTitleVal] = React.useState("")
  const [editTopicNoteVal, setEditTopicNoteVal] = React.useState("")

  // Resource Upload Form State
  const [resCourseId, setResCourseId] = React.useState<string>(coursesList[0]?.id || "")
  const [resLectureId, setResLectureId] = React.useState<string>("")
  const [resType, setResType] = React.useState<"pdf" | "video" | "roadmap" | "link">("pdf")
  const [resTitle, setResTitle] = React.useState("")
  const [resUrl, setResUrl] = React.useState("")

  // Persist courses directly to Supabase and update state
  const persistCourses = (updated: Course[], courseToSync?: Course) => {
    setCoursesList(updated)
    if (courseToSync) {
      setSavedStatus(`جاري حفظ ومزامنة مادة "${courseToSync.title}" مع السحابة (Supabase)...`)
      syncFullCourseToDatabase(courseToSync)
        .then((res) => {
          if (res.success) {
            setSavedStatus(`✅ تم الحفظ والمزامنة السحابية لمادة "${courseToSync.code}" بنجاح`)
            setTimeout(() => setSavedStatus(null), 4000)
          } else {
            const errMsg = `❌ خطأ في الحفظ: ${res.error}`
            setSavedStatus(errMsg)
            alert(errMsg)
            setTimeout(() => setSavedStatus(null), 8000)
          }
        })
        .catch((err) => {
          const errMsg = `❌ خطأ في مزامنة السحابة: ${err instanceof Error ? err.message : "خطأ غير متوقع"}`
          setSavedStatus(errMsg)
          alert(errMsg)
          setTimeout(() => setSavedStatus(null), 8000)
        })
    }
  }

  // Persist resources
  const persistResources = (updated: AttachedResource[]) => {
    setResourcesList(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("fci_attached_resources", JSON.stringify(updated))
    }
  }

  // Open Edit Course Modal
  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course)
    setFormTitle(course.title)
    setFormCode(course.code)
    setFormLevel(String(course.level))
    setFormSemester(String(course.semester))
    setFormDesc(course.description)
    setFormStudyPlanDays(String(course.studyPlanDays || 7))
    setFormImageUrl(
      course.imageUrl ||
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80"
    )
  }

  // Save Edit Course
  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle || !formCode) return

    const sanitizedTitle = cleanText(formTitle)
    const sanitizedCode = cleanText(formCode)
    const sanitizedDesc = cleanText(formDesc)
    const parsedLevel = parseInt(formLevel, 10) as 1 | 2 | 3 | 4
    const parsedSemester = parseInt(formSemester, 10) as 1 | 2
    const parsedDays = parseInt(formStudyPlanDays, 10) || 7
    const imageUrl =
      cleanText(formImageUrl) ||
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80"

    if (editingCourse) {
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
              imageUrl,
            }
          : c
      )
      const targetCourse = updated.find((c) => c.id === editingCourse.id)
      persistCourses(updated, targetCourse)
      if (activeCourseWorkspace && activeCourseWorkspace.id === editingCourse.id && targetCourse) {
        setActiveCourseWorkspace(targetCourse)
      }
      setSavedStatus(`Course "${sanitizedCode}" updated and synced successfully!`)
      setEditingCourse(null)
    } else {
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
        imageUrl,
        lectures: [],
      }
      const updated = [newCourse, ...coursesList]
      persistCourses(updated, newCourse)
      setSavedStatus(`New course "${sanitizedCode}" created and published!`)
      setIsAddCourseModalOpen(false)
    }

    setTimeout(() => setSavedStatus(null), 3500)
  }

  // Delete Course
  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا المقرر نهائياً وجميع محاضراته من قاعدة بيانات Supabase؟")) {
      return
    }
    setSavedStatus("جاري حذف المقرر من قاعدة البيانات السحابية...")
    try {
      const res = await deleteCourseFromDatabase(courseId)
      if (res.success) {
        const updated = coursesList.filter((c) => c.id !== courseId)
        setCoursesList(updated)
        if (activeCourseWorkspace && activeCourseWorkspace.id === courseId) {
          setActiveCourseWorkspace(null)
        }
        setSavedStatus("تم حذف المقرر وجميع محتوياته نهائياً من Supabase بنجاح ✓")
      } else {
        alert(res.error || "فشل حذف المقرر من قاعدة البيانات")
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "خطأ أثناء الحذف")
    } finally {
      setTimeout(() => setSavedStatus(null), 3000)
    }
  }

  // Add Lecture
  const handleAddLecture = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCourseWorkspace || !newLectureTitle) return

    const newLec: LectureChapter = {
      id: `lec-${Date.now()}`,
      number: activeCourseWorkspace.lectures.length + 1,
      title: cleanText(newLectureTitle),
      summary: cleanText(newLectureSummary) || "Academic lecture outline and key concepts",
      videoUrl: newLectureVideoUrl.trim() ? cleanText(newLectureVideoUrl) : undefined,
      pdfUrl: newLecturePdfUrl.trim() ? cleanText(newLecturePdfUrl) : undefined,
      pdfName: newLecturePdfName.trim() ? cleanText(newLecturePdfName) : undefined,
      topics: [],
    }

    const updatedCourse = {
      ...activeCourseWorkspace,
      lectures: [...activeCourseWorkspace.lectures, newLec],
    }

    const updatedList = coursesList.map((c) =>
      c.id === activeCourseWorkspace.id ? updatedCourse : c
    )

    persistCourses(updatedList, updatedCourse)
    setActiveCourseWorkspace(updatedCourse)
    setNewLectureTitle("")
    setNewLectureSummary("")
    setNewLectureVideoUrl("")
    setNewLecturePdfUrl("")
    setNewLecturePdfName("")
    setSavedStatus(`Lecture "${newLec.title}" added with media links!`)

    dispatchRealNotification({
      title: `New Lecture: ${activeCourseWorkspace.title}`,
      message: `Lecture ${newLec.number}: "${newLec.title}" is now available in ${activeCourseWorkspace.code}`,
      link: `/courses?courseId=${activeCourseWorkspace.id}&lecId=${newLec.id}`,
    })

    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Delete Lecture
  const handleDeleteLecture = (lectureId: string) => {
    if (!activeCourseWorkspace) return
    const updatedLectures = activeCourseWorkspace.lectures
      .filter((l) => l.id !== lectureId)
      .map((l, idx) => ({ ...l, number: idx + 1 }))

    const updatedCourse = {
      ...activeCourseWorkspace,
      lectures: updatedLectures,
    }

    const updatedList = coursesList.map((c) =>
      c.id === activeCourseWorkspace.id ? updatedCourse : c
    )

    persistCourses(updatedList, updatedCourse)
    setActiveCourseWorkspace(updatedCourse)
    setSavedStatus("Lecture deleted and sequence updated.")
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Reorder Lecture up or down and persist to DB
  const handleMoveLecture = (index: number, direction: "up" | "down") => {
    if (!activeCourseWorkspace) return
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= activeCourseWorkspace.lectures.length) return

    const newLectures = [...activeCourseWorkspace.lectures]
    const temp = newLectures[index]
    newLectures[index] = newLectures[targetIndex]
    newLectures[targetIndex] = temp

    // Re-index lecture numbers strictly from 1 to N
    const reindexed = newLectures.map((l, i) => ({ ...l, number: i + 1 }))

    const updatedCourse = {
      ...activeCourseWorkspace,
      lectures: reindexed,
    }

    const updatedList = coursesList.map((c) =>
      c.id === activeCourseWorkspace.id ? updatedCourse : c
    )

    persistCourses(updatedList, updatedCourse)
    setActiveCourseWorkspace(updatedCourse)
    setSavedStatus(`Moved "${temp.title}" ${direction === "up" ? "up" : "down"} successfully.`)
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Add Topic
  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCourseWorkspace || !selectedLectureForTopic || !newTopicTitle) return

    const sanitizedTopicTitle = cleanText(newTopicTitle)
    const newTop: TopicItem = {
      id: `top-${Date.now()}`,
      slug: sanitizedTopicTitle.toLowerCase().replace(/\s+/g, "-"),
      title: sanitizedTopicTitle,
      importance: 4,
      doctorNote: newTopicDoctorNote ? cleanText(newTopicDoctorNote) : undefined,
      durationMinutes: 30,
    }

    const updatedLectures = activeCourseWorkspace.lectures.map((lec) => {
      if (lec.id === selectedLectureForTopic) {
        return {
          ...lec,
          topics: [...lec.topics, newTop],
        }
      }
      return lec
    })

    const updatedCourse = {
      ...activeCourseWorkspace,
      lectures: updatedLectures,
    }

    const updatedList = coursesList.map((c) =>
      c.id === activeCourseWorkspace.id ? updatedCourse : c
    )

    persistCourses(updatedList, updatedCourse)
    setActiveCourseWorkspace(updatedCourse)
    setNewTopicTitle("")
    setNewTopicDoctorNote("")
    setSavedStatus(`Topic "${sanitizedTopicTitle}" added to curriculum!`)
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Remove or Clear Doctor Note
  const handleClearDoctorNote = (lectureId: string, topicId: string) => {
    if (!activeCourseWorkspace) return
    const updatedLectures = activeCourseWorkspace.lectures.map((lec) => {
      if (lec.id === lectureId) {
        return {
          ...lec,
          topics: lec.topics.map((t) => (t.id === topicId ? { ...t, doctorNote: undefined } : t)),
        }
      }
      return lec
    })
    const updatedCourse = { ...activeCourseWorkspace, lectures: updatedLectures }
    const updatedList = coursesList.map((c) =>
      c.id === activeCourseWorkspace.id ? updatedCourse : c
    )
    persistCourses(updatedList, updatedCourse)
    setActiveCourseWorkspace(updatedCourse)
    setSavedStatus("Doctor's note removed from topic.")
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Update Topic & Note
  const handleSaveTopicEdit = (lectureId: string, topicId: string) => {
    if (!activeCourseWorkspace || !editTopicTitleVal.trim()) return
    const updatedLectures = activeCourseWorkspace.lectures.map((lec) => {
      if (lec.id === lectureId) {
        return {
          ...lec,
          topics: lec.topics.map((t) =>
            t.id === topicId
              ? {
                  ...t,
                  title: cleanText(editTopicTitleVal),
                  doctorNote: editTopicNoteVal.trim() ? cleanText(editTopicNoteVal) : undefined,
                }
              : t
          ),
        }
      }
      return lec
    })
    const updatedCourse = { ...activeCourseWorkspace, lectures: updatedLectures }
    const updatedList = coursesList.map((c) =>
      c.id === activeCourseWorkspace.id ? updatedCourse : c
    )
    persistCourses(updatedList, updatedCourse)
    setActiveCourseWorkspace(updatedCourse)
    setEditingTopicId(null)
    setSavedStatus("Topic details and exam note saved successfully!")
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Delete Topic
  const handleDeleteTopic = (topicId: string, lectureId: string) => {
    if (!activeCourseWorkspace) return
    const updatedLectures = activeCourseWorkspace.lectures.map((lec) => {
      if (lec.id === lectureId) {
        return {
          ...lec,
          topics: lec.topics.filter((t) => t.id !== topicId),
        }
      }
      return lec
    })
    const updatedCourse = { ...activeCourseWorkspace, lectures: updatedLectures }
    const updatedList = coursesList.map((c) =>
      c.id === activeCourseWorkspace.id ? updatedCourse : c
    )
    persistCourses(updatedList, updatedCourse)
    setActiveCourseWorkspace(updatedCourse)
    setSavedStatus("Topic deleted.")
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Open Edit Lecture Studio
  const handleOpenEditLecture = (lec: LectureChapter) => {
    setEditingLecture(lec)
  }

  // Save Edit Lecture Studio
  const handleSaveEditLecture = (updatedLecture: LectureChapter) => {
    if (!activeCourseWorkspace) return

    const updatedLectures = activeCourseWorkspace.lectures.map((lec) =>
      lec.id === updatedLecture.id ? updatedLecture : lec
    )

    const updatedCourse = {
      ...activeCourseWorkspace,
      lectures: updatedLectures,
    }

    const updatedList = coursesList.map((c) =>
      c.id === activeCourseWorkspace.id ? updatedCourse : c
    )

    persistCourses(updatedList, updatedCourse)
    setActiveCourseWorkspace(updatedCourse)
    setEditingLecture(null)
    setSavedStatus(`Lecture "${updatedLecture.title}" media & quiz synced!`)
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Add Global Resource (PDF / Video / Roadmap / Link)
  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resTitle || !resUrl) return

    const cleanResTitle = cleanText(resTitle)
    const cleanResUrl = cleanText(resUrl)

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

    setResTitle("")
    setResUrl("")
    setResLectureId("")
    setSavedStatus(`Resource "${cleanResTitle}" attached successfully!`)
    setTimeout(() => setSavedStatus(null), 3500)
  }

  const handleDeleteResource = (resId: string) => {
    const updated = resourcesList.filter((r) => r.id !== resId)
    persistResources(updated)
    setSavedStatus("Resource removed.")
    setTimeout(() => setSavedStatus(null), 3000)
  }

  // Filtered courses
  const filteredCourses = coursesList.filter((course) => {
    const matchesYear = filterYear === "all" || course.level === filterYear
    const matchesSearch =
      searchFilter.trim() === "" ||
      course.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      course.code.toLowerCase().includes(searchFilter.toLowerCase())
    return matchesYear && matchesSearch
  })

  // Executive aggregated calculations
  const totalLecturesCount = coursesList.reduce((acc, c) => acc + c.lectures.length, 0)
  const totalVideosCount = coursesList.reduce(
    (acc, c) => acc + c.lectures.reduce((lAcc, l) => lAcc + (l.videos?.length || (l.videoUrl ? 1 : 0)), 0),
    0
  )
  const totalPdfsCount = coursesList.reduce(
    (acc, c) => acc + c.lectures.reduce((lAcc, l) => lAcc + (l.pdfs?.length || (l.pdfUrl ? 1 : 0)), 0),
    0
  )
  const totalTopicsCount = coursesList.reduce(
    (acc, c) => acc + c.lectures.reduce((lAcc, l) => lAcc + l.topics.length, 0),
    0
  )

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background text-foreground antialiased" dir="ltr">
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (ADMINATOR STYLE) */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-64 border-r border-border/80 bg-card/95 backdrop-blur-md flex flex-col justify-between shrink-0">
        <div className="space-y-6 p-5">
          {/* Brand Logo & Platform Title */}
          <div className="flex items-center gap-3 pb-4 border-b border-border/60">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-primary-foreground font-black shadow-md">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
                <span dir="ltr" className="inline-flex items-center">
                  STUDY<span className="text-primary font-black">++</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Control Center v2.4</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 px-3">
              Academic Hub
            </span>

            <button
              type="button"
              onClick={() => {
                setCurrentView("overview")
                setActiveCourseWorkspace(null)
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentView === "overview" && !activeCourseWorkspace
                  ? "bg-primary text-primary-foreground font-black shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="size-4" />
                <span>Dashboard Overview</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView("courses")
                setActiveCourseWorkspace(null)
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentView === "courses" && !activeCourseWorkspace
                  ? "bg-primary text-primary-foreground font-black shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="size-4" />
                <span>Courses & Curriculum</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 rounded-md bg-muted text-muted-foreground">
                {coursesList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView("resources")
                setActiveCourseWorkspace(null)
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentView === "resources"
                  ? "bg-primary text-primary-foreground font-black shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Upload className="size-4" />
                <span>Academic Repository</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 rounded-md bg-muted text-muted-foreground">
                {resourcesList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView("subscriptions")
                setActiveCourseWorkspace(null)
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentView === "subscriptions"
                  ? "bg-primary text-primary-foreground font-black shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="size-4" />
                <span>Subscriptions & Payments</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/30">
                30 EGP
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView("members")
                setActiveCourseWorkspace(null)
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentView === "members"
                  ? "bg-primary text-primary-foreground font-black shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="size-4" />
                <span>Students & Members</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView("announcements")
                setActiveCourseWorkspace(null)
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentView === "announcements"
                  ? "bg-primary text-primary-foreground font-black shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="size-4" />
                <span>Notification Broadcast</span>
              </div>
            </button>
          </nav>

          {/* System Section */}
          <div className="space-y-1 pt-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 px-3">
              Infrastructure
            </span>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Database className="size-3 text-emerald-500" />
                  <span>Cloud DB</span>
                </span>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-foreground font-mono truncate">Supabase RLS Active</p>
            </div>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-border/80 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                {adminEmail.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-black text-foreground truncate">{adminEmail.split("@")[0]}</p>
                <p className="text-[10px] text-muted-foreground truncate font-mono">Master Administrator</p>
              </div>
            </div>

            <Link
              href="/courses"
              target="_blank"
              title="Preview Student Portal"
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <ExternalLink className="size-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-border/80 px-5 sm:px-8 flex items-center justify-between gap-4 bg-card/60 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground">Workspace</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-xs font-black text-foreground capitalize">
              {activeCourseWorkspace ? `Course: ${activeCourseWorkspace.code}` : currentView}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Search */}
            <div className="relative hidden sm:block w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search courses, modules... ⌘K"
                className="ps-8 h-9 text-xs bg-muted/30 border-border/60 rounded-xl"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={isSyncingAll}
              onClick={handleSyncAllToSupabase}
              className="font-bold text-xs gap-1.5 h-9 rounded-xl border-sky-500/40 text-sky-400 hover:bg-sky-500/10 cursor-pointer"
              title="مزامنة جميع المواد والمحاضرات مع قاعدة بيانات Supabase السحابية"
            >
              <UploadCloud className={`size-4 ${isSyncingAll ? "animate-bounce text-sky-400" : ""}`} />
              <span>{isSyncingAll ? "جاري المزامنة..." : "مزامنة السحابة (Supabase)"}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setEditingCourse(null)
                setFormTitle("")
                setFormCode("")
                setFormLevel("1")
                setFormSemester("1")
                setFormDesc("")
                setFormStudyPlanDays("7")
                setFormImageUrl(
                  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80"
                )
                setIsAddCourseModalOpen(true)
              }}
              className="font-bold text-xs gap-1.5 h-9 rounded-xl shadow-xs"
            >
              <PlusCircle className="size-4" />
              <span>Create Course</span>
            </Button>
          </div>
        </header>

        {/* Saved Status Notification */}
        {savedStatus && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-xs flex items-center justify-between gap-2 animate-in fade-in-50">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{savedStatus}</span>
            </div>
            <button onClick={() => setSavedStatus(null)} className="p-1 hover:text-emerald-400">
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <div className="p-5 sm:p-8 space-y-8">
          {/* ========================================================================= */}
          {/* ACTIVE COURSE WORKSPACE ("Enter Course" View) */}
          {/* ========================================================================= */}
          {activeCourseWorkspace ? (
            <div className="space-y-6 animate-in fade-in-50">
              {/* Back button and Course Header Banner */}
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveCourseWorkspace(null)}
                  className="gap-2 text-xs font-bold rounded-xl"
                >
                  <ArrowRight className="size-3.5 rotate-180" />
                  <span>Back to All Courses</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(activeCourseWorkspace)}
                    className="text-xs font-bold rounded-xl gap-1.5"
                  >
                    <Pencil className="size-3.5" />
                    <span>Edit Course Details</span>
                  </Button>
                </div>
              </div>

              {/* Course Identity Banner */}
              <div className="relative rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
                <div className="h-44 sm:h-52 w-full relative">
                  <Image
                    src={
                      activeCourseWorkspace.imageUrl ||
                      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80"
                    }
                    alt={activeCourseWorkspace.title}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 1200px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
                </div>

                <div className="p-6 relative -mt-16 sm:-mt-20 space-y-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-black px-3 py-1 rounded-xl bg-primary text-primary-foreground shadow-sm">
                      {activeCourseWorkspace.code}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-card/90 backdrop-blur-md border border-border">
                      Academic Level {activeCourseWorkspace.level}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-card/90 backdrop-blur-md border border-border">
                      Semester {activeCourseWorkspace.semester}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-foreground">
                      {activeCourseWorkspace.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                      {activeCourseWorkspace.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lecture Management & Curriculum Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-foreground flex items-center gap-2">
                      <Layers className="size-4.5 text-primary" />
                      <span>Curriculum Chapters & Lectures ({activeCourseWorkspace.lectures.length})</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Full control over lecture chapters, video streams, slides, exam notes, and interactive quizzes.
                    </p>
                  </div>
                </div>

                {/* Lecture Cards List */}
                <div className="space-y-3">
                  {activeCourseWorkspace.lectures.length === 0 ? (
                    <div className="p-10 text-center bg-card rounded-2xl border border-dashed border-border text-muted-foreground text-xs space-y-2">
                      <Layers className="size-8 mx-auto text-muted-foreground/40" />
                      <p className="font-bold text-foreground">No lectures recorded yet in this course.</p>
                      <p>Use the form below to add the first lecture chapter.</p>
                    </div>
                  ) : (
                    activeCourseWorkspace.lectures.map((lec, lecIdx) => {
                      const vCount = lec.videos?.length || (lec.videoUrl ? 1 : 0)
                      const pCount = lec.pdfs?.length || (lec.pdfUrl ? 1 : 0)
                      const mCount = lec.roadmaps?.length || 0
                      const qCount = lec.quiz?.length || 0

                      return (
                        <div
                          key={lec.id}
                          className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 hover:border-primary/40 transition-colors shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-muted text-foreground">
                                  #{lec.number}
                                </span>
                                <h4 className="text-sm font-black text-foreground">{lec.title}</h4>

                                {vCount > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                    🎥 {vCount} {vCount > 1 ? "Videos" : "Video"}
                                  </span>
                                )}
                                {pCount > 0 && (
                                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                    📄 {pCount} {pCount > 1 ? "PDFs" : "PDF"}
                                  </span>
                                )}
                                {mCount > 0 && (
                                  <span className="text-[10px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                                    🗺️ {mCount} Maps
                                  </span>
                                )}
                                {qCount > 0 && (
                                  <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                    ❓ {qCount} Quiz Questions
                                  </span>
                                )}
                              </div>
                              {lec.summary && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {lec.summary}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Up / Down Reorder Controls */}
                              <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-xl border border-border/70">
                                <button
                                  type="button"
                                  disabled={lecIdx === 0}
                                  onClick={() => handleMoveLecture(lecIdx, "up")}
                                  className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                                  title="Move Lecture Up (تقديم المحاضرة للأعلى)"
                                >
                                  <ChevronUp className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={lecIdx === activeCourseWorkspace.lectures.length - 1}
                                  onClick={() => handleMoveLecture(lecIdx, "down")}
                                  className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                                  title="Move Lecture Down (تأخير المحاضرة للأسفل)"
                                >
                                  <ChevronDown className="size-4" />
                                </button>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditLecture(lec)}
                                className="text-xs font-bold h-8 rounded-xl gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                              >
                                <Pencil className="size-3.5" />
                                <span>Media & Quiz Studio</span>
                              </Button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLecture(lec.id)}
                                className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
                                title="Delete Lecture"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>

                          {/* Topics & Doctor Exam Notes inside Lecture */}
                          {lec.topics && lec.topics.length > 0 && (
                            <div className="pt-3 border-t border-border/50 space-y-2">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Sub-topics & Doctor Exam Advice:
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {lec.topics.map((t) => (
                                  <div
                                    key={t.id}
                                    className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <p className="font-bold text-foreground truncate">{t.title}</p>
                                      {t.doctorNote && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                          <Sparkles className="size-3 shrink-0" />
                                          <span className="truncate">Exam Focus: {t.doctorNote}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {t.doctorNote && (
                                        <button
                                          type="button"
                                          onClick={() => handleClearDoctorNote(lec.id, t.id)}
                                          className="text-[10px] text-amber-500 hover:text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20"
                                          title="Remove Doctor's Note"
                                        >
                                          Clear Note
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingTopicId(t.id)
                                          setEditTopicTitleVal(t.title)
                                          setEditTopicNoteVal(t.doctorNote || "")
                                        }}
                                        className="text-muted-foreground hover:text-primary p-1"
                                        title="Edit Topic & Note"
                                      >
                                        <Pencil className="size-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTopic(t.id, lec.id)}
                                        className="text-muted-foreground hover:text-destructive p-1"
                                        title="Delete Topic"
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quick Edit Topic Modal / Inline Form */}
                          {editingTopicId && (
                            <div className="p-3 rounded-xl bg-card border border-primary/30 space-y-2">
                              <span className="text-xs font-bold text-foreground">
                                Edit Topic & Exam Focus Advice:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input
                                  value={editTopicTitleVal}
                                  onChange={(e) => setEditTopicTitleVal(e.target.value)}
                                  placeholder="Topic Title..."
                                  className="text-xs bg-muted/20 h-8"
                                />
                                <Input
                                  value={editTopicNoteVal}
                                  onChange={(e) => setEditTopicNoteVal(e.target.value)}
                                  placeholder="Doctor's Exam Focus (Leave blank to remove note)..."
                                  className="text-xs bg-muted/20 h-8"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingTopicId(null)}
                                  className="text-xs h-7"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleSaveTopicEdit(lec.id, editingTopicId)}
                                  className="text-xs font-bold h-7"
                                >
                                  Save Topic Changes
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Add Lecture Form */}
                <div className="p-6 rounded-3xl border border-border bg-card space-y-4 shadow-xs">
                  <div>
                    <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                      <PlusCircle className="size-4 text-primary" />
                      <span>Add New Lecture to {activeCourseWorkspace.code}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Embed YouTube stream link and direct PDF slides URL for immediate access.
                    </p>
                  </div>

                  <form onSubmit={handleAddLecture} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={newLectureTitle}
                        onChange={(e) => setNewLectureTitle(e.target.value)}
                        placeholder="Lecture Title (e.g. Asymptotic Complexity & Big-O)..."
                        required
                        className="text-xs bg-muted/20 h-10 rounded-xl"
                      />
                      <Input
                        value={newLectureSummary}
                        onChange={(e) => setNewLectureSummary(e.target.value)}
                        placeholder="Lecture Summary and Learning Objectives..."
                        className="text-xs bg-muted/20 h-10 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        value={newLectureVideoUrl}
                        onChange={(e) => setNewLectureVideoUrl(e.target.value)}
                        placeholder="Video Stream URL (YouTube or Vimeo link)..."
                        className="text-xs bg-muted/20 h-10 rounded-xl font-mono"
                      />
                      <Input
                        value={newLecturePdfUrl}
                        onChange={(e) => setNewLecturePdfUrl(e.target.value)}
                        placeholder="PDF Slides URL (Cloud Storage or direct link)..."
                        className="text-xs bg-muted/20 h-10 rounded-xl font-mono"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                      <Input
                        value={newLecturePdfName}
                        onChange={(e) => setNewLecturePdfName(e.target.value)}
                        placeholder="PDF Label (e.g. Official Lecture Slides 01.pdf)..."
                        className="text-xs bg-muted/20 h-10 rounded-xl max-w-sm"
                      />
                      <Button type="submit" className="text-xs font-black h-10 px-6 rounded-xl shadow-xs">
                        Publish Lecture Chapter
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Add Topic / Exam Note Form */}
                {activeCourseWorkspace.lectures.length > 0 && (
                  <div className="p-6 rounded-3xl border border-border bg-card space-y-3 shadow-xs">
                    <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                      <Sparkles className="size-4 text-violet-500" />
                      <span>Attach Topic & Doctor Exam Focus Note</span>
                    </h4>
                    <form onSubmit={handleAddTopic} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <select
                          value={selectedLectureForTopic}
                          onChange={(e) => setSelectedLectureForTopic(e.target.value)}
                          required
                          className="h-10 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="">Select Target Lecture...</option>
                          {activeCourseWorkspace.lectures.map((l) => (
                            <option key={l.id} value={l.id} className="bg-card">
                              Lecture {l.number}: {l.title}
                            </option>
                          ))}
                        </select>

                        <Input
                          value={newTopicTitle}
                          onChange={(e) => setNewTopicTitle(e.target.value)}
                          placeholder="Topic Title (e.g. Singly vs Doubly Linked Lists)..."
                          required
                          className="text-xs bg-muted/20 h-10 rounded-xl"
                        />

                        <Input
                          value={newTopicDoctorNote}
                          onChange={(e) => setNewTopicDoctorNote(e.target.value)}
                          placeholder="Doctor Note (e.g. Guaranteed Exam Problem)..."
                          className="text-xs bg-muted/20 h-10 rounded-xl"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" size="sm" className="text-xs font-bold rounded-xl px-5">
                          Add Topic & Exam Advice
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* NORMAL DASHBOARD VIEWS */
            /* ========================================================================= */
            <>
              {/* Welcome Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    Welcome back, {adminEmail.split("@")[0]}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                    Overview of academic curriculum, student enrolments, and real-time database assets.
                  </p>
                </div>
              </div>

              {/* 4 KPI Metric Cards (Like Adminator Screenshot) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-primary/20 bg-card space-y-2 shadow-xs transition-all hover:border-primary/40">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold">Active Courses</span>
                    <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <BookOpen className="size-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-foreground">{coursesList.length}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-semibold pt-1 border-t border-border/40">
                    <TrendingUp className="size-3" />
                    <span>4 Academic Levels</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-sky-500/20 bg-card space-y-2 shadow-xs transition-all hover:border-sky-500/40">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold">Total Lectures</span>
                    <div className="size-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                      <Layers className="size-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-foreground">{totalLecturesCount}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-sky-500 font-semibold pt-1 border-t border-border/40">
                    <Video className="size-3" />
                    <span>{totalVideosCount} Video Streams</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-amber-500/20 bg-card space-y-2 shadow-xs transition-all hover:border-amber-500/40">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold">Attached Resources</span>
                    <div className="size-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <FileText className="size-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-foreground">
                    {resourcesList.length + totalPdfsCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-500 font-semibold pt-1 border-t border-border/40">
                    <span>PDFs & Slides Attached</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-violet-500/20 bg-card space-y-2 shadow-xs transition-all hover:border-violet-500/40">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-bold">Exam Focus Points</span>
                    <div className="size-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                      <Sparkles className="size-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-foreground">{totalTopicsCount}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-violet-500 font-semibold pt-1 border-t border-border/40">
                    <span>Recorded Doctor Tips</span>
                  </div>
                </div>
              </div>

              {/* VIEW: DASHBOARD OVERVIEW */}
              {currentView === "overview" && (
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl border border-border bg-card space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-foreground">Curriculum Coverage</h3>
                      <span className="text-xs text-muted-foreground">4 Academic Years</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {ACADEMIC_YEARS.map((y) => {
                        const count = coursesList.filter((c) => c.level === y.level).length
                        return (
                          <div
                            key={y.level}
                            className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">Level {y.level}</span>
                              <span className="font-mono text-xs font-black text-primary">
                                {count} Courses
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, count * 20)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{y.name}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: COURSES & CURRICULUM (VISUAL CARD GRID WITH IMAGES) */}
              {(currentView === "courses" || currentView === "overview") && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Level Pills Filter */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-muted-foreground me-1">Filter Level:</span>
                      <button
                        type="button"
                        onClick={() => setFilterYear("all")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          filterYear === "all"
                            ? "bg-primary text-primary-foreground font-black shadow-xs"
                            : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        All ({coursesList.length})
                      </button>

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
                          Level {y.level} (
                          {coursesList.filter((c) => c.level === y.level).length})
                        </button>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground font-semibold">
                      Showing {filteredCourses.length} of {coursesList.length} Courses
                    </div>
                  </div>

                  {/* Visual Course Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredCourses.map((course) => {
                      const parsed = parseCourseTitle(course.title)
                      const totalLecs = course.lectures.length
                      const totalVids = course.lectures.reduce(
                        (acc, l) => acc + (l.videos?.length || (l.videoUrl ? 1 : 0)),
                        0
                      )
                      const totalPdfs = course.lectures.reduce(
                        (acc, l) => acc + (l.pdfs?.length || (l.pdfUrl ? 1 : 0)),
                        0
                      )

                      return (
                        <div
                          key={course.id}
                          className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between group"
                        >
                          <div>
                            {/* Course Cover Image */}
                            <div className="h-40 w-full relative overflow-hidden bg-muted">
                              <Image
                                src={
                                  course.imageUrl ||
                                  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80"
                                }
                                alt={course.title}
                                fill
                                unoptimized
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

                              {/* Badges on image */}
                              <div className="absolute top-3 start-3 flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-primary text-primary-foreground shadow-sm">
                                  {course.code}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-card/90 backdrop-blur-md border border-border">
                                  Level {course.level}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-card/90 backdrop-blur-md border border-border">
                                  Term {course.semester}
                                </span>
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-5 space-y-3">
                              <div className="space-y-1">
                                <h4 className="text-base font-black text-foreground line-clamp-1">
                                  {parsed.ar}
                                </h4>
                                {parsed.en && (
                                  <p className="text-xs font-mono text-muted-foreground line-clamp-1">
                                    {parsed.en}
                                  </p>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {course.description}
                              </p>

                              {/* Metrics Row */}
                              <div className="pt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Layers className="size-3.5 text-primary" />
                                  <strong className="text-foreground">{totalLecs}</strong> Lecs
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Video className="size-3.5 text-sky-500" />
                                  <strong className="text-foreground">{totalVids}</strong> Vids
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <FileText className="size-3.5 text-amber-500" />
                                  <strong className="text-foreground">{totalPdfs}</strong> PDFs
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Footer */}
                          <div className="p-5 pt-0 border-t border-border/50 flex items-center justify-between gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => setActiveCourseWorkspace(course)}
                              className="w-full font-black text-xs gap-1.5 h-9 rounded-xl shadow-xs"
                            >
                              <Layers className="size-3.5" />
                              <span>Enter Course ({totalLecs})</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(course)}
                              className="text-xs h-9 px-2.5 rounded-xl"
                              title="Edit Course Information"
                            >
                              <Pencil className="size-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCourse(course.id)}
                              className="text-xs text-destructive hover:bg-destructive/10 h-9 px-2.5 rounded-xl"
                              title="Delete Course"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* VIEW: ACADEMIC REPOSITORY */}
              {currentView === "resources" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Upload Form */}
                  <div className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 space-y-5 shadow-xs">
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-foreground flex items-center gap-2">
                        <Upload className="size-4 text-primary" />
                        <span>Upload Academic Material</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Attach PDFs, lecture slides, video playlists, or concept diagrams to any course.
                      </p>
                    </div>

                    <form onSubmit={handleAddResource} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Target Course:</label>
                        <select
                          value={resCourseId}
                          onChange={(e) => setResCourseId(e.target.value)}
                          className="w-full h-10 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground cursor-pointer"
                        >
                          {coursesList.map((c) => (
                            <option key={c.id} value={c.id} className="bg-card">
                              {c.code} - {c.title} (Level {c.level})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Resource Type:</label>
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => setResType("pdf")}
                            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer ${
                              resType === "pdf"
                                ? "bg-amber-500/10 border-amber-500 text-amber-500"
                                : "bg-muted/20 border-border text-muted-foreground"
                            }`}
                          >
                            <FileText className="size-4" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setResType("video")}
                            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer ${
                              resType === "video"
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                : "bg-muted/20 border-border text-muted-foreground"
                            }`}
                          >
                            <Video className="size-4" />
                            <span>Video</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setResType("roadmap")}
                            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer ${
                              resType === "roadmap"
                                ? "bg-cyan-500/10 border-cyan-500 text-cyan-500"
                                : "bg-muted/20 border-border text-muted-foreground"
                            }`}
                          >
                            <Workflow className="size-4" />
                            <span>Map</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setResType("link")}
                            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer ${
                              resType === "link"
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-muted/20 border-border text-muted-foreground"
                            }`}
                          >
                            <LinkIcon className="size-4" />
                            <span>Link</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Title / Display Label:</label>
                        <Input
                          value={resTitle}
                          onChange={(e) => setResTitle(e.target.value)}
                          placeholder="e.g. Chapter 4 Binary Search Slides.pdf"
                          required
                          className="text-xs bg-muted/20 h-10 rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">URL / File Path:</label>
                        <Input
                          value={resUrl}
                          onChange={(e) => setResUrl(e.target.value)}
                          placeholder="https://... or cloud storage file link"
                          required
                          className="text-xs bg-muted/20 h-10 rounded-xl font-mono"
                        />
                      </div>

                      <Button type="submit" className="w-full font-black text-xs h-10 rounded-xl shadow-xs">
                        Publish to Student Portal
                      </Button>
                    </form>
                  </div>

                  {/* Right: Repository List */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-foreground">
                        Active Assets Library ({resourcesList.length})
                      </h3>
                    </div>

                    <div className="space-y-2.5">
                      {resourcesList.map((res) => {
                        const course = coursesList.find((c) => c.id === res.courseId)
                        return (
                          <div
                            key={res.id}
                            className="p-4 rounded-2xl border border-border bg-card flex items-start justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                {res.type === "pdf" ? (
                                  <FileText className="size-4 text-amber-500" />
                                ) : res.type === "video" ? (
                                  <Video className="size-4 text-emerald-500" />
                                ) : res.type === "roadmap" ? (
                                  <Workflow className="size-4 text-cyan-500" />
                                ) : (
                                  <LinkIcon className="size-4 text-primary" />
                                )}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <h4 className="text-xs font-bold text-foreground truncate">{res.title}</h4>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {course ? `${course.code} - ${course.title}` : "General"} • {res.date}
                                </p>
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-mono pt-0.5"
                                >
                                  <span>Open Link</span>
                                  <ExternalLink className="size-3" />
                                </a>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteResource(res.id)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: MEMBERS & STUDENTS */}
              {currentView === "members" && (
                <AdminMembersTab
                  onDirectNotifyMember={(member) => {
                    setPreselectedNotifyMember(member)
                    setCurrentView("announcements")
                  }}
                  onStatusMessage={(msg) => {
                    setSavedStatus(msg)
                    setTimeout(() => setSavedStatus(null), 3500)
                  }}
                />
              )}

              {/* VIEW: ANNOUNCEMENTS & BROADCAST */}
              {currentView === "announcements" && (
                <AdminNotificationsTab
                  initialTargetMember={preselectedNotifyMember}
                  onClearInitialTargetMember={() => setPreselectedNotifyMember(null)}
                  onStatusMessage={(msg) => {
                    setSavedStatus(msg)
                    setTimeout(() => setSavedStatus(null), 3500)
                  }}
                />
              )}

              {/* VIEW: SUBSCRIPTIONS & PAYMENTS */}
              {currentView === "subscriptions" && (
                <AdminSubscriptionsTab
                  onStatusMessage={(msg) => {
                    setSavedStatus(msg)
                    setTimeout(() => setSavedStatus(null), 3500)
                  }}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT COURSE WITH IMAGE URL */}
      {/* ========================================================================= */}
      <CourseEditorModal
        isOpen={Boolean(editingCourse || isAddCourseModalOpen)}
        editingCourse={editingCourse}
        onClose={() => {
          setEditingCourse(null)
          setIsAddCourseModalOpen(false)
        }}
        onSave={handleSaveCourse}
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formCode={formCode}
        setFormCode={setFormCode}
        formDesc={formDesc}
        setFormDesc={setFormDesc}
        formLevel={formLevel}
        setFormLevel={setFormLevel}
        formSemester={formSemester}
        setFormSemester={setFormSemester}
        formStudyPlanDays={formStudyPlanDays}
        setFormStudyPlanDays={setFormStudyPlanDays}
        formImageUrl={formImageUrl}
        setFormImageUrl={setFormImageUrl}
        coverFileInputRef={coverFileInputRef}
        isUploadingCover={isUploadingCover}
        onUploadCoverFile={handleUploadCoverFile}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: ADVANCED LECTURE MEDIA & QUIZ STUDIO */}
      {/* ========================================================================= */}
      <LectureStudioModal
        lecture={editingLecture}
        onClose={() => setEditingLecture(null)}
        onSave={handleSaveEditLecture}
      />
    </div>
  )
}
