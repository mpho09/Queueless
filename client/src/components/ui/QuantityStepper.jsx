import { Minus, Plus } from 'lucide-react'

const stepButton =
  'inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface-soft disabled:cursor-not-allowed disabled:text-border disabled:hover:bg-transparent'

/** − 1 + capsule (44px touch targets). `label` names the item for screen readers. */
export default function QuantityStepper({ value, onChange, label, min = 1, max = 99, disabled = false }) {
  return (
    <div className="inline-flex shrink-0 items-center rounded-full border border-border">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        className={stepButton}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <span aria-label={`Quantity of ${label}`} aria-live="polite" className="min-w-6 text-center text-body font-medium">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        className={stepButton}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
