"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  BookOpen,
  Layers,
  Search,
  FileText,
  Play,
  ArrowRight,
  Monitor,
  Code2,
  Cpu,
  Atom,
  Calculator,
  Languages,
  Inbox,
  Lock,
  Zap,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ACADEMIC_YEARS,
  type Course,
} from "@/data/coursesData"
import { isFreeTrialCourse } from "@/lib/subscriptionUtils"

interface CoursesExplorerProps {
  userLevel?: number | null
  userDisplayName?: string | null
  userRole?: string | null
  subscriptionStatus?: string | null
  initialCourses?: Course[]
}

function parseCourseTitle(title: string): { ar: string; en: string } {
  const match = title.match(/^(.*?)\s*\((.*?)\)$/)
  if (match) {
    return { ar: match[1].trim(), en: match[2].trim() }
  }
  return { ar: title, en: "" }
}

function getCourseIcon(code: string) {
  const c = code.toUpperCase()
  if (c.includes("CS") || c.includes("PROG") || c.includes("102")) return Code2
  if (c.includes("IT") || c.includes("NET") || c.includes("101")) return Monitor
  if (c.includes("MATH") || c.includes("103") || c.includes("104")) return Calculator
  if (c.includes("PHYS") || c.includes("ELEC") || c.includes("105") || c.includes("106")) return Atom
  if (c.includes("HUM") || c.includes("LANG") || c.includes("ENG")) return Languages
  if (c.includes("AI") || c.includes("DATA") || c.includes("ALGO")) return Cpu
  return BookOpen
}

export function CoursesExplorer({
  userLevel = 1,
  userRole = "student",
  subscriptionStatus = "unpaid",
  initialCourses,
}: CoursesExplorerProps) {
  // Academic year is determined by userLevel
  const selectedYear = userLevel && userLevel >= 1 && userLevel <= 4 ? userLevel : 1
  const [searchQuery, setSearchQuery] = React.useState<string>("")

  // Navigation View: "semesters_boxes" (showing Sem 1 & Sem 2 boxes) or "semester_details" (inside a semester)
  const [currentView, setCurrentView] = React.useState<"semesters_boxes" | "semester_details">("semesters_boxes")
  const [activeSemester, setActiveSemester] = React.useState<1 | 2>(1)

  // Courses list strictly from database props
  const [allCourses, setAllCourses] = React.useState<Course[]>(initialCourses || [])

  React.useEffect(() => {
    if (initialCourses) {
      setAllCourses(initialCourses)
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

  const currentYearObj =
    ACADEMIC_YEARS.find((y) => y.level === selectedYear) || ACADEMIC_YEARS[0]

  // Filter courses for currently selected academic year
  const yearCourses = allCourses.filter((c) => c.level === selectedYear)
  const term1Courses = yearCourses.filter((c) => c.semester === 1)
  const term2Courses = yearCourses.filter((c) => c.semester === 2)

  // Courses displayed when inside a specific semester
  const displayedCourses = activeSemester === 1 ? term1Courses : term2Courses

  // Global search across all courses
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return allCourses.filter((course) => {
      const matchTitle = course.title.toLowerCase().includes(q)
      const matchCode = course.code.toLowerCase().includes(q)
      const matchDesc = course.description?.toLowerCase().includes(q)
      const matchLectures = course.lectures.some((lec) =>
        lec.title.toLowerCase().includes(q) ||
        lec.summary?.toLowerCase().includes(q) ||
        lec.topics.some((top) => top.title.toLowerCase().includes(q))
      )
      return matchTitle || matchCode || matchDesc || matchLectures
    })
  }, [allCourses, searchQuery])

  // Render a Single Course Card linking directly to the dedicated course page
  const renderCourseItem = (course: Course) => {
    const CourseIcon = getCourseIcon(course.code)
    const totalTopics = course.lectures.reduce((acc, lec) => acc + (lec.topics?.length || 0), 0)
    const totalLecs = course.lectures.length
    const totalVids = course.lectures.reduce(
      (acc, l) => acc + (l.videos?.length || (l.videoUrl ? 1 : 0)),
      0
    )
    const totalPdfs = course.lectures.reduce(
      (acc, l) => acc + (l.pdfs?.length || (l.pdfUrl ? 1 : 0)),
      0
    )
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

    const isFree = isFreeTrialCourse(course)
    const isSubscribed =
      userRole === "admin" ||
      userRole === "editor" ||
      subscriptionStatus === "active" ||
      subscriptionStatus === "lifetime"

    return (
      <Link
        key={course.id}
        href={`/courses/${course.slug || course.id}`}
        className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-md overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/60 transition-all duration-300 group flex flex-col justify-between text-start cursor-pointer hover:-translate-y-1.5"
      >
        <div>
          {/* 1. Course Cover Image */}
          <div className="h-44 sm:h-52 w-full relative overflow-hidden bg-muted">
            <Image
              src={coverImg}
              alt={parsed.ar || course.title}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/35 to-black/25" />

            {/* Badges on Image */}
            <div className="absolute top-3.5 start-3.5 end-3.5 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-primary text-primary-foreground shadow-sm">
                  {course.code}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-card/90 backdrop-blur-md border border-border text-foreground shadow-xs">
                  {levelText}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-card/90 backdrop-blur-md border border-border text-foreground shadow-xs">
                  {semText}
                </span>
              </div>

              {isSubscribed ? (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                  معتمد ومتاح
                </span>
              ) : isFree ? (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1">
                  <Zap className="size-3" />
                  متاح مجاناً للتجربة
                </span>
              ) : (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 backdrop-blur-md flex items-center gap-1">
                  <Lock className="size-3" />
                  يتطلب تفعيل (30 ج.م)
                </span>
              )}
            </div>

            {/* Floating Course Icon */}
            <div className="absolute bottom-3 start-4 flex items-center gap-2">
              <div className="size-11 rounded-2xl bg-card/90 backdrop-blur-md border border-border text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <CourseIcon className="size-5 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* 2. Course Body Content */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                {parsed.ar}
              </h3>
              {parsed.en && (
                <p dir="ltr" className="text-xs font-mono font-medium text-muted-foreground text-start truncate">
                  {parsed.en}
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {course.description}
            </p>

            {/* Metrics Row */}
            <div className="pt-2 flex items-center gap-2.5 sm:gap-3 text-xs text-muted-foreground flex-wrap border-t border-border/50">
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Layers className="size-3.5 text-primary" />
                <span className="text-foreground">{totalLecs}</span> محاضرات
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 font-bold">
                <FileText className="size-3.5 text-emerald-500" />
                <span className="text-foreground">{totalTopics}</span> موضوعات
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Play className="size-3.5 text-sky-500" />
                <span className="text-foreground">{totalVids}</span> فيديوهات
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 font-bold">
                <FileText className="size-3.5 text-amber-500" />
                <span className="text-foreground">{totalPdfs}</span> سلايدات
              </span>
            </div>
          </div>
        </div>

        {/* 3. Action Button (Direct Link to Course Page) */}
        <div className="p-5 pt-0">
          <div className="w-full h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs">
            <span>دخول المادة ودراسة المحاضرات</span>
            <ArrowRight className="size-4 rtl:rotate-0 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-8 text-center sm:text-start" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-border/60">
        <div className="space-y-1 text-start">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            المقررات والمناهج الدراسية
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            تصفح مقررات {currentYearObj.name} واختر المادة للبدء في دراسة المحاضرات ومشاهدة الشروحات.
          </p>
        </div>
      </div>

      {/* Subscription & Paywall Info Banner */}
      {!(userRole === "admin" || userRole === "editor" || subscriptionStatus === "active" || subscriptionStatus === "lifetime") && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-primary/10 via-card to-card border border-primary/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-start">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black text-foreground">
                  تفعيل كافة المقررات بـ 30 جنيه مصري فقط
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  مقرر الإلكترونيات متاح مجاناً للتجربة
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                التحويل متاح عبر فودافون كاش أو انستا باي على الرقم:{" "}
                <strong className="text-foreground font-mono" dir="ltr">01006655209</strong>. ادخل على أي مقرر لإرسال إثبات التحويل وتفعيل الحساب.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Link
              href="/courses/electronics-fundamentals"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-500 text-xs font-bold transition-colors"
            >
              <Zap className="size-3.5" />
              <span>تجربة الإلكترونيات</span>
            </Link>
          </div>
        </div>
      )}

      {/* Global Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="ابحث عن مادة، كود (CS101)، محاضرة، أو موضوع محدد..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-10 bg-card/80 backdrop-blur-md border-border/80 h-10 rounded-xl text-xs sm:text-sm"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className="group rounded-3xl border border-border/80 bg-card/80 backdrop-blur-md p-6 sm:p-7 shadow-sm hover:border-primary/50 hover:shadow-xl transition-all cursor-pointer text-start space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  Semester 1
                </span>
                <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  {term1Courses.length} مواد
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors">
                  الفصل الدراسي الأول
                </h3>
                <p className="text-xs text-muted-foreground">
                  استعرض مقررات ومحاضرات الترم الأول
                </p>
              </div>

              {/* Quick Subject Tags */}
              {term1Courses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {term1Courses.slice(0, 7).map((c) => (
                    <span
                      key={c.id}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-muted/60 text-foreground border border-border/50"
                    >
                      {c.title.split("(")[0].trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="my-2 py-6 px-4 rounded-xl bg-muted/30 border border-dashed border-border/80 text-center space-y-1.5">
                  <p className="text-base font-bold text-foreground">لم تتم إضافة مواد بعد</p>
                  <p className="text-xs text-muted-foreground">المقررات قيد التجهيز</p>
                </div>
              )}

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
                <span>{term1Courses.length > 0 ? "دخول مواد الترم الأول" : "استعراض الفصل"}</span>
                <ArrowRight className="size-4 rtl:rotate-0 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Box 2: Semester 2 */}
            <div
              onClick={() => {
                setActiveSemester(2)
                setCurrentView("semester_details")
              }}
              className="group rounded-3xl border border-border/80 bg-card/80 backdrop-blur-md p-6 sm:p-7 shadow-sm hover:border-primary/50 hover:shadow-xl transition-all cursor-pointer text-start space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-muted-foreground">
                  Semester 2
                </span>
                <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  {term2Courses.length} مواد
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors">
                  الفصل الدراسي الثاني
                </h3>
                <p className="text-xs text-muted-foreground">
                  استعرض مقررات ومحاضرات الترم الثاني
                </p>
              </div>

              {/* Quick Subject Tags */}
              {term2Courses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {term2Courses.map((c) => (
                    <span
                      key={c.id}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-muted/60 text-foreground border border-border/50"
                    >
                      {c.title.split("(")[0].trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="my-2 py-6 px-4 rounded-xl bg-muted/30 border border-dashed border-border/80 text-center space-y-1.5">
                  <p className="text-base font-bold text-foreground">لم تتم إضافة مواد بعد</p>
                  <p className="text-xs text-muted-foreground">المقررات قيد التجهيز والاعتماد الأكاديمي</p>
                </div>
              )}

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
                <span>{term2Courses.length > 0 ? "دخول مواد الترم الثاني" : "استعراض الفصل"}</span>
                <ArrowRight className="size-4 rtl:rotate-0 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 3: INSIDE SEMESTER VIEW (Cards linking directly to course pages) */
        <div className="space-y-6">
          {/* Back Navigation Button */}
          <div className="flex items-center justify-start pb-4 border-b border-border/60">
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

          {/* Empty State */}
          {displayedCourses.length === 0 ? (
            <div className="text-center py-20 px-6 rounded-3xl border border-dashed border-border/80 bg-card/60 space-y-5 max-w-2xl mx-auto my-8 animate-in fade-in-50 duration-200">
              <div className="size-20 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto border border-border">
                <Inbox className="size-10 text-muted-foreground/80" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  لم تتم إضافة مواد بعد
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  المقررات الدراسية لهذا الفصل ({currentYearObj.name} -{" "}
                  {activeSemester === 1 ? "الترم الأول" : "الترم الثاني"}) قيد التجهيز والاعتماد الأكاديمي.
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
            /* Grid of Course Cards (Each Card links directly to /courses/[courseSlug]) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCourses.map((course) => renderCourseItem(course))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
