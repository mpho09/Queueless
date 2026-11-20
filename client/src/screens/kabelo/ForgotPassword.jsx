import { useState } from 'react'
import { Link } from 'react-router'
import Button from '../../components/ui/Button.jsx'
import TextField from '../../components/ui/TextField.jsx'
import Toast from '../../components/feedback/Toast.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import AuthLayout, { Banner } from './AuthLayout.jsx'

/** A3 Forgot password (/forgot-password). The reset link is valid for 1 hour (set in Supabase). */
export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)

  async function send(again) {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await resetPassword(email)
      setSent(true)
      if (again) setToast('Reset link sent again.')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Reset your password">
      {error && <Banner tone="error">{error.message}</Banner>}
      {sent ? (
        <Banner tone="success">Check your email. The reset link is valid for 1 hour.</Banner>
      ) : (
        <p className="mb-5 text-body text-muted">
          Enter the email address associated with your Queueless account and we&rsquo;ll send you a recovery link.
        </p>
      )}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!sent && email.trim()) send(false)
        }}
        className="flex flex-col gap-4"
      >
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.co.za"
          value={email}
          readOnly={sent}
          onChange={(event) => setEmail(event.target.value)}
        />
        {sent ? (
          <>
            <Button variant="secondary" className="w-full" disabled={busy} onClick={() => send(true)}>
              {busy ? 'Sending…' : 'Resend reset link'}
            </Button>
            {/* The field is locked after sending, so this is how someone fixes a mistyped address. */}
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={() => {
                setSent(false)
                setError(null)
                setToast(null)
              }}
            >
              Use a different email
            </Button>
          </>
        ) : (
          <Button type="submit" className="w-full" disabled={busy || !email.trim()}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
        )}
      </form>

      <Link to="/login" className="mt-6 flex min-h-11 items-center justify-center text-body font-semibold text-primary hover:underline">
        Back to log in
      </Link>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AuthLayout>
  )
}
