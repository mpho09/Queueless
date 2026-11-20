import { useId } from 'react'

const inputBase =
  'min-h-14 w-full rounded-input border bg-surface px-4 py-3 text-body text-ink placeholder:text-muted disabled:opacity-60'

/** Labelled text input (56px tall). `error` turns it red and is read out with the field; `hint` sits under it. */
export default function TextField({ label, error, hint, className = '', ...props }) {
  const id = useId()
  const noteId = `${id}-note`
  const note = error || hint
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-caption font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={`${inputBase} ${error ? 'border-red' : 'border-border-strong'}`}
        {...props}
      />
      {note && (
        <p id={noteId} className={`mt-2 text-caption ${error ? 'text-red' : 'text-muted'}`}>
          {note}
        </p>
      )}
    </div>
  )
}
