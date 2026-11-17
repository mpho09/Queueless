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
      className="flex flex-col gap-1 rounded-card border border-savings/30 bg-linear-to-br from-green-bg to-surface p-5 shadow-[0_24px_60px_-34px_rgb(134_232_176/0.55)] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:p-6"
    >
      <div>
        <h2 id={id} className="text-caption font-semibold tracking-wide text-muted uppercase sm:text-body">
          Saved this month
        </h2>
        <p className="font-display text-[34px] leading-10 font-semibold tracking-tight text-savings tabular-nums sm:text-[48px] sm:leading-[56px]">
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
      <p className="font-display text-[26px] leading-8 font-semibold text-ink tabular-nums sm:text-[36px] sm:leading-10">{value}</p>
    </Card>
  )
}
