import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import Signup from '../Signup.jsx'
import { AuthError } from '../../../lib/authStore.js'
import { messages } from '../../../lib/messages.js'

let mockAuth
jest.mock('../../../hooks/useAuth.js', () => ({ useAuth: () => mockAuth }))

function ShowLocation() {
  const { pathname, state } = useLocation()
  return <p>{`At ${pathname}${state?.email ? ` for ${state.email}` : ''}`}</p>
}

function renderSignup(initialEntry = '/signup') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="signup" element={<Signup />} />
        <Route path="*" element={<ShowLocation />} />
      </Routes>
    </MemoryRouter>,
  )
}

const signUpButton = () => screen.getByRole('button', { name: 'Sign up' })

async function fillForm({ email = 'Joy.Shopper@Queueless.co.za', password = 'Groceries2026', is16 = true, consent = true } = {}) {
  if (email) await userEvent.type(screen.getByLabelText('Email'), email)
  if (password) await userEvent.type(screen.getByLabelText('Password'), password)
  if (is16) await userEvent.click(screen.getByLabelText('I am 16 or older'))
  if (consent) await userEvent.click(screen.getByLabelText(/I agree to the/))
}

beforeEach(() => {
  mockAuth = {
    isLoggedIn: false,
    loading: false,
    signUp: jest.fn().mockResolvedValue({ needsVerification: true }),
  }
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
})

test('shows the Stitch A2 form: fields, password hint, both checkboxes, Privacy link and the retailer note', () => {
  renderSignup()
  expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
  expect(screen.getByLabelText('Email')).toHaveAttribute('placeholder', 'you@example.co.za')
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters, 1 uppercase letter and 1 number')
  expect(screen.getByLabelText('I am 16 or older')).not.toBeChecked()
  expect(screen.getByLabelText(/I agree to the/)).not.toBeChecked()
  expect(screen.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy')
  expect(screen.getByText('Retailer? Retailer accounts are approved by our team.')).toBeInTheDocument()
  expect(signUpButton()).toBeDisabled()
})

test.each([
  ['the 16+ box', { is16: false }],
  ['the Privacy Notice box', { consent: false }],
  ['a valid email', { email: 'joy@' }],
  ['a strong enough password', { password: 'groceries2026' }],
])('Sign up stays disabled without %s', async (_, missing) => {
  renderSignup()
  await fillForm(missing)
  expect(signUpButton()).toBeDisabled()
})

test('a weak password shows the PRD message after leaving the field, and keeps what was typed', async () => {
  renderSignup()
  const password = screen.getByLabelText('Password')
  await userEvent.type(password, 'groceries2026')
  await userEvent.tab()

  expect(password).toHaveAccessibleDescription(messages.passwordRules)
  expect(password).toHaveAttribute('aria-invalid', 'true')
  expect(password).toHaveValue('groceries2026')
})

test('a valid password says "Password requirements met"', async () => {
  renderSignup()
  await userEvent.type(screen.getByLabelText('Password'), 'Groceries2026')
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Password requirements met')
})

test('signs up with both checkboxes as metadata, then goes to Verify email with the address', async () => {
  renderSignup()
  await fillForm()
  await userEvent.click(signUpButton())

  expect(mockAuth.signUp).toHaveBeenCalledWith('Joy.Shopper@Queueless.co.za', 'Groceries2026', {
    is16OrOlder: true,
    privacyConsent: true,
  })
  expect(await screen.findByText('At /verify-email for joy.shopper@queueless.co.za')).toBeInTheDocument()
})

test('if no verification is needed (confirmations off), the new shopper goes to where they came from', async () => {
  mockAuth.signUp.mockResolvedValue({ needsVerification: false })
  render(
    <MemoryRouter initialEntries={[{ pathname: '/signup', state: { from: '/savings' } }]}>
      <Routes>
        <Route path="signup" element={<Signup />} />
        <Route path="*" element={<ShowLocation />} />
      </Routes>
    </MemoryRouter>,
  )
  await fillForm()
  await userEvent.click(signUpButton())
  expect(await screen.findByText('At /savings')).toBeInTheDocument()
})

test('a weak password from Supabase shows under the password field and keeps the form', async () => {
  mockAuth.signUp.mockRejectedValue(new AuthError(messages.passwordRules, 'WEAK_PASSWORD'))
  renderSignup()
  await fillForm()
  await userEvent.click(signUpButton())

  const password = await screen.findByLabelText('Password')
  expect(password).toHaveAccessibleDescription(messages.passwordRules)
  expect(password).toHaveValue('Groceries2026')
  expect(screen.getByLabelText('Email')).toHaveValue('Joy.Shopper@Queueless.co.za')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('an email that already has an account says so, with a link to Log in', async () => {
  mockAuth.signUp.mockRejectedValue(new AuthError(messages.emailTaken, 'EMAIL_TAKEN'))
  renderSignup()
  await fillForm()
  await userEvent.click(signUpButton())

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent(messages.emailTaken)
  expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  expect(signUpButton()).toBeEnabled() // they can fix the email and try again
})

test('any other failure shows the server error and keeps what was typed', async () => {
  mockAuth.signUp.mockRejectedValue(new AuthError(messages.serverError, 'UNKNOWN'))
  renderSignup()
  await fillForm()
  await userEvent.click(signUpButton())

  expect(await screen.findByRole('alert')).toHaveTextContent(messages.serverError)
  expect(screen.getByLabelText('I am 16 or older')).toBeChecked()
})

test('offline: Sign up is disabled', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
  renderSignup()
  await fillForm()
  expect(signUpButton()).toBeDisabled()
})

test('someone already logged in is sent Home', () => {
  mockAuth.isLoggedIn = true
  renderSignup()
  expect(screen.getByText('At /')).toBeInTheDocument()
})
