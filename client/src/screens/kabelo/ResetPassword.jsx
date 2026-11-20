import { useState } from 'react'
import { Link } from 'react-router'
import Button from '../../components/ui/Button.jsx'
import PasswordField from '../../components/ui/PasswordField.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { messages } from '../../lib/messages.js'
import { isValidPassword } from '../../utils/validation.js'
import AuthLayout, { Banner } from './AuthLayout.jsx'

/**
 * /reset-password: the page the reset email opens. The link signs the person in with a short-lived
 * session, and they choose a new password. TODO: design (plan D7, there is no Stitch board for this page).
 */
export default function ResetPassword() {
  const { user, loading, passwordRecovery, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [confirmError, setConfirmError] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <AuthLayout title="Set a new password">
        <Banner tone="success">Your password has been updated.</Banner>
        <Button to="/" className="w-full">
          Continue to Queueless
        </Button>
      </AuthLayout>
    )
  }

  // The link was opened too late or already used (no session), or the person didn't come from a
  // reset link at all: being logged in is not enough to set a new password without the old one.
  if (!loading && (!user || !passwordRecovery)) {
    return (
      <AuthLayout title="Set a new password">
        <Banner tone="error">This reset link has expired or was already used. Request a new one.</Banner>
        <Button to="/forgot-password" className="w-full">
          Request a new link
        </Button>
      </AuthLayout>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy || loading) return
    setError(null)
    if (!isValidPassword(password)) {
      setPasswordError(messages.passwordRules)
      return
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await updatePassword(password)
      setDone(true)
    } catch (err) {
      if (err.code === 'WEAK_PASSWORD') setPasswordError(err.message)
      else setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Set a new password">
      {error && <Banner tone="error">{error.message}</Banner>}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          placeholder="Create a new password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setPasswordError(null)
            setConfirmError(null)
          }}
          error={passwordError ?? undefined}
          hint="At least 8 characters, 1 uppercase letter and 1 number"
        />
        <PasswordField
          label="Confirm new password"
          name="confirm"
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value)
            setConfirmError(null)
          }}
          error={confirmError ?? undefined}
        />
        <Button type="submit" className="w-full" disabled={busy || loading || !password || !confirm}>
          {busy ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
      <Link to="/login" className="mt-6 flex min-h-11 items-center justify-center text-body font-semibold text-primary hover:underline">
        Back to log in
      </Link>
    </AuthLayout>
  )
}
