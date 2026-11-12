/** Grey placeholder block shown while data loads. */
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-grey-pill-bg ${className}`} />
}

/** Card-shaped skeleton rows, matching the Stitch loading frames. */
export function SkeletonRows({ count = 3, label = 'Loading' }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 rounded-card border border-border p-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      ))}
    </div>
  )
}
