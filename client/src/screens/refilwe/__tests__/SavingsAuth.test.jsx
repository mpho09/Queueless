import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Savings from '../Savings.jsx'
import * as savingsApi from '../savingsApi.js'
import { sampleSavings } from '../sampleSavings.js'
import { ApiError } from '../../../lib/api.js'

// S6 with Supabase set up (as on the live site): only logged-in users may see it.
jest.mock('../../../lib/supabase.js', () => ({
  isDev: false,
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}))

let mockAuth
jest.mock('../../../hooks/useAuth.js', () => ({ useAuth: () => mockAuth }))

const mockLogOut = jest.fn()
jest.mock('../../../lib/authStore.js', () => ({ authStore: { logOut: (...args) => mockLogOut(...args) } }))

function ShowLocation() {
  const { pathname, state } = useLocation()
  return (
    <p>
      At {pathname}
      {state?.from && ` from ${state.from}`}
      {state?.message && ` | ${state.message}`}
    </p>
  )
}

function renderSavings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/savings']}>
        <Routes>
          <Route path="savings" element={<Savings />} />
          <Route path="*" element={<ShowLocation />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockAuth = { user: { id: 'u1' }, isLoggedIn: true, loading: false }
  mockLogOut.mockReset().mockImplementation(async () => {
    mockAuth = { user: null, isLoggedIn: false, loading: false } // like the real store: user leaves at once
  })
})

afterEach(() => jest.restoreAllMocks())

test('a guest is sent to Log in, and S6 never asks the API', async () => {
  mockAuth = { user: null, isLoggedIn: false, loading: false }
  const fetchSavings = jest.spyOn(savingsApi, 'fetchSavings')
  renderSavings()

  expect(await screen.findByText('At /login from /savings')).toBeInTheDocument()
  expect(fetchSavings).not.toHaveBeenCalled()
})

test('while we check who is logged in: a skeleton, no request and no redirect yet', () => {
  mockAuth = { user: null, isLoggedIn: false, loading: true }
  const fetchSavings = jest.spyOn(savingsApi, 'fetchSavings')
  renderSavings()

  expect(screen.getByRole('status', { name: 'Loading your savings' })).toBeInTheDocument()
  expect(screen.queryByText(/At \/login/)).not.toBeInTheDocument()
  expect(fetchSavings).not.toHaveBeenCalled()
})

test('a logged-in user sees their savings', async () => {
  jest.spyOn(savingsApi, 'fetchSavings').mockResolvedValue(sampleSavings)
  renderSavings()

  expect(await screen.findByText('Joy Mokoena')).toBeInTheDocument()
})

test('an expired session goes to Log in with the session message', async () => {
  jest
    .spyOn(savingsApi, 'fetchSavings')
    .mockRejectedValue(new ApiError('Session expired. Please log in again to save your changes.', 401, 'UNAUTHORIZED'))
  renderSavings()

  expect(
    await screen.findByText('At /login from /savings | Session expired. Please log in again to save your changes.'),
  ).toBeInTheDocument()
})

test('log out signs out through the auth store and lands on Home, not Log in', async () => {
  jest.spyOn(savingsApi, 'fetchSavings').mockResolvedValue(sampleSavings)
  renderSavings()
  await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Log out' }))

  expect(await screen.findByText('At /')).toBeInTheDocument()
  expect(mockLogOut).toHaveBeenCalledTimes(1)
})

test('if log out fails, the error shows and the user stays on S6', async () => {
  jest.spyOn(savingsApi, 'fetchSavings').mockResolvedValue(sampleSavings)
  mockLogOut.mockReset().mockRejectedValue(new Error("You're offline. Changes will not be saved."))
  renderSavings()
  await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Log out' }))

  expect(await screen.findByRole('alert')).toHaveTextContent("You're offline. Changes will not be saved.")
  expect(screen.getByText('Joy Mokoena')).toBeInTheDocument()
})
