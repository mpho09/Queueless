import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { CircleAlert } from 'lucide-react'
import AuthCard from '../../components/layout/AuthCard.jsx'
import Button from '../../components/ui/Button.jsx'
import Checkbox from '../../components/ui/Checkbox.jsx'
import PasswordField from '../../components/ui/PasswordField.jsx'
import TextField from '../../components/ui/TextField.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useOnline } from '../../hooks/useOnline.js'
import { messages } from '../../lib/messages.js'
import { isValidEmail, isValidPassword } from '../../utils/validation.js'

// Texts from the Stitch A2 board.
const PASSWORD_HINT = 'At least 8 characters, 1 uppercase letter and 1 number'
const PASSWORD_OK = 'Password requirements met'
const RETAILER_NOTE = 'Retailer? Retailer accounts are approved by our team.'

/**
 * A2 Sign up (#14, PRD §5). Both checkboxes are required (16+, Privacy Notice). They are sent as
 * sign-up metadata, and the profiles_trigger migration (#44) turns them into the shopper's profile.
 * A weak password shows the PRD message and keeps what was typed. Next: A4 Verify email.
 */
export default function Signup() {
  const { signUp, isLoggedIn, loading } = useAuth()
  const online = useOnline()
  const navigate = useNavigate()
  const { state } = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [is16OrOlder, setIs16OrOlder] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null) // { message, field: 'password' | null, code }

  // Someone who is already logged in has nothing to do here.
  if (!loading && isLoggedIn && !submitting) return <Navigate to="/" replace />

  const passwordOk = isValidPassword(password)
  const passwordError =
    error?.field === 'password'
      ? error.message
      : passwordTouched && password !== '' && !passwordOk
        ? messages.passwordRules
        : null
  const canSubmit = online && !submitting && isValidEmail(email) && passwordOk && is16OrOlder && privacyConsent

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const { needsVerification } = await signUp(email, password, { is16OrOlder, privacyConsent })
      if (needsVerification) {
        navigate('/verify-email', { replace: true, state: { email: email.trim().toLowerCase() } })
      } else {
        navigate(state?.from ?? '/', { replace: true })
      }
    } catch (e) {
      // Keep everything they typed (PRD §5). A weak password is shown under the password field.
      const field = e?.code === 'WEAK_PASSWORD' ? 'password' : null
      setError({ message: e?.message || messages.serverError, field, code: e?.code })
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Create your account">
      {error && !error.field && (
        <p
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-input border border-red/40 bg-red-bg px-4 py-3 text-caption text-red"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {error.message}
            {error.code === 'EMAIL_TAKEN' && (
              <>
                {' '}
                <Link to="/login" className="font-semibold underline">
                  Log in
                </Link>
              </>
            )}
          </span>
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.co.za"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (error?.field === 'password') setError(null)
          }}
          onBlur={() => setPasswordTouched(true)}
          error={passwordError}
          success={passwordOk && !passwordError ? PASSWORD_OK : null}
          hint={PASSWORD_HINT}
        />

        <div className="flex flex-col gap-1">
          <Checkbox checked={is16OrOlder} onChange={setIs16OrOlder}>
            I am 16 or older
          </Checkbox>
          <Checkbox checked={privacyConsent} onChange={setPrivacyConsent}>
            I agree to the{' '}
            <Link to="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">
              Privacy Notice
            </Link>
          </Checkbox>
        </div>

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {submitting ? 'Signing up…' : 'Sign up'}
        </Button>
      </form>

      <p className="mt-6 text-center text-caption text-muted">{RETAILER_NOTE}</p>
    </AuthCard>
  )
}
