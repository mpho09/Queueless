import { Star } from 'lucide-react'

/** "★ Cheapest" on the cheapest complete store (BR3). Shared with S2 (#11). */
export default function CheapestPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-savings/30 bg-green-bg px-3 py-1 text-caption font-medium text-savings">
      <Star aria-hidden="true" className="size-4 fill-current" />
      Cheapest
    </span>
  )
}
