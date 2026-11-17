import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

/** Labelled native select (56px tall). `hint` shows under the field. */
export default function Select({ label, hint, hintIcon, options, value, onChange, placeholder, className = '', ...props }) {
  const id = useId()
  const hintId = `${id}-hint`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-caption font-semibold text-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? hintId : undefined}
          className="min-h-14 w-full appearance-none rounded-input border border-border-strong bg-surface py-3 pr-11 pl-4 text-body text-ink"
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-primary" />
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
