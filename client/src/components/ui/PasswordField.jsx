import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import TextField from './TextField.jsx'

/** Password input with a show/hide eye (44×44px). Pass autoComplete="current-password" or "new-password". */
export default function PasswordField({ label = 'Password', ...props }) {
  const [shown, setShown] = useState(false)
  const Icon = shown ? EyeOff : Eye
  return (
    <TextField
      label={label}
      type={shown ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShown((value) => !value)}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={shown}
          className="inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-raised hover:text-primary"
        >
          <Icon aria-hidden="true" className="size-5" />
        </button>
      }
      {...props}
    />
  )
}
