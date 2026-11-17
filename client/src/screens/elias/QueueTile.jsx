import { Check, Clock, Hourglass, Timer } from 'lucide-react'
import { queueLabel } from '../../components/domain/QueueBadge.jsx'

// Colours follow the Stitch S5 tiles: green = quiet, amber = moderate, red = long.
const LEVELS = {
  none: { Icon: Check, circle: 'bg-green-bg text-savings', label: 'text-savings', detail: 'text-muted', accent: 'max-sm:border-t-savings' },
  short: { Icon: Clock, circle: 'bg-green-bg text-savings', label: 'text-savings', detail: 'text-muted', accent: 'max-sm:border-t-savings' },
  moderate: { Icon: Timer, circle: 'bg-amber-bg text-amber', label: 'text-amber-text', detail: 'text-muted', accent: 'max-sm:border-t-amber' },
  long: { Icon: Hourglass, circle: 'bg-red-bg text-red', label: 'text-red', detail: 'text-red', accent: 'max-sm:border-t-red' },
}

/**
 * One of the four queue choices on S5. The text comes from QueueBadge so both always match:
 * "No Queue", "Short Line (under 10 Mins Wait)", "Moderate Line (10–30 Mins Wait)", "Long Line (30+ Mins Wait)".
 */
export default function QueueTile({ level, selected, onSelect, disabled = false }) {
  const label = queueLabel(level)
  // "Short Line (under 10 Mins Wait)" → name "Short Line", detail "(under 10 Mins Wait)"
  const [, name, detail] = label.match(/^(.*?)(?: (\(.*\)))?$/)
  const { Icon, circle, label: labelColour, detail: detailColour, accent } = LEVELS[level] ?? LEVELS.none

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      disabled={disabled}
      onClick={() => onSelect(level)}
      className={`relative flex min-h-32 flex-col items-center justify-center gap-2 rounded-card border-2 px-3 py-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        selected ? 'border-primary bg-primary/5' : `border-border-strong bg-surface hover:border-primary/50 max-sm:border-t-4 ${accent}`
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-on-primary">
          <Check aria-hidden="true" className="size-3.5" />
        </span>
      )}
      <span aria-hidden="true" className={`flex size-10 items-center justify-center rounded-full ${circle}`}>
        <Icon className="size-5" />
      </span>
      <span aria-hidden="true" className={`text-body font-semibold ${labelColour}`}>
        {name}
      </span>
      {detail && (
        <span aria-hidden="true" className={`text-caption ${detailColour}`}>
          {detail}
        </span>
      )}
    </button>
  )
}
