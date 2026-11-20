import { Check } from 'lucide-react'

/**
 * Checkbox with its label (the whole row is the 44px touch target). `children` is the label, so it can
 * hold a link. Unticked by default, as the PRD requires for consent.
 */
export default function Checkbox({ checked, onChange, children, className = '', ...props }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-3 text-body text-ink ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
        {...props}
      />
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface text-on-primary transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Check className="size-4 stroke-[3]" />
      </span>
      <span>{children}</span>
    </label>
  )
}
