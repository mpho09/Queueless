import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GlobalHeader from '../../../components/layout/GlobalHeader.jsx'
import Savings from '../Savings.jsx'
import * as savingsApi from '../savingsApi.js'
import { sampleSavings } from '../sampleSavings.js'
import { fetchUnreadNotifications, markNotificationsRead } from '../notificationsApi.js'
import { NotificationMessage } from '../NotificationMessage.jsx'

// Logged in, with Supabase set up (as on the live site). The notifications API is faked below.
jest.mock('../../../lib/supabase.js', () => ({
  isDev: false,
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}))
let mockAuth
jest.mock('../../../hooks/useAuth.js', () => ({ useAuth: () => mockAuth }))
jest.mock('../../../lib/authStore.js', () => ({ authStore: { logOut: async () => {} } }))

let mockUnread
const mockMarkRead = jest.fn()
jest.mock('../notificationsApi.js', () => {
  const real = jest.requireActual('../notificationsApi.js')
  return {
    ...real,
    fetchUnreadNotifications: (db) => (db ? real.fetchUnreadNotifications(db) : Promise.resolve(mockUnread)),
    markNotificationsRead: (ids, db, now) => (db ? real.markNotificationsRead(ids, db, now) : mockMarkRead(ids)),
  }
})

const VERIFIED = {
  id: 'n1',
  body: 'Thank you! Your update for Shoprite Hatfield has been verified. +10 points added.',
  link_to: '/savings',
  created_at: '2026-11-19T10:00:00Z',
}

function renderApp(path) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const tree = () => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <GlobalHeader />
        <Routes>
          <Route path="savings" element={<Savings />} />
          <Route path="*" element={<p>Home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  const view = render(tree())
  return { ...view, rerenderApp: () => view.rerender(tree()) } // same cache, as in one browser tab
}

beforeEach(() => {
  mockAuth = { user: { id: 'u1' }, isLoggedIn: true, loading: false }
  mockUnread = []
  mockMarkRead.mockReset().mockResolvedValue()
  jest.spyOn(savingsApi, 'fetchSavings').mockResolvedValue(sampleSavings)
})

afterEach(() => jest.restoreAllMocks())

// ── Header dot

test('an unread notification puts a dot on the profile icon, which opens S6', async () => {
  mockUnread = [VERIFIED]
  renderApp('/')

  const profile = await screen.findByRole('link', { name: 'Your profile and savings, 1 new notification' })
  expect(profile).toHaveAttribute('href', '/savings')
  expect(screen.getByTestId('unread-dot')).toBeInTheDocument()
})

test('no unread notifications: no dot', async () => {
  renderApp('/')
  expect(await screen.findByRole('link', { name: 'Your profile and savings' })).toBeInTheDocument()
  expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument()
})

test("after another user logs in on the same tab, the previous user's dot is never shown (review of #50)", async () => {
  mockUnread = [VERIFIED] // user u1's
  const { rerenderApp } = renderApp('/')
  expect(await screen.findByTestId('unread-dot')).toBeInTheDocument()

  // u1 logs out, u2 logs in. u2's request hasn't answered yet.
  let answer
  mockUnread = new Promise((resolve) => (answer = resolve))
  mockAuth = { user: { id: 'u2' }, isLoggedIn: true, loading: false }
  rerenderApp()

  expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument() // not u1's cached one
  await act(async () => answer([]))
  expect(screen.getByRole('link', { name: 'Your profile and savings' })).toBeInTheDocument()
})

test('a guest never asks for notifications', async () => {
  mockAuth = { user: null, isLoggedIn: false, loading: false }
  mockUnread = [VERIFIED]
  renderApp('/')
  // Guests see "Log in" instead of the profile icon (#14), so there is nowhere for a dot to appear.
  expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Your profile and savings/ })).not.toBeInTheDocument()
  expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument()
})

// ── S6 toast (Stitch S6 board: dark toast above the tab bar)

// The S6 loading skeleton is also role="status", so wait for the message itself.
async function findToast() {
  const text = await screen.findByText(/has been verified/)
  return text.closest('[role="status"]')
}

test('S6 shows the verified-report message, marks it read, and the dot clears', async () => {
  mockUnread = [VERIFIED]
  renderApp('/savings')

  const toast = await findToast()
  expect(toast).toHaveTextContent('Thank you! Your update for Shoprite Hatfield has been verified. +10 points added.')
  expect(mockMarkRead).toHaveBeenCalledWith(['n1'])
  expect(screen.getByRole('link', { name: 'Your profile and savings' })).toBeInTheDocument()
  expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument()
})

test('several unread: the newest is shown, and all are marked read', async () => {
  mockUnread = [VERIFIED, { ...VERIFIED, id: 'n0', body: 'Thank you! Your update for Pick n Pay Hatfield has been verified. +10 points added.' }]
  renderApp('/savings')

  const toast = await findToast()
  expect(toast).toHaveTextContent('Shoprite Hatfield')
  expect(toast).toHaveTextContent('(+1 more)')
  expect(mockMarkRead).toHaveBeenCalledWith(['n1', 'n0'])
})

// ── Message formatting and the Supabase calls

test('"Thank you!" and "+10 points" are bold, as on the board', () => {
  const { container } = render(<NotificationMessage body={VERIFIED.body} />)
  expect([...container.querySelectorAll('strong')].map((s) => s.textContent)).toEqual(['Thank you!', '+10 points'])
})

function fakeDb(answer = { data: [VERIFIED], error: null }) {
  const calls = []
  const chain = (q) => {
    const c = {
      select: (cols) => ((q.select = cols), c),
      update: (values) => ((q.update = values), c),
      is: (col, val) => (q.filters.push(['is', col, val]), c),
      in: (col, val) => (q.filters.push(['in', col, val]), c),
      order: (col, opts) => ((q.order = [col, opts]), c),
      limit: (n) => ((q.limit = n), c),
      then: (resolve, reject) => Promise.resolve(answer).then(resolve, reject),
    }
    return c
  }
  return { calls, from: (table) => { const q = { table, filters: [] }; calls.push(q); return chain(q) } }
}

test('fetches only unread notifications, newest first (RLS limits them to the user)', async () => {
  const db = fakeDb()
  await expect(fetchUnreadNotifications(db)).resolves.toEqual([VERIFIED])
  const [q] = db.calls
  expect(q.table).toBe('notifications')
  expect(q.filters).toEqual([['is', 'read_at', null]])
  expect(q.order).toEqual(['created_at', { ascending: false }])
})

test('marking read only sets read_at on the given ids', async () => {
  const db = fakeDb({ error: null })
  await markNotificationsRead(['n1', 'n2'], db, new Date('2026-11-19T12:00:00Z'))
  const [q] = db.calls
  expect(q.update).toEqual({ read_at: '2026-11-19T12:00:00.000Z' })
  expect(q.filters).toEqual([['in', 'id', ['n1', 'n2']]])
})

test('a database error is thrown, not hidden', async () => {
  await expect(fetchUnreadNotifications(fakeDb({ data: null, error: { message: 'boom' } }))).rejects.toThrow('boom')
})
