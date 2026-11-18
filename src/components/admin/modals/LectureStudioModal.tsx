"use client"

import * as React from "react"
import {
  Pencil,
  X,
  Play,
  FileText,
  Workflow,
  Video,
  Trash2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  LectureChapter,
  VideoItem,
  PdfItem,
  RoadmapItem,
  QuizQuestion,
  SubChapterItem,
} from "@/data/coursesData"

function cleanText(input: unknown): string {
  if (typeof input !== "string") return ""
  return input.replace(/\0/g, "").trim()
}

export interface LectureStudioModalProps {
  lecture: LectureChapter | null
  onClose: () => void
  onSave: (updatedLecture: LectureChapter) => void
}

export function LectureStudioModal({
  lecture,
  onClose,
  onSave,
}: LectureStudioModalProps) {
  const [lectureStudioTab, setLectureStudioTab] = React.useState<
    "info" | "videos" | "pdfs" | "roadmaps" | "subchapters" | "quiz"
  >("info")

  const [editLectureTitle, setEditLectureTitle] = React.useState("")
  const [editLectureSummary, setEditLectureSummary] = React.useState("")
  const [editLectureVideos, setEditLectureVideos] = React.useState<VideoItem[]>([])
  const [editLecturePdfs, setEditLecturePdfs] = React.useState<PdfItem[]>([])
  const [editLectureRoadmaps, setEditLectureRoadmaps] = React.useState<RoadmapItem[]>([])
  const [editLectureQuiz, setEditLectureQuiz] = React.useState<QuizQuestion[]>([])
  const [editLectureSubChapters, setEditLectureSubChapters] = React.useState<SubChapterItem[]>([])

  // SubChapter states
  const [editingSubChapterId, setEditingSubChapterId] = React.useState<string | null>(null)
  const [subChapterFormTitle, setSubChapterFormTitle] = React.useState("")
  const [subChapterFormSummary, setSubChapterFormSummary] = React.useState("")
  const [subChapterFormVideoUrl, setSubChapterFormVideoUrl] = React.useState("")
  const [subChapterFormPdfUrl, setSubChapterFormPdfUrl] = React.useState("")
  const [subChapterFormPdfName, setSubChapterFormPdfName] = React.useState("")

  // Quiz Editor states
  const [editingQuizIndex, setEditingQuizIndex] = React.useState<number | null>(null)
  const [quizFormQuestion, setQuizFormQuestion] = React.useState("")
  const [quizFormOpt0, setQuizFormOpt0] = React.useState("")
  const [quizFormOpt1, setQuizFormOpt1] = React.useState("")
  const [quizFormOpt2, setQuizFormOpt2] = React.useState("")
  const [quizFormOpt3, setQuizFormOpt3] = React.useState("")
  const [quizFormCorrectIdx, setQuizFormCorrectIdx] = React.useState("0")
  const [quizFormExplanation, setQuizFormExplanation] = React.useState("")

  // Sub-inputs for media
  const [newSubVideoTitle, setNewSubVideoTitle] = React.useState("")
  const [newSubVideoUrl, setNewSubVideoUrl] = React.useState("")
  const [newSubPdfTitle, setNewSubPdfTitle] = React.useState("")
  const [newSubPdfUrl, setNewSubPdfUrl] = React.useState("")
  const [newSubMapTitle, setNewSubMapTitle] = React.useState("")
  const [newSubMapUrl, setNewSubMapUrl] = React.useState("")
  const [newSubMapDesc, setNewSubMapDesc] = React.useState("")

  // Editing individual items
  const [editingVideoId, setEditingVideoId] = React.useState<string | null>(null)
  const [editingPdfId, setEditingPdfId] = React.useState<string | null>(null)
  const [editingRoadmapId, setEditingRoadmapId] = React.useState<string | null>(null)

  // Initialize state when lecture changes
  React.useEffect(() => {
    if (!lecture) return

    setLectureStudioTab("info")
    setEditLectureTitle(lecture.title)
    setEditLectureSummary(lecture.summary || "")

    const initialVideos: VideoItem[] =
      lecture.videos && lecture.videos.length > 0
        ? [...lecture.videos]
        : lecture.videoUrl
        ? [{ id: `v-${Date.now()}`, title: "Primary Lecture Video", url: lecture.videoUrl, source: "YouTube" }]
        : []

    const initialPdfs: PdfItem[] =
      lecture.pdfs && lecture.pdfs.length > 0
        ? [...lecture.pdfs]
        : lecture.pdfUrl
        ? [{ id: `pdf-${Date.now()}`, title: lecture.pdfName || "Lecture Slides", url: lecture.pdfUrl, size: "PDF" }]
        : []

    setEditLectureVideos(initialVideos)
    setEditLecturePdfs(initialPdfs)
    setEditLectureRoadmaps(lecture.roadmaps ? [...lecture.roadmaps] : [])
    setEditLectureQuiz(lecture.quiz ? [...lecture.quiz] : [])
    setEditLectureSubChapters(lecture.subChapters ? [...lecture.subChapters] : [])

    // Reset sub-forms
    setEditingSubChapterId(null)
    setSubChapterFormTitle("")
    setSubChapterFormSummary("")
    setSubChapterFormVideoUrl("")
    setSubChapterFormPdfUrl("")
    setSubChapterFormPdfName("")
    setNewSubVideoTitle("")
    setNewSubVideoUrl("")
    setNewSubPdfTitle("")
    setNewSubPdfUrl("")
    setNewSubMapTitle("")
    setNewSubMapUrl("")
    setNewSubMapDesc("")
    setEditingVideoId(null)
    setEditingPdfId(null)
    setEditingRoadmapId(null)
    setEditingQuizIndex(null)
    setQuizFormQuestion("")
    setQuizFormOpt0("")
    setQuizFormOpt1("")
    setQuizFormOpt2("")
    setQuizFormOpt3("")
    setQuizFormCorrectIdx("0")
    setQuizFormExplanation("")
  }, [lecture])

  if (!lecture) return null

  // Video Handlers
  const handleStartEditVideo = (v: VideoItem) => {
    setEditingVideoId(v.id)
    setNewSubVideoTitle(v.title)
    setNewSubVideoUrl(v.url)
  }

  const handleCancelEditVideo = () => {
    setEditingVideoId(null)
    setNewSubVideoTitle("")
    setNewSubVideoUrl("")
  }

  const handleAddVideoToEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubVideoTitle.trim() || !newSubVideoUrl.trim()) return

    if (editingVideoId) {
      setEditLectureVideos((prev) =>
        prev.map((v) =>
          v.id === editingVideoId
            ? { ...v, title: cleanText(newSubVideoTitle), url: cleanText(newSubVideoUrl) }
            : v
        )
      )
      setEditingVideoId(null)
    } else {
      const newV: VideoItem = {
        id: `v-${Date.now()}`,
        title: cleanText(newSubVideoTitle),
        url: cleanText(newSubVideoUrl),
        source: "YouTube",
        duration: "Recorded Stream",
      }
      setEditLectureVideos((prev) => [...prev, newV])
    }
    setNewSubVideoTitle("")
    setNewSubVideoUrl("")
  }

  const handleDeleteVideoFromEdit = (vidId: string) => {
    if (editingVideoId === vidId) handleCancelEditVideo()
    setEditLectureVideos((prev) => prev.filter((v) => v.id !== vidId))
  }

  const handleMoveVideoInEdit = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= editLectureVideos.length) return
    const updated = [...editLectureVideos]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setEditLectureVideos(updated)
  }

  // PDF Handlers
  const handleStartEditPdf = (p: PdfItem) => {
    setEditingPdfId(p.id)
    setNewSubPdfTitle(p.title)
    setNewSubPdfUrl(p.url)
  }

  const handleCancelEditPdf = () => {
    setEditingPdfId(null)
    setNewSubPdfTitle("")
    setNewSubPdfUrl("")
  }

  const handleAddPdfToEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubPdfTitle.trim() || !newSubPdfUrl.trim()) return

    if (editingPdfId) {
      setEditLecturePdfs((prev) =>
        prev.map((p) =>
          p.id === editingPdfId
            ? { ...p, title: cleanText(newSubPdfTitle), url: cleanText(newSubPdfUrl) }
            : p
        )
      )
      setEditingPdfId(null)
    } else {
      const newP: PdfItem = {
        id: `pdf-${Date.now()}`,
        title: cleanText(newSubPdfTitle),
        url: cleanText(newSubPdfUrl),
        size: "PDF",
      }
      setEditLecturePdfs((prev) => [...prev, newP])
    }
    setNewSubPdfTitle("")
    setNewSubPdfUrl("")
  }

  const handleDeletePdfFromEdit = (pdfId: string) => {
    if (editingPdfId === pdfId) handleCancelEditPdf()
    setEditLecturePdfs((prev) => prev.filter((p) => p.id !== pdfId))
  }

  const handleMovePdfInEdit = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= editLecturePdfs.length) return
    const updated = [...editLecturePdfs]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setEditLecturePdfs(updated)
  }

  // Roadmap Handlers
  const handleStartEditRoadmap = (m: RoadmapItem) => {
    setEditingRoadmapId(m.id)
    setNewSubMapTitle(m.title)
    setNewSubMapUrl(m.imageUrl)
    setNewSubMapDesc(m.description || "")
  }

  const handleCancelEditRoadmap = () => {
    setEditingRoadmapId(null)
    setNewSubMapTitle("")
    setNewSubMapUrl("")
    setNewSubMapDesc("")
  }

  const handleAddRoadmapToEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubMapTitle.trim() || !newSubMapUrl.trim()) return

    if (editingRoadmapId) {
      setEditLectureRoadmaps((prev) =>
        prev.map((m) =>
          m.id === editingRoadmapId
            ? {
                ...m,
                title: cleanText(newSubMapTitle),
                imageUrl: cleanText(newSubMapUrl),
                description: newSubMapDesc ? cleanText(newSubMapDesc) : undefined,
              }
            : m
        )
      )
      setEditingRoadmapId(null)
    } else {
      const newM: RoadmapItem = {
        id: `map-${Date.now()}`,
        title: cleanText(newSubMapTitle),
        imageUrl: cleanText(newSubMapUrl),
        description: newSubMapDesc ? cleanText(newSubMapDesc) : undefined,
      }
      setEditLectureRoadmaps((prev) => [...prev, newM])
    }
    setNewSubMapTitle("")
    setNewSubMapUrl("")
    setNewSubMapDesc("")
  }

  const handleDeleteRoadmapFromEdit = (mapId: string) => {
    if (editingRoadmapId === mapId) handleCancelEditRoadmap()
    setEditLectureRoadmaps((prev) => prev.filter((m) => m.id !== mapId))
  }

  const handleMoveRoadmapInEdit = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= editLectureRoadmaps.length) return
    const updated = [...editLectureRoadmaps]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setEditLectureRoadmaps(updated)
  }

  // Quiz Question Handlers
  const handleStartEditQuizQuestion = (q: QuizQuestion, index: number) => {
    setEditingQuizIndex(index)
    setQuizFormQuestion(q.question)
    setQuizFormOpt0(q.options[0] || "")
    setQuizFormOpt1(q.options[1] || "")
    setQuizFormOpt2(q.options[2] || "")
    setQuizFormOpt3(q.options[3] || "")
    setQuizFormCorrectIdx(String(q.correctIndex || 0))
    setQuizFormExplanation(q.explanation || "")
  }

  const handleSaveQuizQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quizFormQuestion.trim() || !quizFormOpt0.trim() || !quizFormOpt1.trim()) return

    const options = [
      cleanText(quizFormOpt0),
      cleanText(quizFormOpt1),
      cleanText(quizFormOpt2 || "None of the above"),
      cleanText(quizFormOpt3 || "All of the above"),
    ]
    const parsedCorrect = parseInt(quizFormCorrectIdx, 10) || 0

    if (editingQuizIndex !== null) {
      setEditLectureQuiz((prev) =>
        prev.map((q, idx) =>
          idx === editingQuizIndex
            ? {
                ...q,
                question: cleanText(quizFormQuestion),
                options,
                correctIndex: parsedCorrect,
                explanation: quizFormExplanation ? cleanText(quizFormExplanation) : undefined,
              }
            : q
        )
      )
      setEditingQuizIndex(null)
    } else {
      const newQ: QuizQuestion = {
        id: `q-${Date.now()}`,
        question: cleanText(quizFormQuestion),
        options,
        correctIndex: parsedCorrect,
        explanation: quizFormExplanation ? cleanText(quizFormExplanation) : undefined,
      }
      setEditLectureQuiz((prev) => [...prev, newQ])
    }

    setQuizFormQuestion("")
    setQuizFormOpt0("")
    setQuizFormOpt1("")
    setQuizFormOpt2("")
    setQuizFormOpt3("")
    setQuizFormCorrectIdx("0")
    setQuizFormExplanation("")
  }

  const handleDeleteQuizQuestion = (qId: string | number) => {
    setEditLectureQuiz((prev) => prev.filter((q) => q.id !== qId))
  }

  const handleMoveQuizQuestion = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= editLectureQuiz.length) return
    const updated = [...editLectureQuiz]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setEditLectureQuiz(updated)
  }

  // SubChapter Handlers
  const handleStartEditSubChapter = (sub: SubChapterItem) => {
    setEditingSubChapterId(sub.id)
    setSubChapterFormTitle(sub.title)
    setSubChapterFormSummary(sub.summary || "")
    setSubChapterFormVideoUrl(sub.videoUrl || "")
    setSubChapterFormPdfUrl(sub.pdfUrl || "")
    setSubChapterFormPdfName(sub.pdfName || "")
  }

  const handleCancelEditSubChapter = () => {
    setEditingSubChapterId(null)
    setSubChapterFormTitle("")
    setSubChapterFormSummary("")
    setSubChapterFormVideoUrl("")
    setSubChapterFormPdfUrl("")
    setSubChapterFormPdfName("")
  }

  const handleSaveSubChapter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subChapterFormTitle.trim()) return

    if (editingSubChapterId) {
      setEditLectureSubChapters((prev) =>
        prev.map((s) =>
          s.id === editingSubChapterId
            ? {
                ...s,
                title: cleanText(subChapterFormTitle),
                summary: subChapterFormSummary ? cleanText(subChapterFormSummary) : undefined,
                videoUrl: subChapterFormVideoUrl ? cleanText(subChapterFormVideoUrl) : undefined,
                pdfUrl: subChapterFormPdfUrl ? cleanText(subChapterFormPdfUrl) : undefined,
                pdfName: subChapterFormPdfName ? cleanText(subChapterFormPdfName) : undefined,
              }
            : s
        )
      )
      setEditingSubChapterId(null)
    } else {
      const newSub: SubChapterItem = {
        id: `sub-${Date.now()}`,
        title: cleanText(subChapterFormTitle),
        summary: subChapterFormSummary ? cleanText(subChapterFormSummary) : undefined,
        videoUrl: subChapterFormVideoUrl ? cleanText(subChapterFormVideoUrl) : undefined,
        pdfUrl: subChapterFormPdfUrl ? cleanText(subChapterFormPdfUrl) : undefined,
        pdfName: subChapterFormPdfName ? cleanText(subChapterFormPdfName) : undefined,
        order: editLectureSubChapters.length + 1,
      }
      setEditLectureSubChapters((prev) => [...prev, newSub])
    }
    setSubChapterFormTitle("")
    setSubChapterFormSummary("")
    setSubChapterFormVideoUrl("")
    setSubChapterFormPdfUrl("")
    setSubChapterFormPdfName("")
  }

  const handleDeleteSubChapter = (subId: string) => {
    if (editingSubChapterId === subId) handleCancelEditSubChapter()
    setEditLectureSubChapters((prev) => prev.filter((s) => s.id !== subId))
  }

  const handleMoveSubChapter = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= editLectureSubChapters.length) return
    const updated = [...editLectureSubChapters]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setEditLectureSubChapters(updated.map((s, idx) => ({ ...s, order: idx + 1 })))
  }

  // Final submit handler for the entire lecture
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editLectureTitle.trim()) return

    const sanitizedTitle = cleanText(editLectureTitle)
    const sanitizedSummary = cleanText(editLectureSummary)

    const updated: LectureChapter = {
      ...lecture,
      title: sanitizedTitle,
      summary: sanitizedSummary,
      videoUrl: editLectureVideos[0]?.url || undefined,
      pdfUrl: editLecturePdfs[0]?.url || undefined,
      pdfName: editLecturePdfs[0]?.title || undefined,
      videos: editLectureVideos,
      pdfs: editLecturePdfs,
      roadmaps: editLectureRoadmaps,
      quiz: editLectureQuiz,
      subChapters: editLectureSubChapters,
    }

    onSave(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in-50">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 end-5 text-muted-foreground hover:text-foreground p-1 rounded-lg"
        >
          <X className="size-5" />
        </button>

        {/* Studio Header */}
        <div className="space-y-1">
          <h3 className="text-lg font-black text-foreground flex items-center gap-2">
            <Pencil className="size-4.5 text-primary" />
            <span>Lecture Studio #{lecture.number}</span>
          </h3>
          <p className="text-xs text-muted-foreground font-semibold">{lecture.title}</p>
        </div>

        {/* Studio Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/30 border border-border/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setLectureStudioTab("info")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              lectureStudioTab === "info"
                ? "bg-primary text-primary-foreground font-black shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Outline & Info
          </button>

          <button
            type="button"
            onClick={() => setLectureStudioTab("videos")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              lectureStudioTab === "videos"
                ? "bg-primary text-primary-foreground font-black shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>🎥 Videos</span>
            <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-white">
              {editLectureVideos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLectureStudioTab("pdfs")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              lectureStudioTab === "pdfs"
                ? "bg-primary text-primary-foreground font-black shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>📄 PDF Slides</span>
            <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-white">
              {editLecturePdfs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLectureStudioTab("roadmaps")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              lectureStudioTab === "roadmaps"
                ? "bg-primary text-primary-foreground font-black shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>🗺️ Maps</span>
            <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-white">
              {editLectureRoadmaps.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLectureStudioTab("subchapters")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              lectureStudioTab === "subchapters"
                ? "bg-primary text-primary-foreground font-black shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>📑 Sub-Chapters (شباتر)</span>
            <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-white">
              {editLectureSubChapters.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLectureStudioTab("quiz")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              lectureStudioTab === "quiz"
                ? "bg-primary text-primary-foreground font-black shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>❓ Interactive Quiz</span>
            <span className="text-[10px] font-mono px-1 rounded bg-black/20 text-white">
              {editLectureQuiz.length}
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Studio Tab: Outline & Info */}
          {lectureStudioTab === "info" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Lecture Title:</label>
                <Input
                  value={editLectureTitle}
                  onChange={(e) => setEditLectureTitle(e.target.value)}
                  placeholder="Lecture Title..."
                  required
                  className="text-xs bg-muted/20 h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Lecture Summary:</label>
                <textarea
                  value={editLectureSummary}
                  onChange={(e) => setEditLectureSummary(e.target.value)}
                  placeholder="Lecture summary and objectives..."
                  rows={4}
                  className="w-full rounded-xl border border-input bg-muted/20 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Studio Tab: Videos */}
          {lectureStudioTab === "videos" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="space-y-2">
                <h5 className="text-xs font-black text-foreground">
                  Attached Video Streams ({editLectureVideos.length}):
                </h5>
                {editLectureVideos.map((v, vIdx) => (
                  <div
                    key={v.id}
                    className={`p-3 rounded-xl bg-card border flex items-center justify-between text-xs gap-3 transition-colors ${
                      editingVideoId === v.id
                        ? "border-primary ring-1 ring-primary/40 bg-primary/5"
                        : "border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        #{vIdx + 1}
                      </span>
                      <Play className="size-3.5 text-primary shrink-0" />
                      <span className="font-bold text-foreground truncate">{v.title}</span>
                      <span className="text-[11px] text-muted-foreground truncate font-mono">
                        ({v.url})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/70">
                        <button
                          type="button"
                          disabled={vIdx === 0}
                          onClick={() => handleMoveVideoInEdit(vIdx, "up")}
                          className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move video up"
                        >
                          <ChevronUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          disabled={vIdx === editLectureVideos.length - 1}
                          onClick={() => handleMoveVideoInEdit(vIdx, "down")}
                          className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move video down"
                        >
                          <ChevronDown className="size-3" />
                        </button>
                      </div>

                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-500 hover:text-sky-400 p-1 hover:bg-sky-500/10 rounded-md transition-colors"
                        title="Open / Preview video stream"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleStartEditVideo(v)}
                        className="text-muted-foreground hover:text-primary p-1 hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                        title="Edit video title & URL"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVideoFromEdit(v.id)}
                        className="text-muted-foreground hover:text-destructive p-1 hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                        title="Delete video"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add / Edit Video Form */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {editingVideoId ? "✏️ Edit Video Stream:" : "Add New Video Stream:"}
                  </span>
                  {editingVideoId && (
                    <button
                      type="button"
                      onClick={handleCancelEditVideo}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={newSubVideoTitle}
                    onChange={(e) => setNewSubVideoTitle(e.target.value)}
                    placeholder="Video Title (e.g. Lab 2: Code Tracing)..."
                    className="text-xs bg-card h-9"
                  />
                  <Input
                    value={newSubVideoUrl}
                    onChange={(e) => setNewSubVideoUrl(e.target.value)}
                    placeholder="YouTube URL..."
                    className="text-xs bg-card h-9 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {editingVideoId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditVideo}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddVideoToEdit}
                    disabled={!newSubVideoTitle.trim() || !newSubVideoUrl.trim()}
                    className="text-xs font-bold h-8 cursor-pointer"
                  >
                    {editingVideoId ? "Save Changes" : "+ Add Video"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Studio Tab: PDFs */}
          {lectureStudioTab === "pdfs" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="space-y-2">
                <h5 className="text-xs font-black text-foreground">
                  Attached PDF Slides & Sheets ({editLecturePdfs.length}):
                </h5>
                {editLecturePdfs.map((p, pIdx) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl bg-card border flex items-center justify-between text-xs gap-3 transition-colors ${
                      editingPdfId === p.id
                        ? "border-amber-500 ring-1 ring-amber-500/40 bg-amber-500/5"
                        : "border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        #{pIdx + 1}
                      </span>
                      <FileText className="size-3.5 text-amber-500 shrink-0" />
                      <span className="font-bold text-foreground truncate">{p.title}</span>
                      <span className="text-[11px] text-muted-foreground truncate font-mono">
                        ({p.url})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/70">
                        <button
                          type="button"
                          disabled={pIdx === 0}
                          onClick={() => handleMovePdfInEdit(pIdx, "up")}
                          className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move PDF up"
                        >
                          <ChevronUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          disabled={pIdx === editLecturePdfs.length - 1}
                          onClick={() => handleMovePdfInEdit(pIdx, "down")}
                          className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move PDF down"
                        >
                          <ChevronDown className="size-3" />
                        </button>
                      </div>

                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-500 hover:text-amber-400 p-1 hover:bg-amber-500/10 rounded-md transition-colors"
                        title="Open / Preview PDF"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleStartEditPdf(p)}
                        className="text-muted-foreground hover:text-amber-500 p-1 hover:bg-amber-500/10 rounded-md transition-colors cursor-pointer"
                        title="Edit PDF title & URL"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePdfFromEdit(p.id)}
                        className="text-muted-foreground hover:text-destructive p-1 hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                        title="Delete PDF"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add / Edit PDF Form */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {editingPdfId ? "✏️ Edit PDF Slides:" : "Attach PDF Slides:"}
                  </span>
                  {editingPdfId && (
                    <button
                      type="button"
                      onClick={handleCancelEditPdf}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={newSubPdfTitle}
                    onChange={(e) => setNewSubPdfTitle(e.target.value)}
                    placeholder="File Label (e.g. Official Lecture Slides 01.pdf)..."
                    className="text-xs bg-card h-9"
                  />
                  <Input
                    value={newSubPdfUrl}
                    onChange={(e) => setNewSubPdfUrl(e.target.value)}
                    placeholder="Direct PDF URL (OneDrive, Google Drive, direct link)..."
                    className="text-xs bg-card h-9 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {editingPdfId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditPdf}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddPdfToEdit}
                    disabled={!newSubPdfTitle.trim() || !newSubPdfUrl.trim()}
                    className="text-xs font-bold h-8 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
                  >
                    {editingPdfId ? "Save Changes" : "+ Add PDF"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Studio Tab: Roadmaps */}
          {lectureStudioTab === "roadmaps" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="space-y-2">
                <h5 className="text-xs font-black text-foreground">
                  Attached Concept Maps ({editLectureRoadmaps.length}):
                </h5>
                {editLectureRoadmaps.map((m, mIdx) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl bg-card border flex items-center justify-between text-xs gap-3 transition-colors ${
                      editingRoadmapId === m.id
                        ? "border-cyan-500 ring-1 ring-cyan-500/40 bg-cyan-500/5"
                        : "border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        #{mIdx + 1}
                      </span>
                      <Workflow className="size-3.5 text-cyan-500 shrink-0" />
                      <span className="font-bold text-foreground truncate">{m.title}</span>
                      <span className="text-[11px] text-muted-foreground truncate font-mono">
                        ({m.imageUrl})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/70">
                        <button
                          type="button"
                          disabled={mIdx === 0}
                          onClick={() => handleMoveRoadmapInEdit(mIdx, "up")}
                          className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move Roadmap up"
                        >
                          <ChevronUp className="size-3" />
                        </button>
                        <button
                          type="button"
                          disabled={mIdx === editLectureRoadmaps.length - 1}
                          onClick={() => handleMoveRoadmapInEdit(mIdx, "down")}
                          className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                          title="Move Roadmap down"
                        >
                          <ChevronDown className="size-3" />
                        </button>
                      </div>

                      <a
                        href={m.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-500 hover:text-cyan-400 p-1 hover:bg-cyan-500/10 rounded-md transition-colors"
                        title="Open / Preview Roadmap"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleStartEditRoadmap(m)}
                        className="text-muted-foreground hover:text-cyan-500 p-1 hover:bg-cyan-500/10 rounded-md transition-colors cursor-pointer"
                        title="Edit Roadmap title & URL"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoadmapFromEdit(m.id)}
                        className="text-muted-foreground hover:text-destructive p-1 hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                        title="Delete Roadmap"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add / Edit Roadmap Form */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {editingRoadmapId ? "✏️ Edit Concept Roadmap:" : "Attach Concept Roadmap:"}
                  </span>
                  {editingRoadmapId && (
                    <button
                      type="button"
                      onClick={handleCancelEditRoadmap}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={newSubMapTitle}
                    onChange={(e) => setNewSubMapTitle(e.target.value)}
                    placeholder="Map Title (e.g. Memory Tree Diagram)..."
                    className="text-xs bg-card h-9"
                  />
                  <Input
                    value={newSubMapUrl}
                    onChange={(e) => setNewSubMapUrl(e.target.value)}
                    placeholder="Image / Map URL (OneDrive, Direct Image)..."
                    className="text-xs bg-card h-9 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {editingRoadmapId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditRoadmap}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddRoadmapToEdit}
                    disabled={!newSubMapTitle.trim() || !newSubMapUrl.trim()}
                    className="text-xs font-bold h-8 bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer"
                  >
                    {editingRoadmapId ? "Save Changes" : "+ Add Roadmap"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Studio Tab: Interactive Quiz */}
          {lectureStudioTab === "quiz" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="space-y-2">
                <h5 className="text-xs font-black text-foreground">
                  Quiz Question Bank ({editLectureQuiz.length} Questions):
                </h5>

                {editLectureQuiz.length === 0 ? (
                  <p className="p-4 bg-muted/20 text-xs text-muted-foreground rounded-xl text-center">
                    No quiz questions yet. Create the first multiple-choice question below.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pe-1">
                    {editLectureQuiz.map((q, qIdx) => (
                      <div
                        key={q.id || qIdx}
                        className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground">
                            {qIdx + 1}. {q.question}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/70">
                              <button
                                type="button"
                                disabled={qIdx === 0}
                                onClick={() => handleMoveQuizQuestion(qIdx, "up")}
                                className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                                title="Move question up"
                              >
                                <ChevronUp className="size-3" />
                              </button>
                              <button
                                type="button"
                                disabled={qIdx === editLectureQuiz.length - 1}
                                onClick={() => handleMoveQuizQuestion(qIdx, "down")}
                                className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
                                title="Move question down"
                              >
                                <ChevronDown className="size-3" />
                              </button>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEditQuizQuestion(q, qIdx)}
                              className="text-xs h-7 px-2 text-primary font-bold cursor-pointer"
                            >
                              Edit
                            </Button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuizQuestion(q.id)}
                              className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                              title="Delete question"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          {q.options.map((opt, optIdx) => (
                            <span
                              key={optIdx}
                              className={`p-1.5 rounded-lg px-2.5 truncate flex items-center justify-between ${
                                q.correctIndex === optIdx
                                  ? "bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30"
                                  : "text-muted-foreground bg-card border border-border/60"
                              }`}
                            >
                              <span>
                                {optIdx + 1}) {opt}
                              </span>
                              {q.correctIndex === optIdx && (
                                <Check className="size-3 text-emerald-500 shrink-0" />
                              )}
                            </span>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="text-[10px] text-muted-foreground">
                            💡 Explanation: {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add / Edit Question Form */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {editingQuizIndex !== null
                      ? `Edit Question #${editingQuizIndex + 1}:`
                      : "Add New MCQ Question:"}
                  </span>
                  {editingQuizIndex !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuizIndex(null)
                        setQuizFormQuestion("")
                        setQuizFormOpt0("")
                        setQuizFormOpt1("")
                        setQuizFormOpt2("")
                        setQuizFormOpt3("")
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <textarea
                  value={quizFormQuestion}
                  onChange={(e) => setQuizFormQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                    }
                  }}
                  placeholder='Question text (e.g. What does cout << "Hello World"; output?)'
                  rows={2}
                  className="w-full rounded-xl border border-input bg-muted/20 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={quizFormOpt0}
                    onChange={(e) => setQuizFormOpt0(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault()
                    }}
                    placeholder='Option 1 (e.g. "Hello World")...'
                    className="text-xs bg-muted/20 h-9 font-mono"
                  />
                  <Input
                    value={quizFormOpt1}
                    onChange={(e) => setQuizFormOpt1(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault()
                    }}
                    placeholder="Option 2 (e.g. O(log n))..."
                    className="text-xs bg-muted/20 h-9 font-mono"
                  />
                  <Input
                    value={quizFormOpt2}
                    onChange={(e) => setQuizFormOpt2(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault()
                    }}
                    placeholder="Option 3 (e.g. Compile Error)..."
                    className="text-xs bg-muted/20 h-9 font-mono"
                  />
                  <Input
                    value={quizFormOpt3}
                    onChange={(e) => setQuizFormOpt3(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.preventDefault()
                    }}
                    placeholder="Option 4 (e.g. None of the above)..."
                    className="text-xs bg-muted/20 h-9 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-500">
                      Select Correct Option:
                    </label>
                    <select
                      value={quizFormCorrectIdx}
                      onChange={(e) => setQuizFormCorrectIdx(e.target.value)}
                      className="w-full h-8 rounded-lg border border-input bg-muted/20 px-2 text-xs font-bold text-foreground cursor-pointer"
                    >
                      <option value="0">Option 1 is correct</option>
                      <option value="1">Option 2 is correct</option>
                      <option value="2">Option 3 is correct</option>
                      <option value="3">Option 4 is correct</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Explanation (Optional):
                    </label>
                    <Input
                      value={quizFormExplanation}
                      onChange={(e) => setQuizFormExplanation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault()
                      }}
                      placeholder='Reason why this choice is correct (e.g. Strings in C++ use "" quotes)...'
                      className="text-xs bg-muted/20 h-8"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveQuizQuestion}
                    disabled={!quizFormQuestion.trim() || !quizFormOpt0.trim() || !quizFormOpt1.trim()}
                    className="text-xs font-bold h-8 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {editingQuizIndex !== null ? "Update Question" : "+ Add Question to Quiz"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Studio Tab: Sub-Chapters */}
          {lectureStudioTab === "subchapters" && (
            <div className="space-y-4 animate-in fade-in-50">
              <div className="space-y-2">
                <h5 className="text-xs font-black text-foreground">
                  شباتر المحاضرة ({editLectureSubChapters.length}):
                </h5>
                {editLectureSubChapters.length === 0 ? (
                  <div className="p-5 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground">
                    لا توجد شباتر فرعية حتى الآن. أضف شابتر جديد من النموذج أدناه.
                  </div>
                ) : (
                  editLectureSubChapters.map((sub, sIdx) => (
                    <div
                      key={sub.id}
                      className={`p-3 rounded-xl bg-card border flex items-center justify-between text-xs gap-3 ${
                        editingSubChapterId === sub.id
                          ? "border-primary ring-1 ring-primary/40 bg-primary/5"
                          : "border-border/80"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">#{sIdx + 1}</span>
                        <div className="truncate">
                          <span className="font-bold text-foreground block truncate">{sub.title}</span>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {sub.videoUrl && <span className="text-sky-400 flex items-center gap-1"><Video className="size-2.5" /> Video</span>}
                            {sub.pdfUrl && <span className="text-emerald-400 flex items-center gap-1"><FileText className="size-2.5" /> PDF</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border/70">
                          <button type="button" disabled={sIdx === 0} onClick={() => handleMoveSubChapter(sIdx, "up")} className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none cursor-pointer" title="Move up"><ChevronUp className="size-3" /></button>
                          <button type="button" disabled={sIdx === editLectureSubChapters.length - 1} onClick={() => handleMoveSubChapter(sIdx, "down")} className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none cursor-pointer" title="Move down"><ChevronDown className="size-3" /></button>
                        </div>
                        <button type="button" onClick={() => handleStartEditSubChapter(sub)} className="text-muted-foreground hover:text-primary p-1 hover:bg-primary/10 rounded-md cursor-pointer" title="Edit"><Pencil className="size-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteSubChapter(sub.id)} className="text-muted-foreground hover:text-destructive p-1 hover:bg-destructive/10 rounded-md cursor-pointer" title="Delete"><Trash2 className="size-3.5" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {editingSubChapterId ? "✏️ تعديل الشابتر:" : "➕ إضافة شابتر جديد:"}
                  </span>
                  {editingSubChapterId && (
                    <button type="button" onClick={handleCancelEditSubChapter} className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer">إلغاء</button>
                  )}
                </div>
                <Input value={subChapterFormTitle} onChange={(e) => setSubChapterFormTitle(e.target.value)} placeholder="عنوان الشابتر..." className="text-xs bg-muted/20 h-9" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input value={subChapterFormVideoUrl} onChange={(e) => setSubChapterFormVideoUrl(e.target.value)} placeholder="رابط الفيديو (YouTube/Drive)..." className="text-xs bg-muted/20 h-9 font-mono" />
                  <Input value={subChapterFormPdfUrl} onChange={(e) => setSubChapterFormPdfUrl(e.target.value)} placeholder="رابط PDF..." className="text-xs bg-muted/20 h-9 font-mono" />
                </div>
                <div className="flex justify-end gap-2">
                  {editingSubChapterId && <Button type="button" variant="ghost" size="sm" onClick={handleCancelEditSubChapter} className="text-xs h-8 cursor-pointer">إلغاء</Button>}
                  <Button type="button" size="sm" onClick={handleSaveSubChapter} disabled={!subChapterFormTitle.trim()} className="text-xs font-bold h-8 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                    {editingSubChapterId ? "حفظ التعديلات" : "+ إضافة الشابتر"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Studio Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button type="submit" className="text-xs font-black px-6 rounded-xl shadow-xs">
              Save Changes & Publish
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
