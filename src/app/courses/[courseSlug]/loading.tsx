import * as React from "react"

export default function SingleCourseLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-pulse text-start" dir="rtl">
      {/* Top Nav Breadcrumb Skeleton */}
      <div className="flex justify-between items-center pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-muted/60 rounded" />
          <div className="h-4 w-4 bg-muted/40 rounded" />
          <div className="h-4 w-28 bg-muted/60 rounded" />
          <div className="h-4 w-4 bg-muted/40 rounded" />
          <div className="h-4 w-32 bg-muted/70 rounded" />
        </div>
        <div className="h-8 w-40 bg-muted/50 rounded-xl hidden sm:block" />
      </div>

      {/* Hero Banner Skeleton */}
      <div className="rounded-3xl border border-border/70 bg-card/70 overflow-hidden space-y-6">
        <div className="h-44 sm:h-56 w-full bg-muted/60" />
        <div className="p-5 sm:p-7 pt-0 space-y-4">
          <div className="space-y-2">
            <div className="h-8 w-72 bg-muted/70 rounded-xl" />
            <div className="h-4 w-44 bg-muted/40 rounded-lg" />
          </div>
          <div className="h-4 w-full max-w-2xl bg-muted/40 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted/40 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Lectures List Skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-44 bg-muted/60 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-card/60 border border-border/60 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

