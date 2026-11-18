export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse" dir="rtl">
      {/* Top Banner Skeleton */}
      <div className="h-40 sm:h-52 w-full rounded-3xl bg-muted/40 border border-border/60" />

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-64 rounded-3xl bg-muted/30 border border-border/50 p-5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-5 w-24 rounded-lg bg-muted/60" />
              <div className="h-6 w-3/4 rounded-xl bg-muted/80" />
              <div className="h-4 w-full rounded-lg bg-muted/40" />
            </div>
            <div className="h-10 w-full rounded-2xl bg-muted/50 mt-4" />
          </div>
        ))}
      </div>
    </div>
  )
}
