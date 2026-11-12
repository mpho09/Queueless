import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppShell from '../components/layout/AppShell.jsx'
import Home from '../pages/Home.jsx'

function ShowLocation() {
  const { pathname, search } = useLocation()
  return <p>At {pathname + search}</p>
}

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="*" element={<ShowLocation />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => localStorage.clear())

test('shows the nearby stores in Hatfield with their queue levels', async () => {
  renderHome()

  const list = await screen.findByRole('list', { name: 'Nearby stores' })
  const rows = within(list).getAllByRole('link')
  expect(rows).toHaveLength(3)
  expect(rows[0]).toHaveTextContent('Shoprite Hatfield')
  expect(rows[0]).toHaveTextContent('Long Line (30+ Mins Wait)')
  expect(rows[1]).toHaveTextContent('Pick n Pay Hatfield')
  expect(rows[1]).toHaveTextContent('Short Line (under 10 Mins Wait)')
  expect(screen.getByText('Showing stores in Hatfield')).toBeInTheDocument()
  expect(screen.getByLabelText('Your suburb')).toHaveDisplayValue('Hatfield')
})

test('changing the suburb filters the stores and is remembered', async () => {
  const user = userEvent.setup()
  renderHome()
  await screen.findByText('Shoprite Hatfield')

  await user.selectOptions(screen.getByLabelText('Your suburb'), 'Arcadia')

  expect(await screen.findByText('No stores found in this suburb yet.')).toBeInTheDocument()
  expect(screen.getByText('Showing stores in Arcadia')).toBeInTheDocument()
  expect(localStorage.getItem('queueless.suburbId')).toBe('sample-arcadia')
})

test('searching opens the results page with the search term', async () => {
  const user = userEvent.setup()
  renderHome()

  await user.type(screen.getByRole('searchbox', { name: 'Search a product' }), 'White Sugar 2kg')
  await user.click(screen.getByRole('button', { name: 'Search' }))

  expect(screen.getByText('At /search?q=White%20Sugar%202kg')).toBeInTheDocument()
})

test('an empty search stays on Home', async () => {
  const user = userEvent.setup()
  renderHome()

  await user.click(screen.getByRole('button', { name: 'Search' }))

  expect(screen.getByRole('heading', { name: 'Find the cheapest store near you.' })).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: 'Search a product' })).toHaveFocus()
})

test('shows the empty basket message and the shared layout', async () => {
  renderHome()
  await screen.findByText('Shoprite Hatfield')

  expect(screen.getByText('Your basket is empty. Search for a product to start.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/privacy')
  expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2) // desktop nav + tab bar
  expect(screen.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument()
})

test('shows the active basket summary with the cheapest store, linking to S4', async () => {
  localStorage.setItem(
    'queueless.basket',
    JSON.stringify({
      title: 'My basket',
      items: [
        { productId: 'sample-milk', quantity: 1 },
        { productId: 'sample-bread', quantity: 1 },
        { productId: 'sample-sugar', quantity: 1 },
      ],
    }),
  )
  renderHome()

  const summary = await screen.findByRole('link', { name: /View basket/ })
  expect(summary).toHaveTextContent('3 items • Cheapest at Shoprite Hatfield')
  expect(summary).toHaveTextContent('R98.97')
  expect(screen.queryByText('Your basket is empty. Search for a product to start.')).not.toBeInTheDocument()

  await userEvent.click(summary)
  expect(screen.getByText('At /basket')).toBeInTheDocument()
})
