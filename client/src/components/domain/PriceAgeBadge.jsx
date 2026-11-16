import { TriangleAlert } from 'lucide-react'
import { isStale, STALE_LABEL } from '../../utils/priceAge.js'

/** Amber "Unverified for 2 days" pill when a price is over 48 hours old (BR1). Renders nothing otherwise. */
export default function PriceAgeBadge({ verifiedAt, now }) {
  if (!isStale(verifiedAt, now)) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber/40 bg-amber-bg px-2 py-0.5 text-caption font-medium text-amber-text">
      <TriangleAlert aria-hidden="true" className="size-4" />
      {STALE_LABEL}
    </span>
  )
}
