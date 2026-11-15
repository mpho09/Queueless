import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchResults from '../SearchResults.jsx'

// Supabase is replaced by a null stub in tests (src/__mocks__/supabase.js), so search uses the sample data.

function ShowLocation() {
  const { pathname, search } = useLocation()
  return <p data-testid="location">{pathname + search}</p>
}

function renderSearch(path) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/search" element={<><SearchResults /><ShowLocation /></>} />
          <Route path="*" element={<ShowLocation />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => localStorage.clear())

test('T-US1-1: lists matching products with store prices, lowest first', async () => {
  renderSearch('/search?q=White%20Sugar%202kg')

  const card = await screen.findByRole('article', { name: 'White Sugar 2kg' })
  const prices = within(card).getAllByText(/^R\d/).map((el) => el.textContent)
  expect(prices).toEqual(['R42.99', 'R44.99'])
  expect(within(card).getByText('Cheapest')).toBeInTheDocument()
  expect(within(card).getByText('Huletts • 2kg')).toBeInTheDocument()
  expect(screen.getByText('1 result')).toBeInTheDocument()
  expect(screen.getByText(/in Hatfield • Sorted by lowest price/)).toBeInTheDocument()
})

test('BR1: a price older than 48 hours shows "Unverified for 2 days"', async () => {
  renderSearch('/search?q=White%20Sugar%202kg')
  const card = await screen.findByRole('article', { name: 'White Sugar 2kg' })
  expect(within(card).getAllByText('Unverified for 2 days')).toHaveLength(1)
})

test('T-US1-2: no matches shows the exact message', async () => {
  renderSearch('/search?q=Quinoa%20Organic%201kg')
  expect(
    await screen.findByText('No products found matching your search term. Please try another product name.'),
  ).toBeInTheDocument()
  expect(screen.getByText('0 results')).toBeInTheDocument()
})

test('each product has an Add to Basket button', async () => {
  renderSearch('/search?q=l')
  const cards = await screen.findAllByRole('article')
  for (const card of cards) {
    expect(within(card).getByRole('button', { name: /^Add .* to basket$/ })).toBeInTheDocument()
  }
})

test('Load more is hidden when every result is already shown', async () => {
  renderSearch('/search?q=l')
  await screen.findAllByRole('article')
  expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
})

test('a new search updates the address', async () => {
  const user = userEvent.setup()
  renderSearch('/search?q=sugar')
  await screen.findByRole('article', { name: 'White Sugar 2kg' })

  const box = screen.getByRole('searchbox', { name: 'Search a product' })
  await user.clear(box)
  await user.type(box, 'Clover')
  await user.click(screen.getByRole('button', { name: 'Search' }))

  expect(screen.getByTestId('location')).toHaveTextContent('/search?q=Clover')
  expect(await screen.findByRole('article', { name: 'Clover Full Cream Milk 2L' })).toBeInTheDocument()
})

test('with no search text it asks the shopper to search', () => {
  renderSearch('/search')
  expect(screen.getByText('Search for a product to compare prices at nearby stores.')).toBeInTheDocument()
})

test('tapping a store opens its Store Details page', async () => {
  const user = userEvent.setup()
  renderSearch('/search?q=White%20Sugar%202kg')
  const card = await screen.findByRole('article', { name: 'White Sugar 2kg' })
  await user.click(within(card).getByRole('link', { name: 'Shoprite Hatfield' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/stores/sample-shoprite-hatfield')
})
