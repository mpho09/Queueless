import { useId } from 'react'
import { CircleAlert } from 'lucide-react'

/**
 * Labelled text input. `error` shows a red border and a message under the field (the typed value
 * is kept, PRD §12.2); `hint` is quiet help text shown while there is no error.
 * `invalid` gives the red border without a message (when a banner above already explains it).
 * `trailing` puts a control (e.g. the password eye) inside the field on the right.
 */
export default function TextField({ label, error, invalid, hint, trailing, className = '', inputClassName = '', ...props }) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error || hint
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-caption font-semibold text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error || invalid ? 'true' : undefined}
          aria-describedby={message ? messageId : undefined}
          className={`min-h-14 w-full rounded-input border bg-surface py-3 pl-4 text-body text-ink placeholder:text-muted read-only:bg-surface-soft read-only:text-muted ${
            trailing ? 'pr-14' : 'pr-4'
          } ${error || invalid ? 'border-red' : 'border-border-strong'} ${inputClassName}`}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {message && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={`mt-2 flex items-start gap-1.5 text-caption ${error ? 'text-red' : 'text-muted'}`}
        >
          {error && <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
          {message}
        </p>
      )}
    </div>
  )
}
