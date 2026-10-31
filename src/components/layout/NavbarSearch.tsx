"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, BookOpen, Layers, X } from "lucide-react"
import { COURSES_DATA } from "@/data/coursesData"

export function NavbarSearch() {
  const [query, setQuery] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)
  const router = useRouter()
  const searchRef = React.useRef<HTMLDivElement>(null)

  // Keyboard shortcut Ctrl+K / Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
        const inputEl = document.getElementById("navbar-search-input")
        inputEl?.focus()
      }
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

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
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const matches: Array<{ type: "course" | "topic"; title: string; subtitle: string; slug: string }> = []

    for (const course of COURSES_DATA) {
      if (course.title.toLowerCase().includes(q) || course.code.toLowerCase().includes(q)) {
        matches.push({
          type: "course",
          title: course.title,
          subtitle: `${course.code} • الفرقة ${course.level} ترم ${course.semester}`,
          slug: `/courses?q=${encodeURIComponent(course.title)}`,
        })
      }

      for (const lec of course.lectures) {
        if (lec.title.toLowerCase().includes(q)) {
          matches.push({
            type: "topic",
            title: lec.title,
            subtitle: `${course.title} • ${course.code}`,
            slug: `/courses?q=${encodeURIComponent(lec.title)}`,
          })
        }
        for (const topic of lec.topics) {
          if (topic.title.toLowerCase().includes(q)) {
            matches.push({
              type: "topic",
              title: topic.title,
              subtitle: `${course.title} • محاضرة ${lec.number}`,
              slug: `/courses?q=${encodeURIComponent(topic.title)}`,
            })
          }
        }
      }
    }
    return matches.slice(0, 6)
  }, [query])

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
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          id="navbar-search-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="ابحث عن مادة، محاضرة، أو سؤال... (Ctrl+K)"
          className="w-full h-9 rounded-xl border border-input bg-card/60 ps-9 pe-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </form>

      {/* Live Suggestions Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full min-w-[320px] rounded-xl border border-border bg-card p-2 shadow-2xl z-50 space-y-1 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground">نتائج البحث الفورية:</div>
          {results.map((res, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(res.slug)}
              className="w-full flex items-start gap-2.5 p-2 rounded-lg text-start hover:bg-muted/50 transition-colors cursor-pointer group"
            >
              <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {res.type === "course" ? <BookOpen className="size-3.5" /> : <Layers className="size-3.5" />}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-foreground truncate">{res.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">{res.subtitle}</div>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full pt-1.5 pb-1 text-center text-xs font-bold text-primary hover:underline"
          >
            عرض كافة النتائج في صفحة المقررات ←
          </button>
        </div>
      )}
    </div>
  )
}
