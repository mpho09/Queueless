import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Mail } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import TextField from '../../components/ui/TextField.jsx'
import Toast from '../../components/feedback/Toast.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { Banner, safeReturnPath } from './AuthLayout.jsx'

/** A4 Verify your email (/verify-email): shown after sign-up and to people who log in before verifying. */
export default function VerifyEmail() {
  const { user, resendVerification } = useAuth()
  const location = useLocation()
  const returnTo = safeReturnPath(location.state?.from)
  const known = location.state?.email || user?.email || ''
  const [typed, setTyped] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const email = known || typed.trim()

  if (user?.email_confirmed_at) return <Navigate to={returnTo} replace />

  async function resend() {
    if (busy || !email) return
    setError(null)
    setBusy(true)
    try {
      await resendVerification(email)
      setToast('Verification email sent.')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[440px] pb-8 sm:mt-6 sm:rounded-panel sm:border sm:border-border sm:bg-surface sm:p-8 sm:shadow-[0_30px_80px_-40px_rgb(82_220_196/0.3)]">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail aria-hidden="true" className="size-7" />
        </span>
        <h1 className="mt-5 text-page-title font-semibold text-ink sm:text-[30px] sm:leading-9">Verify your email</h1>
        <p className="mt-3 text-body text-ink">
          {known ? (
            <>
              We sent a link to <strong className="font-semibold break-all text-primary">{known}</strong>.
            </>
          ) : (
            'We sent a verification link to your email.'
          )}
        </p>
        <p className="mt-2 text-caption text-muted">Until you verify, you can browse but not save or report.</p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {error && <Banner tone="error">{error.message}</Banner>}
        {!known && (
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.co.za"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        )}
        <Button className="w-full" disabled={busy || !email} onClick={resend}>
          {busy ? 'Sending…' : 'Resend email'}
        </Button>
        <Button to={returnTo} variant="secondary" className="w-full">
          Continue browsing
        </Button>
      </div>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}
