import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppShell from '../../../components/layout/AppShell.jsx'
import Savings from '../Savings.jsx'
import * as savingsApi from '../savingsApi.js'
import { emptySavings } from '../sampleSavings.js'

function ShowLocation() {
  const { pathname } = useLocation()
  return <p>At {pathname}</p>
}

function renderSavings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/savings']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="savings" element={<Savings />} />
            <Route path="*" element={<ShowLocation />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

beforeEach(() => {
  localStorage.clear()
  setOnline(true)
})

afterEach(() => {
  jest.restoreAllMocks()
  delete global.fetch
})

test('shows the profile, savings this month, points and reports', async () => {
  renderSavings()

  expect(await screen.findByText('Joy Mokoena')).toBeInTheDocument()
  expect(screen.getByText('tester.joy@queueless.co.za')).toBeInTheDocument()
  expect(screen.getByText('JM')).toBeInTheDocument()

  const saved = screen.getByRole('region', { name: 'Saved this month' })
  expect(saved).toHaveTextContent('R152.40')
  expect(saved).toHaveTextContent('November 2026')
  expect(screen.getByRole('region', { name: 'Reward points' })).toHaveTextContent('120')
  expect(screen.getByRole('region', { name: 'Reports this month' })).toHaveTextContent('8')
})

test('the chart shows the last 4 months, with the current month marked', async () => {
  renderSavings()

  const bars = within(await screen.findByRole('list', { name: 'Monthly savings' })).getAllByRole('listitem')
  expect(bars.map((b) => b.textContent)).toEqual(['R96.20Aug', 'R118.75Sep', 'R140.10Oct', 'R152.40Nov'])
  expect(bars[3]).toHaveAttribute('aria-current', 'date')
  expect(bars[0]).not.toHaveAttribute('aria-current')
})

test('recent activity lists reports with their store, time and points', async () => {
  renderSavings()

  const items = within(await screen.findByRole('list', { name: 'Recent activity' })).getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Queue report verified')
  expect(items[0]).toHaveTextContent('Shoprite Hatfield · 14:05, 11 Nov 2026')
  expect(items[0]).toHaveTextContent('+10 points')
  expect(items[1]).toHaveTextContent('Price update')
  expect(items[1]).not.toHaveTextContent('points')
})

test('a new user sees R0.00 and the start-comparing message instead of the chart', async () => {
  jest.spyOn(savingsApi, 'fetchSavings').mockResolvedValue(emptySavings)
  renderSavings()

  expect(await screen.findByText('Start comparing prices to track your savings.')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Saved this month' })).toHaveTextContent('R0.00')
  expect(screen.queryByRole('list', { name: 'Monthly savings' })).not.toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Recent activity' })).not.toBeInTheDocument()
  // Settings are still there
  expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
})

test('shows an error with a retry button when loading fails', async () => {
  const spy = jest.spyOn(savingsApi, 'fetchSavings').mockRejectedValueOnce(new Error('boom'))
  renderSavings()

  expect(await screen.findByText('Something went wrong. Try again.')).toBeInTheDocument()
  spy.mockRestore()
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('Joy Mokoena')).toBeInTheDocument()
})

test('log out asks to confirm, then returns to Home (S1)', async () => {
  renderSavings()
  await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))

  const dialog = screen.getByRole('dialog', { name: 'Log out of Queueless?' })
  expect(dialog).toHaveTextContent(
    'You will need to sign in again to submit reports and view your personal savings history.',
  )
  await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Log out' }))
  expect(await screen.findByText('At /')).toBeInTheDocument()
})

test('delete account asks to confirm with the PRD text, then calls the API', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  renderSavings()
  await userEvent.click(await screen.findByRole('button', { name: 'Delete account' }))

  const dialog = screen.getByRole('dialog', { name: 'Delete your account?' })
  expect(dialog).toHaveTextContent(
    'Your profile, email logs and saved baskets will be permanently deleted within 7 days.',
  )
  await userEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }))

  expect(global.fetch).toHaveBeenCalledWith('/api/account/delete', expect.objectContaining({ method: 'POST' }))
  expect(await screen.findByText('At /')).toBeInTheDocument()
})

test('if deleting fails, the error is shown and the user stays on S6', async () => {
  global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  renderSavings()
  await userEvent.click(await screen.findByRole('button', { name: 'Delete account' }))
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete account' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
  expect(screen.getByText('Joy Mokoena')).toBeInTheDocument()
})

test('the ⋮ account menu opens the privacy notice and log out', async () => {
  renderSavings()
  await userEvent.click(await screen.findByRole('button', { name: 'Account menu' }))

  const menu = screen.getByRole('dialog', { name: 'Account Menu' })
  expect(within(menu).getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy')
  await userEvent.click(within(menu).getByRole('button', { name: 'Log out' }))
  expect(screen.getByRole('dialog', { name: 'Log out of Queueless?' })).toBeInTheDocument()
})

test('Escape closes a dialog', async () => {
  renderSavings()
  await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('offline: account actions are disabled', async () => {
  renderSavings()
  await screen.findByText('Joy Mokoena')
  act(() => setOnline(false))

  expect(await screen.findByText("You're offline. Changes will not be saved.")).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Log out' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Delete account' })).toBeDisabled()
})
