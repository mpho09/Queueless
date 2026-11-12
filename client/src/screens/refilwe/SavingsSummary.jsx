import { useId } from 'react'
import Card from '../../components/ui/Card.jsx'
import { formatZAR } from '../../lib/format.js'
import { monthLong } from './savingsFormat.js'

/** "SAVED THIS MONTH R152.40 November 2026" (green card). */
export function SavedThisMonth({ cents, month }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-1 rounded-card border border-savings/40 bg-bg p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:p-6"
    >
      <div>
        <h2 id={id} className="text-caption font-semibold tracking-wide text-muted uppercase sm:text-body">
          Saved this month
        </h2>
        <p className="text-[32px] leading-10 font-bold text-savings sm:text-[44px] sm:leading-[52px]">
          {formatZAR(cents / 100)}
        </p>
      </div>
      <p className="text-caption text-muted sm:pb-2 sm:text-body">{monthLong(month)}</p>
    </section>
  )
}

/** Small tile: "Reward points 120", "Reports this month 8". */
export function StatTile({ label, value }) {
  const id = useId()
  return (
    <Card as="section" aria-labelledby={id} className="flex flex-col gap-1 p-4 sm:p-6">
      <h2 id={id} className="text-caption text-muted sm:text-body">
        {label}
      </h2>
      <p className="text-section font-bold text-ink sm:text-[36px] sm:leading-10">{value}</p>
    </Card>
  )
}
