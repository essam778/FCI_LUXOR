"use client"

import * as React from "react"
import Link from "next/link"
import {
  StickyNote,
  X,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Check,
  Copy,
  Lock,
  Loader2,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { sanitizeInput } from "@/lib/security"
import type { User } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

type StudentNote = Database["public"]["Tables"]["student_notes"]["Row"]

interface StudentNotesWidgetProps {
  initialUser?: User | null
}

const COLOR_MAP: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  emerald: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/5 dark:bg-emerald-500/10",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    text: "text-emerald-500",
  },
  sky: {
    border: "border-sky-500/40",
    bg: "bg-sky-500/5 dark:bg-sky-500/10",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    text: "text-sky-500",
  },
  amber: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/5 dark:bg-amber-500/10",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    text: "text-amber-500",
  },
  purple: {
    border: "border-purple-500/40",
    bg: "bg-purple-500/5 dark:bg-purple-500/10",
    badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    text: "text-purple-500",
  },
  rose: {
    border: "border-rose-500/40",
    bg: "bg-rose-500/5 dark:bg-rose-500/10",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    text: "text-rose-500",
  },
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 1) return "الآن"
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays === 1) return "أمس"
    if (diffDays < 7) return `منذ ${diffDays} أيام`
    return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

export function StudentNotesWidget({ initialUser = null }: StudentNotesWidgetProps) {
  const [user, setUser] = React.useState<User | null>(initialUser)
  const [isOpen, setIsOpen] = React.useState(false)
  const [notes, setNotes] = React.useState<StudentNote[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [filterCourse, setFilterCourse] = React.useState<string>("all")
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  // Editor mode state
  const [isEditing, setIsEditing] = React.useState(false)
  const [editingNoteId, setEditingNoteId] = React.useState<string | null>(null)
  const [formTitle, setFormTitle] = React.useState("")
  const [formContent, setFormContent] = React.useState("")
  const [formCourse, setFormCourse] = React.useState("")
  const [formColor, setFormColor] = React.useState<string>("emerald")
  const [formPinned, setFormPinned] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Track auth state
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fetch real notes from Supabase database
  const fetchNotes = React.useCallback(async () => {
    if (!user) {
      setNotes([])
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("student_notes")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false })

      if (error) {
        // Table might not exist yet if migration hasn't been executed
        console.warn("Could not fetch student_notes:", error.message)
      } else if (data) {
        setNotes(data as StudentNote[])
      }
    } catch (err) {
      console.warn("Error in fetchNotes:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Initial fetch and Realtime sync
  React.useEffect(() => {
    if (user) {
      fetchNotes()

      // Realtime subscription for notes
      const supabase = createClient()
      const channel = supabase
        .channel(`realtime:student_notes:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "student_notes",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotes()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, fetchNotes])

  // Open note form for new note
  const handleStartNewNote = () => {
    setEditingNoteId(null)
    setFormTitle("")
    setFormContent("")
    setFormCourse("")
    setFormColor("emerald")
    setFormPinned(false)
    setErrorMsg(null)
    setIsEditing(true)
  }

  // Open note form for edit
  const handleStartEditNote = (note: StudentNote) => {
    setEditingNoteId(note.id)
    setFormTitle(note.title)
    setFormContent(note.content)
    setFormCourse(note.course_code || "")
    setFormColor(note.color || "emerald")
    setFormPinned(!!note.is_pinned)
    setErrorMsg(null)
    setIsEditing(true)
  }

  // Save note directly to Supabase DB
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const cleanTitle = sanitizeInput(formTitle.trim())
    const cleanContent = sanitizeInput(formContent.trim())
    const cleanCourse = sanitizeInput(formCourse.trim().toUpperCase())

    if (!cleanTitle || !cleanContent) {
      setErrorMsg("يرجى إدخال عنوان ومحتوى الملاحظة.")
      return
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notesTable = supabase.from("student_notes") as any

      if (editingNoteId) {
        // Update existing note
        const { error } = await notesTable
          .update({
            title: cleanTitle,
            content: cleanContent,
            course_code: cleanCourse || null,
            color: formColor,
            is_pinned: formPinned,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingNoteId)
          .eq("user_id", user.id)

        if (error) throw error
      } else {
        // Insert new note
        const { error } = await notesTable.insert({
          user_id: user.id,
          title: cleanTitle,
          content: cleanContent,
          course_code: cleanCourse || null,
          color: formColor,
          is_pinned: formPinned,
        })

        if (error) throw error
      }

      setIsEditing(false)
      await fetchNotes()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل حفظ الملاحظة في قاعدة البيانات"
      setErrorMsg(msg)
    } finally {
      setSaving(false)
    }
  }

  // Toggle Pin status in DB
  const handleTogglePin = async (note: StudentNote) => {
    if (!user) return
    try {
      const supabase = createClient()
      const newPinned = !note.is_pinned
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("student_notes") as any)
        .update({ is_pinned: newPinned, updated_at: new Date().toISOString() })
        .eq("id", note.id)
        .eq("user_id", user.id)

      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, is_pinned: newPinned } : n))
      )
    } catch (err) {
      console.warn("Failed to pin note:", err)
    }
  }

  // Delete note from DB
  const handleDeleteNote = async (noteId: string) => {
    if (!user) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("student_notes") as any)
        .delete()
        .eq("id", noteId)
        .eq("user_id", user.id)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err) {
      console.warn("Failed to delete note:", err)
    }
  }

  // Copy note text
  const handleCopy = (note: StudentNote) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${note.title}\n\n${note.content}`)
      setCopiedId(note.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  // Filter notes
  const coursesList = React.useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => {
      if (n.course_code) set.add(n.course_code)
    })
    return Array.from(set)
  }, [notes])

  const filteredNotes = React.useMemo(() => {
    return notes.filter((n) => {
      const matchSearch =
        !search.trim() ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        (n.course_code && n.course_code.toLowerCase().includes(search.toLowerCase()))

      const matchCourse = filterCourse === "all" || n.course_code === filterCourse
      return matchSearch && matchCourse
    })
  }, [notes, search, filterCourse])

  return (
    <>
      {/* ============================================================== */}
      {/* FLOATING NOTES BUTTON + ANCHORED POPUP (Bottom-Left)           */}
      {/* ============================================================== */}
      <div className="fixed bottom-6 left-6 z-40 group" dir="rtl">

        {/* Anchored popup panel — sits directly above the button */}
        {isOpen && (
          <div
            dir="rtl"
            className="absolute bottom-[calc(100%+12px)] left-0 z-50 w-[calc(100vw-3rem)] sm:w-[420px] max-h-[75vh] flex flex-col rounded-3xl border-2 border-border/80 bg-card/95 dark:bg-card/98 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-3 fade-in duration-200"
          >
          {/* Top Header */}
          <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                <StickyNote className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-foreground truncate">
                  دفتر الملاحظات السحابي
                </h4>
                <p className="text-[10px] text-muted-foreground font-semibold truncate">
                  قاعدة بيانات سحابية مشفرة • Supabase Realtime
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {user && !isEditing && (
                <button
                  type="button"
                  onClick={handleStartNewNote}
                  className="px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>جديدة</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-8 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {/* If NOT logged in */}
            {!user ? (
              <div className="p-6 text-center space-y-4 rounded-2xl border-2 border-dashed border-border bg-muted/20 my-auto">
                <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
                  <Lock className="size-6" />
                </div>
                <div className="space-y-1.5">
                  <h5 className="text-sm font-black text-foreground">
                    سجّل دخولك لحفظ ملاحظاتك السحابية
                  </h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    يتم تشفير وحفظ ملاحظاتك مباشرة على خوادم الكلية السحابية بحسابك، لتتمكن من الوصول إليها من أي جهاز ومن هاتفك المحمول بأمان تام دون أي تخزين محلي.
                  </p>
                </div>
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button className="w-full text-xs font-bold gap-2 cursor-pointer shadow-md">
                    <span>تسجيل الدخول الآن</span>
                    <ExternalLink className="size-3.5" />
                  </Button>
                </Link>
              </div>
            ) : isEditing ? (
              /* ============================================================== */
              /* EDIT / CREATE FORM                                             */
              /* ============================================================== */
              <form onSubmit={handleSaveNote} className="space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Edit2 className="size-3.5 text-primary" />
                    <span>{editingNoteId ? "تعديل الملاحظة" : "إضافة ملاحظة سحابية جديدة"}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground">
                    عنوان الملاحظة <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: ملخص خوارزميات الـ Sorting أو ملحوظة دكتور المادة"
                    required
                    className="text-xs rounded-xl"
                  />
                </div>

                {/* Course Tag & Pin Checkbox */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">
                      كود المادة (اختياري)
                    </label>
                    <Input
                      value={formCourse}
                      onChange={(e) => setFormCourse(e.target.value)}
                      placeholder="IT101, CS101..."
                      className="text-xs font-mono rounded-xl uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">
                      تثبيت بأعلى القائمة
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormPinned((prev) => !prev)}
                      className={`w-full h-9 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                        formPinned
                          ? "bg-amber-500/15 border-amber-500/50 text-amber-500"
                          : "bg-muted/50 border-border text-muted-foreground"
                      }`}
                    >
                      <Pin className={`size-3.5 ${formPinned ? "fill-current" : ""}`} />
                      <span>{formPinned ? "مثبتة بالأعلى" : "غير مثبتة"}</span>
                    </button>
                  </div>
                </div>

                {/* Color Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground">لون الملاحظة</label>
                  <div className="flex items-center gap-2 pt-0.5">
                    {Object.keys(COLOR_MAP).map((colorKey) => {
                      const isSelected = formColor === colorKey
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => setFormColor(colorKey)}
                          className={`size-7 rounded-full transition-transform cursor-pointer ${
                            colorKey === "emerald"
                              ? "bg-emerald-500"
                              : colorKey === "sky"
                              ? "bg-sky-500"
                              : colorKey === "amber"
                              ? "bg-amber-500"
                              : colorKey === "purple"
                              ? "bg-purple-500"
                              : "bg-rose-500"
                          } ${isSelected ? "ring-2 ring-primary ring-offset-2 scale-110" : "opacity-70 hover:opacity-100"}`}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground">
                    نص ومحتوى الملاحظة <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="اكتب النقاط المهمة، القوانين، الأكواد، أو الملاحظات التي تريد تذكرها أثناء المذاكرة..."
                    required
                    rows={6}
                    className="w-full text-xs rounded-xl p-3 bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>جاري الحفظ في السحابة...</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-3.5" />
                        <span>{editingNoteId ? "حفظ التعديلات" : "حفظ الملاحظة في السحابة"}</span>
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="text-xs cursor-pointer"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            ) : (
              /* ============================================================== */
              /* NOTES LIST VIEW                                                */
              /* ============================================================== */
              <div className="space-y-3">
                {/* Search and Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute top-3 end-3 pointer-events-none" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث في ملاحظاتك..."
                      className="text-xs rounded-xl pe-8 bg-background/50 h-9"
                    />
                  </div>

                  {coursesList.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setFilterCourse("all")}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                          filterCourse === "all"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        الكل ({notes.length})
                      </button>
                      {coursesList.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFilterCourse(c)}
                          className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                            filterCourse === c
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Loading State */}
                {loading && notes.length === 0 ? (
                  <div className="py-12 text-center space-y-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs font-semibold">جاري جلب ملاحظاتك السحابية...</p>
                  </div>
                ) : filteredNotes.length === 0 ? (
                  /* Empty state */
                  <div className="py-10 text-center space-y-3 rounded-2xl border border-dashed border-border/80 bg-muted/10 p-5">
                    <div className="size-10 rounded-xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
                      <FileText className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        {search.trim() ? "لا توجد ملاحظات مطابقة لبحثك" : "دفترك السحابي فارغ حالياً"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {search.trim()
                          ? "جرّب البحث بكلمة أخرى أو قم بإلغاء الفلاتر"
                          : "اضغط على زر (جديدة) بالأعلى لإضافة ملخصك الأول لمواد الكلية."}
                      </p>
                    </div>
                    {!search.trim() && (
                      <Button
                        size="sm"
                        onClick={handleStartNewNote}
                        className="text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="size-3.5 stroke-[2.5]" />
                        <span>كتابة ملاحظة الآن</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  /* Notes Cards */
                  <div className="space-y-2.5">
                    {filteredNotes.map((note) => {
                      const colorStyle = COLOR_MAP[note.color || "emerald"] || COLOR_MAP.emerald
                      const isCopied = copiedId === note.id

                      return (
                        <div
                          key={note.id}
                          className={`p-3.5 rounded-2xl border-2 transition-all duration-200 relative group text-start ${colorStyle.border} ${colorStyle.bg} shadow-xs hover:shadow-md`}
                        >
                          {/* Note Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {note.is_pinned && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    <Pin className="size-2.5 fill-current" />
                                    <span>مثبتة</span>
                                  </span>
                                )}
                                {note.course_code && (
                                  <span
                                    className={`font-mono text-[9px] font-black px-1.5 py-0.2 rounded-md border ${colorStyle.badge}`}
                                  >
                                    {note.course_code}
                                  </span>
                                )}
                                <h5 className="text-xs font-black text-foreground line-clamp-1">
                                  {note.title}
                                </h5>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                {formatRelativeTime(note.updated_at || note.created_at)}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleTogglePin(note)}
                                className={`size-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                  note.is_pinned
                                    ? "bg-amber-500/20 text-amber-500"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                                title={note.is_pinned ? "إلغاء التثبيت" : "تثبيت بأعلى القائمة"}
                              >
                                <Pin className={`size-3 ${note.is_pinned ? "fill-current" : ""}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(note)}
                                className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                                title="نسخ الملاحظة"
                              >
                                {isCopied ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditNote(note)}
                                className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                                title="تعديل الملاحظة"
                              >
                                <Edit2 className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note.id)}
                                className="size-7 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors cursor-pointer"
                                title="حذف الملاحظة"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>

                          {/* Note Body */}
                          <p className="text-xs text-foreground/90 mt-2 leading-relaxed whitespace-pre-wrap font-sans break-words">
                            {note.content}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative size-13 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border border-white/20 cursor-pointer"
          title="دفتر الملاحظات السحابي"
          aria-label="افتح دفتر الملاحظات السحابي"
        >
          {isOpen ? (
            <X className="size-6 stroke-[2.5] animate-in spin-in-90 duration-200" />
          ) : (
            <>
              <StickyNote className="size-6 stroke-[2.2]" />
              {notes.length > 0 && user && (
                <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-background shadow-md">
                  {notes.length}
                </span>
              )}
            </>
          )}
        </button>

        {/* Tooltip Label on hover */}
        {!isOpen && (
          <span className="pointer-events-none absolute bottom-full mb-2 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-bold bg-card/95 text-foreground px-3 py-1.5 rounded-xl border border-border shadow-lg backdrop-blur-md whitespace-nowrap">
            دفتر ملاحظاتي السحابي
          </span>
        )}
      </div>
    </>
  )
}
