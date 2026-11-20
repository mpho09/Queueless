import { useState } from 'react'
import { useLocation } from 'react-router'
import { Mail } from 'lucide-react'
import AuthCard from '../../components/layout/AuthCard.jsx'
import Button from '../../components/ui/Button.jsx'
import Toast from '../../components/feedback/Toast.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useOnline } from '../../hooks/useOnline.js'
import { messages } from '../../lib/messages.js'

/**
 * A4 Verify your email (#14, PRD §5): shown after Sign up. Until they verify, shoppers can browse
 * but not save or report (RLS). The address comes from Sign up, or from the logged-in user.
 */
export default function VerifyEmail() {
  const { state } = useLocation()
  const { user, resendVerification } = useAuth()
  const online = useOnline()
  const email = state?.email ?? user?.email ?? null

  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null) // { message, tone }

  async function resend() {
    setSending(true)
    setToast(null)
    try {
      await resendVerification(email)
      setToast({ message: `We sent a new link to ${email}.`, tone: 'success' })
    } catch (e) {
      setToast({ message: e?.message || messages.serverError, tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthCard>
      <div className="flex flex-col items-center text-center">
        <span className="mb-5 inline-flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Mail aria-hidden="true" className="size-8" />
        </span>
        <h1 className="mb-3 text-page-title font-semibold text-ink">Verify your email</h1>
        <p className="text-body text-ink">
          {email ? (
            <>
              We sent a link to <strong className="break-all text-primary">{email}</strong>.
            </>
          ) : (
            'We sent a link to your email address.'
          )}
        </p>
        <p className="mt-3 text-body text-muted">Until you verify, you can browse but not save or report.</p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={resend} disabled={!email || !online || sending} className="w-full">
          {sending ? 'Sending…' : 'Resend email'}
        </Button>
        <Button to="/" variant="secondary" className="w-full">
          Continue browsing
        </Button>
      </div>

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </AuthCard>
  )
}
