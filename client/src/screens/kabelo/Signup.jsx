import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import Button from '../../components/ui/Button.jsx'
import Checkbox from '../../components/ui/Checkbox.jsx'
import PasswordField from '../../components/ui/PasswordField.jsx'
import TextField from '../../components/ui/TextField.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { messages } from '../../lib/messages.js'
import { isValidPassword } from '../../utils/validation.js'
import AuthLayout, { Banner, safeReturnPath } from './AuthLayout.jsx'

/** A2 Sign up (/signup). Both checkboxes are required, and are sent to the database with the sign-up (#13). */
export default function Signup() {
  const { signUp, loading, isLoggedIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = safeReturnPath(location.state?.from)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [is16, setIs16] = useState(false)
  const [consent, setConsent] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!loading && isLoggedIn) return <Navigate to={from} replace />

  // The typed email and password are never cleared when something is wrong (PRD §12.2).
  const ready = email.trim() && password && is16 && consent && !passwordError && !busy

  async function handleSubmit(event) {
    event.preventDefault()
    if (!ready) return
    setError(null)
    if (!isValidPassword(password)) {
      setPasswordError(messages.passwordRules)
      return
    }
    setBusy(true)
    try {
      const { needsVerification } = await signUp(email, password, { is16OrOlder: true, privacyConsent: true })
      if (needsVerification) navigate('/verify-email', { state: { email: email.trim(), from }, replace: true })
      else navigate(from, { replace: true })
    } catch (err) {
      if (err.code === 'WEAK_PASSWORD') setPasswordError(err.message)
      else setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Create your account">
      {error && <Banner tone="error">{error.message}</Banner>}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.co.za"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setPasswordError(null)
          }}
          error={passwordError ?? undefined}
          hint="At least 8 characters, 1 uppercase letter and 1 number"
        />

        <div className="flex flex-col">
          <Checkbox checked={is16} onChange={setIs16} name="is16OrOlder">
            I am 16 or older
          </Checkbox>
          <Checkbox checked={consent} onChange={setConsent} name="privacyConsent">
            <span>
              I agree to the{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                Privacy Notice
              </Link>
            </span>
          </Checkbox>
        </div>

        <Button type="submit" className="w-full" disabled={!ready}>
          {busy ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>

      <p className="mt-6 text-center text-body text-muted">
        Already have an account?{' '}
        <Link to="/login" state={{ from }} className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
      <p className="mt-4 text-center text-caption text-muted">Retailer? Retailer accounts are approved by our team.</p>
    </AuthLayout>
  )
}
