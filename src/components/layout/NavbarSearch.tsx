"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, BookOpen, Layers, X } from "lucide-react"
import type { Course } from "@/data/coursesData"

export function NavbarSearch() {
  const [query, setQuery] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const [courses, setCourses] = React.useState<Course[]>([])
  const router = useRouter()
  const searchRef = React.useRef<HTMLDivElement>(null)

  // Fetch live courses on demand
  const loadCourses = React.useCallback(async () => {
    if (courses.length > 0) return
    try {
      const res = await fetch("/api/courses")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setCourses(data)
        }
      }
    } catch {
      // ignore
    }
  }, [courses.length])

  // Keyboard shortcut Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
        loadCourses()
        const inputEl = document.getElementById("navbar-search-input")
        inputEl?.focus()
      }
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [loadCourses])

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const results = React.useMemo(() => {
    if (!query.trim() || courses.length === 0) return []
    const q = query.toLowerCase()
    const matches: Array<{ type: "course" | "topic"; title: string; subtitle: string; slug: string }> = []

    for (const course of courses) {
      if (course.title.toLowerCase().includes(q) || course.code.toLowerCase().includes(q)) {
        matches.push({
          type: "course",
          title: course.title,
          subtitle: `${course.code} • الفرقة ${course.level} ترم ${course.semester}`,
          slug: `/courses/${course.slug || course.id}`,
        })
      }

      for (const lec of course.lectures || []) {
        if (lec.title.toLowerCase().includes(q)) {
          matches.push({
            type: "topic",
            title: lec.title,
            subtitle: `${course.title} • ${course.code}`,
            slug: `/courses/${course.slug || course.id}`,
          })
        }
        for (const topic of lec.topics || []) {
          if (topic.title.toLowerCase().includes(q)) {
            matches.push({
              type: "topic",
              title: topic.title,
              subtitle: `${course.title} • محاضرة ${lec.number}`,
              slug: `/courses/${course.slug || course.id}`,
            })
          }
        }
      }
    }
    return matches.slice(0, 6)
  }, [query, courses])

  const handleSelect = (slug: string) => {
    setIsOpen(false)
    setQuery("")
    router.push(slug)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setIsOpen(false)
    router.push(`/courses?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div ref={searchRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70 pointer-events-none" />
        <input
          id="navbar-search-input"
          type="text"
          value={query}
          onFocus={() => {
            setIsOpen(true)
            loadCourses()
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            loadCourses()
          }}
          placeholder="ابحث عن مقرر أو موضوع... (Ctrl+K)"
          className="w-full h-9 ps-9 pe-9 text-xs rounded-xl bg-muted/60 hover:bg-muted focus:bg-background border border-border/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all placeholder:text-muted-foreground/70"
          dir="rtl"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setIsOpen(false)
            }}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </form>

      {/* Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute top-full mt-2 w-full min-w-[280px] sm:min-w-[340px] end-0 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-2 z-50 text-start animate-in fade-in-50 zoom-in-95 duration-100">
          {results.length > 0 ? (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                نتائج البحث المباشرة
              </div>
              {results.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(res.slug)}
                  className="p-2.5 rounded-xl hover:bg-accent cursor-pointer transition-colors flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{res.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{res.subtitle}</p>
                  </div>
                  <div className="size-6 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                    {res.type === "course" ? <BookOpen className="size-3" /> : <Layers className="size-3" />}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground">
              لا توجد نتائج مطابقة لـ &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
