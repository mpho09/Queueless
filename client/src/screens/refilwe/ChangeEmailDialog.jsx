import { useState } from 'react'
import Button from '../../components/ui/Button.jsx'
import TextField from '../../components/ui/TextField.jsx'
import Dialog from './Dialog.jsx'
import { changeEmail } from './savingsApi.js'
import { savingsText } from './savingsText.js'

/**
 * S6 "Change email" form. On success it calls `onSent()`; S6 then shows the "check both inboxes"
 * toast. The typed address is kept when something goes wrong (PRD §12.2).
 */
export default function ChangeEmailDialog({ currentEmail, onClose, onSent, disabled }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await changeEmail(email, currentEmail)
      onSent()
    } catch (e) {
      setError(e?.message || savingsText.changeEmailInvalid)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog title={savingsText.changeEmailTitle} onClose={onClose}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-body text-muted">{savingsText.changeEmailBody}</p>
        <TextField
          label={savingsText.changeEmailLabel}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          hint={currentEmail ? `Current: ${currentEmail}` : undefined}
        />
        <div className="mt-1 flex flex-col gap-3">
          <Button type="submit" disabled={busy || disabled || !email.trim()}>
            {savingsText.changeEmailSubmit}
          </Button>
          <Button variant="secondary" className="border-border text-ink" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
