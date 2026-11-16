import { Check, Clock, Hourglass, Timer } from 'lucide-react'
import { queueLabel } from '../../components/domain/QueueBadge.jsx'

const ICONS = { none: Check, short: Clock, moderate: Timer, long: Hourglass }

/**
 * One of the four queue choices on S5. The text comes from QueueBadge so both always match:
 * "No Queue", "Short Line (under 10 Mins Wait)", "Moderate Line (10–30 Mins Wait)", "Long Line (30+ Mins Wait)".
 */
export default function QueueTile({ level, selected, onSelect, disabled = false }) {
  const label = queueLabel(level)
  // "Short Line (under 10 Mins Wait)" → name "Short Line", detail "(under 10 Mins Wait)"
  const [, name, detail] = label.match(/^(.*?)(?: (\(.*\)))?$/)
  const Icon = ICONS[level] ?? Clock

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      disabled={disabled}
      onClick={() => onSelect(level)}
      className={`relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border-2 px-3 py-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        selected ? 'border-primary bg-green-bg' : 'border-border bg-bg hover:border-primary/50'
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-white">
          <Check aria-hidden="true" className="size-3.5" />
        </span>
      )}
      <Icon aria-hidden="true" className={`size-6 ${selected ? 'text-primary' : 'text-muted'}`} />
      <span aria-hidden="true" className="text-body font-semibold text-ink">
        {name}
      </span>
      {detail && (
        <span aria-hidden="true" className="text-caption text-muted">
          {detail}
        </span>
      )}
    </button>
  )
}
