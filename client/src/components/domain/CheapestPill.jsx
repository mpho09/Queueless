import { Star } from 'lucide-react'

/** "★ Cheapest" on the cheapest complete store (BR3). Champagne gold marks the winner. Shared with S2 (#11). */
export default function CheapestPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-caption font-semibold text-gold">
      <Star aria-hidden="true" className="size-4 fill-current" />
      Cheapest
    </span>
  )
}
