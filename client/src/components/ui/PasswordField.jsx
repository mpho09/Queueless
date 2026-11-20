import { useId, useState } from 'react'
import { CircleAlert, CircleCheck, Eye, EyeOff } from 'lucide-react'

/**
 * Password input with a show/hide eye (PRD §5). Under it, one note: `error` (red), else `success`
 * (green, e.g. "Password requirements met"), else `hint`. The note is read out with the field.
 */
export default function PasswordField({ label = 'Password', error, success, hint, className = '', ...props }) {
  const id = useId()
  const noteId = `${id}-note`
  const [visible, setVisible] = useState(false)
  const note = error || success || hint
  const Icon = error ? CircleAlert : success ? CircleCheck : null
  const tone = error ? 'text-red' : success ? 'text-savings' : 'text-muted'

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-caption font-semibold text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={`min-h-14 w-full rounded-input border bg-surface py-3 pr-14 pl-4 text-body text-ink placeholder:text-muted disabled:opacity-60 ${error ? 'border-red' : 'border-border-strong'}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute top-1/2 right-1 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-primary"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </button>
      </div>
      {note && (
        <p id={noteId} className={`mt-2 flex items-start gap-1 text-caption ${tone}`}>
          {Icon && <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
          {note}
        </p>
      )}
    </div>
  )
}
