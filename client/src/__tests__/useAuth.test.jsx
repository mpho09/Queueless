import { act, render, screen } from '@testing-library/react'

// The Jest stub for lib/supabase.js has no client; give this test a fake one.
let mockChange = () => {}
let mockSession = null
// getSession waits until the test calls this, like the network round trip in the real app.
let mockFinishSession = () => {}
jest.mock('../lib/supabase.js', () => ({
  isDev: true,
  supabase: {
    auth: {
      getSession: () => new Promise((resolve) => {
        mockFinishSession = () => resolve({ data: { session: mockSession } })
      }),
      onAuthStateChange: (cb) => {
        mockChange = cb
        return { data: { subscription: { unsubscribe() {} } } }
      },
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
}))

import { useAuth } from '../hooks/useAuth.js'

function Who() {
  const { user, loading, isLoggedIn } = useAuth()
  if (loading) return <p>Checking…</p>
  return <p>{isLoggedIn ? `Hello ${user.email}` : 'Guest'}</p>
}

test('shows loading, then the guest, then the user after a log-in event, then the guest again', async () => {
  render(<Who />)
  expect(screen.getByText('Checking…')).toBeInTheDocument()
  await act(async () => mockFinishSession())
  expect(await screen.findByText('Guest')).toBeInTheDocument()

  act(() => mockChange('SIGNED_IN', { user: { id: 'u1', email: 'joy@example.com' } }))
  expect(screen.getByText('Hello joy@example.com')).toBeInTheDocument()

  act(() => mockChange('SIGNED_OUT', null))
  expect(screen.getByText('Guest')).toBeInTheDocument()
})

test('exposes the account actions', () => {
  let auth
  function Grab() {
    auth = useAuth()
    return null
  }
  render(<Grab />)
  for (const name of ['signUp', 'logIn', 'logOut', 'resendVerification', 'resetPassword', 'updatePassword']) expect(typeof auth[name]).toBe('function')
})
