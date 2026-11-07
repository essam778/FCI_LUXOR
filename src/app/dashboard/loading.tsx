import * as React from "react"

export default function DashboardLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8 animate-pulse text-start" dir="rtl">
      {/* Profile Header Skeleton */}
      <div className="p-4 sm:p-6 rounded-2xl bg-card/70 border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 sm:size-16 rounded-full bg-muted/60 shrink-0" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted/70 rounded-xl" />
            <div className="h-4 w-36 bg-muted/40 rounded-lg" />
          </div>
        </div>
        <div className="h-9 w-32 bg-muted/50 rounded-xl" />
      </div>

      {/* Subscription Card Skeleton */}
      <div className="p-6 rounded-3xl border border-border/70 bg-card/70 space-y-4">
        <div className="h-6 w-44 bg-muted/70 rounded-xl" />
        <div className="h-4 w-full max-w-md bg-muted/40 rounded-lg" />
        <div className="h-10 w-48 bg-muted/60 rounded-xl" />
      </div>
    </div>
  )
}

