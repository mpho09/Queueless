import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { AuthError } from '../../../lib/authStore.js'
import { messages } from '../../../lib/messages.js'
import Login from '../Login.jsx'
import Signup from '../Signup.jsx'
import ForgotPassword from '../ForgotPassword.jsx'
import ResetPassword from '../ResetPassword.jsx'
import VerifyEmail from '../VerifyEmail.jsx'
import Privacy from '../Privacy.jsx'

// The screens talk to Supabase only through useAuth, so each test controls it here.
let mockAuth
jest.mock('../../../hooks/useAuth.js', () => ({ useAuth: () => mockAuth }))

function guest(overrides = {}) {
  return {
    user: null,
    loading: false,
    isLoggedIn: false,
    passwordRecovery: false,
    logIn: jest.fn().mockResolvedValue({ id: 'u1' }),
    signUp: jest.fn().mockResolvedValue({ needsVerification: true }),
    resendVerification: jest.fn().mockResolvedValue(undefined),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    updatePassword: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function Where() {
  const { pathname, state } = useLocation()
  return (
    <p>
      At {pathname} {state?.email ? `for ${state.email}` : ''}
    </p>
  )
}

function renderAt(path, element, state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockAuth = guest()
})

// ── A1 Log in ───────────────────────────────────────────────────────────────────────────

describe('A1 Log in', () => {
  const fill = async (user, email = 'joy@example.com', password = 'Secret1x') => {
    await user.type(screen.getByLabelText('Email'), email)
    await user.type(screen.getByLabelText('Password'), password)
  }

  test('the Log in button waits until both fields are filled', async () => {
    const user = userEvent.setup()
    renderAt('/login', <Login />)
    const button = screen.getByRole('button', { name: 'Log in' })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('Email'), 'joy@example.com')
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('Password'), 'Secret1x')
    expect(button).toBeEnabled()
  })

  test('logs in and returns to the page the person came from', async () => {
    const user = userEvent.setup()
    renderAt('/login', <Login />, { from: '/savings' })
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(mockAuth.logIn).toHaveBeenCalledWith('joy@example.com', 'Secret1x')
    expect(await screen.findByText('At /savings')).toBeInTheDocument()
  })

  test('with no previous page it goes Home, and never to an outside address', async () => {
    const user = userEvent.setup()
    renderAt('/login', <Login />, { from: '//evil.example.com' })
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('At /')).toBeInTheDocument()
  })

  test('wrong details show "Incorrect email or password." and keep what was typed', async () => {
    mockAuth = guest({ logIn: jest.fn().mockRejectedValue(new AuthError(messages.loginFailed, 'INVALID_CREDENTIALS')) })
    const user = userEvent.setup()
    renderAt('/login', <Login />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.loginFailed)
    expect(screen.getByLabelText('Email')).toHaveValue('joy@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('Secret1x')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  test('too many attempts shows the general text', async () => {
    mockAuth = guest({ logIn: jest.fn().mockRejectedValue(new AuthError(messages.tooManyTries, 'RATE_LIMITED')) })
    const user = userEvent.setup()
    renderAt('/login', <Login />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.tooManyTries)
  })

  test('an unverified email is sent to the Verify email screen with its address', async () => {
    mockAuth = guest({ logIn: jest.fn().mockRejectedValue(new AuthError(messages.emailNotVerified, 'EMAIL_NOT_CONFIRMED')) })
    const user = userEvent.setup()
    renderAt('/login', <Login />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('At /verify-email for joy@example.com')).toBeInTheDocument()
  })

  test('shows the session-expired notice sent by other screens', () => {
    renderAt('/login', <Login />, { from: '/savings', message: messages.sessionExpired })
    expect(screen.getByRole('status')).toHaveTextContent(messages.sessionExpired)
  })

  test('someone already logged in is sent on, unless they were sent here because the session expired', () => {
    mockAuth = guest({ isLoggedIn: true, user: { id: 'u1' } })
    const { unmount } = renderAt('/login', <Login />, { from: '/basket' })
    expect(screen.getByText('At /basket')).toBeInTheDocument()
    unmount()
    renderAt('/login', <Login />, { from: '/savings', message: messages.sessionExpired })
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  test('has links for forgot password, sign up and guests; the eye shows the password', async () => {
    const user = userEvent.setup()
    renderAt('/login', <Login />)
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
    expect(screen.getByRole('link', { name: 'Continue as guest' })).toHaveAttribute('href', '/')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })
})

// ── A2 Sign up ──────────────────────────────────────────────────────────────────────────

describe('A2 Sign up', () => {
  const fillForm = async (user, password = 'Groceries2026') => {
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), password)
  }

  test('both checkboxes start unticked, and Sign up needs both', async () => {
    const user = userEvent.setup()
    renderAt('/signup', <Signup />)
    const is16 = screen.getByRole('checkbox', { name: 'I am 16 or older' })
    const consent = screen.getByRole('checkbox', { name: /I agree to the Privacy Notice/ })
    expect(is16).not.toBeChecked()
    expect(consent).not.toBeChecked()
    await fillForm(user)
    const button = screen.getByRole('button', { name: 'Sign up' })
    expect(button).toBeDisabled()
    await user.click(is16)
    expect(button).toBeDisabled() // only one of the two
    await user.click(consent)
    expect(button).toBeEnabled()
    await user.click(is16)
    expect(button).toBeDisabled()
  })

  test('the Privacy Notice link opens in a new tab so nothing typed is lost', () => {
    renderAt('/signup', <Signup />)
    const link = screen.getByRole('link', { name: 'Privacy Notice' })
    expect(link).toHaveAttribute('href', '/privacy')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  test('a weak password shows the rules text and keeps everything that was typed', async () => {
    const user = userEvent.setup()
    renderAt('/signup', <Signup />)
    await fillForm(user, 'groceries2026')
    await user.click(screen.getByRole('checkbox', { name: 'I am 16 or older' }))
    await user.click(screen.getByRole('checkbox', { name: /Privacy Notice/ }))
    await user.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(messages.passwordRules)
    expect(mockAuth.signUp).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Email')).toHaveValue('new@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('groceries2026')
    expect(screen.getByRole('checkbox', { name: 'I am 16 or older' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDisabled()

    // Editing the password clears the error so they can try again.
    await user.type(screen.getByLabelText('Password'), 'X')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled()
  })

  test('signs up with both consents, then goes to Verify email with the address', async () => {
    const user = userEvent.setup()
    renderAt('/signup', <Signup />)
    await fillForm(user)
    await user.click(screen.getByRole('checkbox', { name: 'I am 16 or older' }))
    await user.click(screen.getByRole('checkbox', { name: /Privacy Notice/ }))
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(mockAuth.signUp).toHaveBeenCalledWith('new@example.com', 'Groceries2026', { is16OrOlder: true, privacyConsent: true })
    expect(await screen.findByText('At /verify-email for new@example.com')).toBeInTheDocument()
  })

  test('a password Supabase finds weak shows the same rules text under the field', async () => {
    mockAuth = guest({ signUp: jest.fn().mockRejectedValue(new AuthError(messages.passwordRules, 'WEAK_PASSWORD')) })
    const user = userEvent.setup()
    renderAt('/signup', <Signup />)
    await fillForm(user, 'GROCERIES2026')
    await user.click(screen.getByRole('checkbox', { name: 'I am 16 or older' }))
    await user.click(screen.getByRole('checkbox', { name: /Privacy Notice/ }))
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.passwordRules)
    expect(screen.getByLabelText('Password')).toHaveValue('GROCERIES2026')
  })

  test('other failures (offline, server) show a banner and keep the form', async () => {
    mockAuth = guest({ signUp: jest.fn().mockRejectedValue(new AuthError(messages.offline, 'OFFLINE')) })
    const user = userEvent.setup()
    renderAt('/signup', <Signup />)
    await fillForm(user)
    await user.click(screen.getByRole('checkbox', { name: 'I am 16 or older' }))
    await user.click(screen.getByRole('checkbox', { name: /Privacy Notice/ }))
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.offline)
    expect(screen.getByLabelText('Email')).toHaveValue('new@example.com')
  })

  test('shows the helper text and the retailer note', () => {
    renderAt('/signup', <Signup />)
    expect(screen.getByText('At least 8 characters, 1 uppercase letter and 1 number')).toBeInTheDocument()
    expect(screen.getByText('Retailer? Retailer accounts are approved by our team.')).toBeInTheDocument()
  })
})

// ── A3 Forgot password and the reset page ───────────────────────────────────────────────

describe('A3 Forgot password', () => {
  test('sends the link, then shows the 1-hour message with the email locked and a resend button', async () => {
    const user = userEvent.setup()
    renderAt('/forgot-password', <ForgotPassword />)
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeDisabled()
    await user.type(screen.getByLabelText('Email'), 'joy@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(mockAuth.resetPassword).toHaveBeenCalledWith('joy@example.com')
    expect(await screen.findByText('Check your email. The reset link is valid for 1 hour.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')

    await user.click(screen.getByRole('button', { name: 'Resend reset link' }))
    await waitFor(() => expect(mockAuth.resetPassword).toHaveBeenCalledTimes(2))
  })

  test('a mistyped email can be corrected after sending', async () => {
    const user = userEvent.setup()
    renderAt('/forgot-password', <ForgotPassword />)
    await user.type(screen.getByLabelText('Email'), 'jon@exmaple.co.za')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    await user.click(await screen.findByRole('button', { name: 'Use a different email' }))

    const field = screen.getByLabelText('Email')
    expect(field).not.toHaveAttribute('readonly')
    await user.clear(field)
    await user.type(field, 'jon@example.co.za')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(mockAuth.resetPassword).toHaveBeenLastCalledWith('jon@example.co.za')
  })

  test('keeps the Back to log in link', () => {
    renderAt('/forgot-password', <ForgotPassword />)
    expect(screen.getByRole('link', { name: 'Back to log in' })).toHaveAttribute('href', '/login')
  })

  test('shows the error and stays on the form when sending fails', async () => {
    mockAuth = guest({ resetPassword: jest.fn().mockRejectedValue(new AuthError(messages.tooManyTries, 'RATE_LIMITED')) })
    const user = userEvent.setup()
    renderAt('/forgot-password', <ForgotPassword />)
    await user.type(screen.getByLabelText('Email'), 'joy@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.tooManyTries)
    expect(screen.queryByText(/reset link is valid/)).not.toBeInTheDocument()
  })
})

describe('Set a new password', () => {
  // Opening the reset link signs the person in and Supabase fires PASSWORD_RECOVERY.
  const link = { user: { id: 'u1' }, isLoggedIn: true, passwordRecovery: true }

  test('a logged-in session that did not come from a reset link cannot set a new password', () => {
    mockAuth = guest({ user: { id: 'u1' }, isLoggedIn: true })
    renderAt('/reset-password', <ResetPassword />)
    expect(screen.getByRole('alert')).toHaveTextContent('This reset link has expired or was already used.')
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  test('an expired or used link says so and offers a new one', () => {
    renderAt('/reset-password', <ResetPassword />)
    expect(screen.getByRole('alert')).toHaveTextContent('This reset link has expired or was already used.')
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/forgot-password')
  })

  test('shows nothing wrong while the link is still being checked', () => {
    mockAuth = guest({ loading: true })
    renderAt('/reset-password', <ResetPassword />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeDisabled()
  })

  test('the two passwords must match, and the password must follow the rules', async () => {
    mockAuth = guest(link)
    const user = userEvent.setup()
    renderAt('/reset-password', <ResetPassword />)
    await user.type(screen.getByLabelText('New password'), 'weak')
    await user.type(screen.getByLabelText('Confirm new password'), 'weak')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByText(messages.passwordRules)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('New password'))
    await user.type(screen.getByLabelText('New password'), 'Groceries2026')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(mockAuth.updatePassword).not.toHaveBeenCalled()
  })

  test('saves the new password and says so', async () => {
    mockAuth = guest(link)
    const user = userEvent.setup()
    renderAt('/reset-password', <ResetPassword />)
    await user.type(screen.getByLabelText('New password'), 'Groceries2026')
    await user.type(screen.getByLabelText('Confirm new password'), 'Groceries2026')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(mockAuth.updatePassword).toHaveBeenCalledWith('Groceries2026')
    expect(await screen.findByText('Your password has been updated.')).toBeInTheDocument()
  })
})

// ── A4 Verify email ─────────────────────────────────────────────────────────────────────

describe('A4 Verify email', () => {
  test('shows the address, the browse-only note, and resends the email', async () => {
    const user = userEvent.setup()
    renderAt('/verify-email', <VerifyEmail />, { email: 'joy@example.com' })
    expect(screen.getByText('joy@example.com')).toBeInTheDocument()
    expect(screen.getByText('Until you verify, you can browse but not save or report.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Resend email' }))
    expect(mockAuth.resendVerification).toHaveBeenCalledWith('joy@example.com')
    expect(await screen.findByText('Verification email sent.')).toBeInTheDocument()
  })

  test('"Continue browsing" goes Home', () => {
    renderAt('/verify-email', <VerifyEmail />, { email: 'joy@example.com' })
    expect(screen.getByRole('link', { name: 'Continue browsing' })).toHaveAttribute('href', '/')
  })

  test('with no known address it asks for one before resending', async () => {
    const user = userEvent.setup()
    renderAt('/verify-email', <VerifyEmail />)
    const resend = screen.getByRole('button', { name: 'Resend email' })
    expect(resend).toBeDisabled()
    await user.type(screen.getByLabelText('Email'), 'joy@example.com')
    await user.click(resend)
    expect(mockAuth.resendVerification).toHaveBeenCalledWith('joy@example.com')
  })

  test('shows an error when resending fails', async () => {
    mockAuth = guest({ resendVerification: jest.fn().mockRejectedValue(new AuthError(messages.tooManyTries, 'RATE_LIMITED')) })
    const user = userEvent.setup()
    renderAt('/verify-email', <VerifyEmail />, { email: 'joy@example.com' })
    await user.click(screen.getByRole('button', { name: 'Resend email' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(messages.tooManyTries)
  })

  test('someone who is already verified is sent Home', () => {
    mockAuth = guest({ user: { id: 'u1', email: 'joy@example.com', email_confirmed_at: '2026-11-19T10:00:00Z' }, isLoggedIn: true })
    renderAt('/verify-email', <VerifyEmail />)
    expect(screen.getByText('At /')).toBeInTheDocument()
  })
})

// ── Privacy notice ──────────────────────────────────────────────────────────────────────

describe('Privacy notice', () => {
  test('covers what is kept, the 16+ confirmation and deleting data', () => {
    renderAt('/privacy', <Privacy />)
    expect(screen.getByRole('heading', { name: 'Privacy Notice', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Email address' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Suburb preference' })).toBeInTheDocument()
    expect(screen.getByText(/16 or older/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Deleting your data' })).toBeInTheDocument()
  })
})
