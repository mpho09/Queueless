import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import VerifyEmail from '../VerifyEmail.jsx'
import { AuthError } from '../../../lib/authStore.js'
import { messages } from '../../../lib/messages.js'

let mockAuth
jest.mock('../../../hooks/useAuth.js', () => ({ useAuth: () => mockAuth }))

function renderVerify(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/verify-email', state }]}>
      <Routes>
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockAuth = { user: null, resendVerification: jest.fn().mockResolvedValue(undefined) }
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
})

test('shows the Stitch A4 text with the address from Sign up', () => {
  renderVerify({ email: 'tester.joy@queueless.co.za' })
  expect(screen.getByRole('heading', { level: 1, name: 'Verify your email' })).toBeInTheDocument()
  expect(screen.getByText('tester.joy@queueless.co.za')).toBeInTheDocument()
  expect(screen.getByText('Until you verify, you can browse but not save or report.')).toBeInTheDocument()
})

test('falls back to the logged-in user’s address', () => {
  mockAuth.user = { email: 'logged.in@queueless.co.za' }
  renderVerify()
  expect(screen.getByText('logged.in@queueless.co.za')).toBeInTheDocument()
})

test('Resend email sends the link again and confirms it', async () => {
  renderVerify({ email: 'tester.joy@queueless.co.za' })
  await userEvent.click(screen.getByRole('button', { name: 'Resend email' }))

  expect(mockAuth.resendVerification).toHaveBeenCalledWith('tester.joy@queueless.co.za')
  expect(await screen.findByRole('status')).toHaveTextContent('We sent a new link to tester.joy@queueless.co.za.')
})

test('a failed resend shows the error', async () => {
  mockAuth.resendVerification.mockRejectedValue(new AuthError(messages.serverError, 'RATE_LIMITED'))
  renderVerify({ email: 'tester.joy@queueless.co.za' })
  await userEvent.click(screen.getByRole('button', { name: 'Resend email' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(messages.serverError)
})

test('without an address (opened directly) or offline, Resend is disabled', () => {
  const { unmount } = renderVerify()
  expect(screen.getByText('We sent a link to your email address.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Resend email' })).toBeDisabled()
  unmount()

  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
  renderVerify({ email: 'tester.joy@queueless.co.za' })
  expect(screen.getByRole('button', { name: 'Resend email' })).toBeDisabled()
})

test('Continue browsing goes Home', async () => {
  renderVerify({ email: 'tester.joy@queueless.co.za' })
  await userEvent.click(screen.getByRole('link', { name: 'Continue browsing' }))
  expect(screen.getByText('Home page')).toBeInTheDocument()
})
