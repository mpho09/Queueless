import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import Button from '../../components/ui/Button.jsx'
import PasswordField from '../../components/ui/PasswordField.jsx'
import TextField from '../../components/ui/TextField.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import AuthLayout, { Banner, safeReturnPath } from './AuthLayout.jsx'

/** A1 Log in (/login). Other screens send guests here with state `{ from, message }`. */
export default function Login() {
  const { logIn, loading, isLoggedIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = safeReturnPath(location.state?.from)
  const notice = location.state?.message // e.g. "Session expired. Please log in again…"

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Already logged in (e.g. after the verification link): nothing to do here.
  // Not when we were sent here because the session expired, or we would bounce back and forth.
  if (!loading && isLoggedIn && !notice) return <Navigate to={from} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await logIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err.code === 'EMAIL_NOT_CONFIRMED') {
        navigate('/verify-email', { state: { email: email.trim(), from } })
        return
      }
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const wrongDetails = error?.code === 'INVALID_CREDENTIALS'

  return (
    <AuthLayout title="Log in">
      {error ? <Banner tone="error">{error.message}</Banner> : notice ? <Banner tone="warning">{notice}</Banner> : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          placeholder="you@example.co.za"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          invalid={wrongDetails}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          invalid={wrongDetails}
        />

        <Link to="/forgot-password" className="-mt-2 inline-flex min-h-11 items-center self-end text-body font-semibold text-primary hover:underline">
          Forgot password?
        </Link>

        <Button type="submit" className="w-full" disabled={busy || !email.trim() || !password}>
          {busy ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-body text-muted">
        New to Queueless?{' '}
        <Link to="/signup" state={{ from }} className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>
      <Link to="/" className="mt-2 flex min-h-11 items-center justify-center text-body text-ink hover:text-primary">
        Continue as guest
      </Link>
    </AuthLayout>
  )
}
