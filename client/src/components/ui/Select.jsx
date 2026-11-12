import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

/** Labelled native select (48px tall, 6px radius). `hint` shows under the field. */
export default function Select({ label, hint, hintIcon, options, value, onChange, placeholder, className = '', ...props }) {
  const id = useId()
  const hintId = `${id}-hint`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-body font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? hintId : undefined}
          className="min-h-12 w-full appearance-none rounded-input border border-border bg-bg py-3 pr-10 pl-3 text-body text-ink focus:border-primary"
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted" />
      </div>
      {hint && (
        <p id={hintId} className="mt-2 flex items-center gap-1 text-caption text-muted">
          {hintIcon}
          {hint}
        </p>
      )}
    </div>
  )
}
