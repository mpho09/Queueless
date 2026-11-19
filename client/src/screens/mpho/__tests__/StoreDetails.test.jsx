import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StoreDetails from '../StoreDetails.jsx'

// Supabase is a null stub in tests (src/__mocks__/supabase.js), so S3 uses the sample data.

let mockLoggedIn = false
jest.mock('../../../hooks/useAuth.js', () => ({
  useAuth: () => ({ isLoggedIn: mockLoggedIn, user: mockLoggedIn ? { id: 'u1' } : null, loading: false }),
}))

let mockOnline = true
jest.mock('../../../hooks/useOnline.js', () => ({ useOnline: () => mockOnline }))

afterEach(() => {
  mockLoggedIn = false
  mockOnline = true
})

function ShowLocation() {
  const { pathname, state } = useLocation()
  return <p data-testid="location">{`${pathname} ${state?.tab ?? ''} ${state?.from ?? ''}`.trim()}</p>
}

function renderStore(entry) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/stores/:storeId" element={<StoreDetails />} />
          <Route path="*" element={<ShowLocation />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('S3 Store Details', () => {
  test('shows the store, its queue level and its prices', async () => {
    renderStore('/stores/sample-shoprite-hatfield')

    expect(await screen.findByRole('heading', { name: 'Shoprite Hatfield', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Hatfield, Pretoria')).toBeInTheDocument()
    expect(screen.getByText('Open today 08:00–20:00')).toBeInTheDocument()
    expect(screen.getByText('Long Line (30+ Mins Wait)')).toBeInTheDocument()
    expect(screen.getByText(/Based on 3 reports · Last report/)).toBeInTheDocument()

    const prices = within(screen.getByRole('region', { name: 'Prices at this store' })).getAllByRole('listitem')
    expect(prices.map((li) => within(li).getAllByText(/\S/)[0].textContent)).toEqual([
      'Albany Superior White Bread 700g',
      'Clover Full Cream Milk 2L',
      'Sunflower Oil 2L',
      'White Sugar 2kg',
    ])
    expect(within(prices[3]).getByText('Huletts · 2kg')).toBeInTheDocument()
    expect(within(prices[3]).getByLabelText(/42[.,]99 for White Sugar 2kg/)).toBeInTheDocument()
    expect(within(prices[3]).getByRole('button', { name: 'Add White Sugar 2kg to basket' })).toBeInTheDocument()
  })

  test('a guest who taps Report Queue Status gets the sign-in sheet', async () => {
    renderStore('/stores/sample-pnp-hatfield')
    await userEvent.click(await screen.findByRole('button', { name: 'Report Queue Status' }))

    const sheet = screen.getByRole('dialog', { name: 'Sign in required' })
    expect(within(sheet).getByText('Log in to report queue or price updates.')).toBeInTheDocument()
    expect(within(sheet).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')

    await userEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('the sign-in sheet remembers where the guest came from', async () => {
    renderStore('/stores/sample-pnp-hatfield')
    await userEvent.click(await screen.findByRole('button', { name: 'Update Store Price' }))
    await userEvent.click(screen.getByRole('link', { name: 'Log in' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/login /stores/sample-pnp-hatfield')
  })

  test.each([
    ['Report Queue Status', 'queue'],
    ['Update Store Price', 'price'],
  ])('a logged-in shopper tapping %s opens S5 on the %s tab', async (button, tab) => {
    mockLoggedIn = true
    renderStore('/stores/sample-checkers-hatfield')
    await userEvent.click(await screen.findByRole('button', { name: button }))
    expect(screen.getByTestId('location')).toHaveTextContent(`/stores/sample-checkers-hatfield/report ${tab}`)
  })

  test('shows the thank-you toast and the location warning sent back by S5', async () => {
    renderStore({
      pathname: '/stores/sample-shoprite-hatfield',
      state: { toast: 'Queue report submitted. Thank you for your contribution!', warning: 'Location mismatch alert' },
    })
    expect(await screen.findByText('Queue report submitted. Thank you for your contribution!')).toBeInTheDocument()
    expect(screen.getByText('Location mismatch alert')).toBeInTheDocument()
  })

  test('an unknown store shows "not found" with a link to all stores', async () => {
    renderStore('/stores/sample-nowhere')
    expect(await screen.findByText('This store could not be found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See all stores' })).toHaveAttribute('href', '/stores')
  })

  test('offline: cached labels and the report buttons are disabled', async () => {
    mockOnline = false
    renderStore('/stores/sample-shoprite-hatfield')
    expect(await screen.findByText('Current queue (cached)')).toBeInTheDocument()
    expect(screen.getByText('Queue reports disabled while offline.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Report Queue Status' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Update Store Price' })).toBeDisabled()
  })
})
