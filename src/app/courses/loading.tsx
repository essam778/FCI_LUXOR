import * as React from "react"

export default function CoursesLoading() {
  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-12 space-y-8 animate-pulse text-start" dir="rtl">
      {/* Header Skeleton */}
      <div className="space-y-2 pb-6 border-b border-border/60">
        <div className="h-8 w-64 bg-muted/60 rounded-xl" />
        <div className="h-4 w-96 max-w-full bg-muted/40 rounded-lg" />
      </div>

      {/* Search Input Skeleton */}
      <div className="h-10 w-full max-w-xl bg-muted/50 rounded-xl" />

      {/* Semester Boxes Skeleton Grid */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted/50 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-7 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-muted/60 rounded-md" />
                <div className="h-5 w-16 bg-muted/50 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-7 w-40 bg-muted/70 rounded-xl" />
                <div className="h-4 w-56 bg-muted/40 rounded-lg" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-20 bg-muted/50 rounded-lg" />
                <div className="h-6 w-24 bg-muted/50 rounded-lg" />
                <div className="h-6 w-16 bg-muted/50 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

