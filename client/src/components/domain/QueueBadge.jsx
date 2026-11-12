import { Check, CircleHelp, Clock } from 'lucide-react'

// PRD queue levels (docs/Implementation plan.md §9.3). Always icon + text, never colour alone.
const LEVELS = {
  none: { label: 'No Queue', className: 'border-savings/30 bg-green-bg text-savings', Icon: Check },
  short: { label: 'Short Line (under 10 Mins Wait)', className: 'border-savings/30 bg-green-bg text-savings', Icon: Clock },
  moderate: { label: 'Moderate Line (10–30 Mins Wait)', className: 'border-amber/40 bg-amber-bg text-amber-text', Icon: Clock },
  long: { label: 'Long Line (30+ Mins Wait)', className: 'border-red/30 bg-red-bg text-red', Icon: Clock },
  unknown: { label: 'Unknown', className: 'border-border bg-grey-pill-bg text-muted', Icon: CircleHelp },
}

export function queueLabel(level) {
  return (LEVELS[level] ?? LEVELS.unknown).label
}

export default function QueueBadge({ level }) {
  const { label, className, Icon } = LEVELS[level] ?? LEVELS.unknown
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-medium ${className}`}>
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </span>
  )
}
