import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Savings from '../Savings.jsx'
import * as savingsApi from '../savingsApi.js'
import { sampleSavings } from '../sampleSavings.js'

// Logged in with Supabase set up (as on the live site).
jest.mock('../../../lib/supabase.js', () => ({
  isDev: false,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))
jest.mock('../../../hooks/useAuth.js', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'joy.mokoena@example.com' }, isLoggedIn: true, loading: false }),
}))
jest.mock('../useNotifications.js', () => ({ useNotifications: () => ({ unread: [], markRead: async () => {} }) }))

const { changeEmail } = jest.requireActual('../savingsApi.js')

function fakeClient(result = { error: null }) {
  const calls = []
  return { calls, auth: { updateUser: async (...args) => (calls.push(args), result) } }
}

// ── changeEmail(): checks first, then Supabase's secure email change

describe('changeEmail', () => {
  test('a bad address is refused before anything is sent', async () => {
    const client = fakeClient()
    await expect(changeEmail('not-an-email', 'joy@example.com', client)).rejects.toMatchObject({
      code: 'INVALID_EMAIL',
      message: 'Enter a valid email address.',
    })
    expect(client.calls).toHaveLength(0)
  })

  test('the same address (any case) is refused', async () => {
    const client = fakeClient()
    await expect(changeEmail(' Joy@Example.com ', 'joy@example.com', client)).rejects.toMatchObject({
      code: 'SAME_EMAIL',
    })
    expect(client.calls).toHaveLength(0)
  })

  test('sends the new address, trimmed and lowercase, with links back to S6', async () => {
    const client = fakeClient()
    await changeEmail('  New.Address@Example.com ', 'joy@example.com', client)
    expect(client.calls).toEqual([
      [{ email: 'new.address@example.com' }, { emailRedirectTo: `${window.location.origin}/savings` }],
    ])
  })

  test("an address another account uses gets the app's message", async () => {
    const client = fakeClient({ error: { code: 'email_exists', status: 422 } })
    await expect(changeEmail('taken@example.com', 'joy@example.com', client)).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
      message: 'An account with this email already exists.',
    })
  })

  test('too many tries gets the rate-limit message, not the raw error', async () => {
    const client = fakeClient({ error: { code: 'over_email_send_rate_limit', status: 429 } })
    await expect(changeEmail('new@example.com', 'joy@example.com', client)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    })
  })
})

// ── S6 Settings → Change email

function renderSavings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/savings']}>
        <Routes>
          <Route path="savings" element={<Savings />} />
          <Route path="*" element={<p>Elsewhere</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => jest.spyOn(savingsApi, 'fetchSavings').mockResolvedValue(sampleSavings))
afterEach(() => jest.restoreAllMocks())

async function openForm() {
  renderSavings()
  await userEvent.click(await screen.findByRole('button', { name: 'Change email' }))
  return screen.getByRole('dialog', { name: 'Change email' })
}

test('Change email opens the form, with the field focused and the current address shown', async () => {
  const dialog = await openForm()
  const field = within(dialog).getByLabelText('New email')
  expect(field).toHaveFocus()
  expect(dialog).toHaveTextContent('Current: joy.mokoena@example.com')
  expect(dialog).toHaveTextContent("We'll send a confirmation link to your current email and to the new one.")
})

test('after sending, the form closes and S6 says to check both inboxes', async () => {
  const spy = jest.spyOn(savingsApi, 'changeEmail').mockResolvedValue()
  const dialog = await openForm()
  await userEvent.type(within(dialog).getByLabelText('New email'), 'new@example.com')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Send confirmation links' }))

  expect(spy).toHaveBeenCalledWith('new@example.com', 'joy.mokoena@example.com')
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Confirmation links sent. Check both inboxes to finish changing your email.',
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('an error shows under the field and keeps what was typed', async () => {
  const { AuthError } = jest.requireActual('../../../lib/authStore.js')
  jest.spyOn(savingsApi, 'changeEmail').mockRejectedValue(new AuthError('An account with this email already exists.', 'EMAIL_TAKEN'))
  const dialog = await openForm()
  const field = within(dialog).getByLabelText('New email')
  await userEvent.type(field, 'taken@example.com')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Send confirmation links' }))

  expect(await within(dialog).findByRole('alert')).toHaveTextContent('An account with this email already exists.')
  expect(field).toHaveValue('taken@example.com')
})
