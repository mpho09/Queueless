import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppShell from '../components/layout/AppShell.jsx'
import Basket from '../pages/Basket.jsx'
import { BASKET_KEY } from '../lib/basketStore.js'
import { sampleSeedBasket } from '../lib/sampleData.js'

function ShowLocation() {
  const { pathname } = useLocation()
  return <p>At {pathname}</p>
}

function renderBasket() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/basket']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="basket" element={<Basket />} />
            <Route path="*" element={<ShowLocation />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function seedBasket(items = sampleSeedBasket, title = 'My basket') {
  localStorage.setItem(BASKET_KEY, JSON.stringify({ title, items }))
}

const storeCards = () => within(screen.getByRole('list', { name: 'Compare stores' })).getAllByRole('listitem')

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

beforeEach(() => {
  localStorage.clear()
  setOnline(true)
})

test('an empty basket shows the empty message and a way to search', async () => {
  renderBasket()
  expect(await screen.findByText('Your basket is empty. Search for a product to start.')).toBeInTheDocument()
  expect(screen.getByText('0 items')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('link', { name: 'Search products' }))
  expect(screen.getByText('At /')).toBeInTheDocument()
})

test('T-US2-1: the seed basket shows the items and the correct totals per store', async () => {
  seedBasket()
  renderBasket()

  const items = await screen.findByRole('list', { name: 'Basket items' })
  expect(within(items).getAllByRole('listitem')).toHaveLength(3)
  expect(screen.getByText('3 items')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Basket, 3 items' })).toBeInTheDocument()

  expect(await screen.findByText(/You are saving/)).toHaveTextContent(
    'Great choice! You are saving R4.00 on this basket selection by choosing Shoprite today.',
  )

  const [shoprite, pnp, checkers] = storeCards()
  expect(shoprite).toHaveTextContent('Shoprite Hatfield')
  expect(shoprite).toHaveTextContent('R98.97')
  expect(shoprite).toHaveTextContent('Cheapest')
  expect(shoprite).toHaveTextContent('Long Line (30+ Mins Wait)')

  expect(pnp).toHaveTextContent('Pick n Pay Hatfield')
  expect(pnp).toHaveTextContent('R102.97')
  expect(pnp).toHaveTextContent('+R4.00')
  expect(pnp).not.toHaveTextContent('Cheapest')

  expect(checkers).toHaveTextContent('Checkers Hatfield')
  expect(checkers).toHaveTextContent('R55.98')
  expect(checkers).toHaveTextContent('Missing 1 Item')
  expect(checkers).toHaveTextContent('2 of 3 items priced')
  expect(checkers).toHaveTextContent('White Sugar 2kg: Price unavailable at this branch')
  expect(checkers).not.toHaveTextContent('Cheapest')
})

test('the item breakdown opens and closes', async () => {
  seedBasket()
  renderBasket()
  await screen.findByText(/You are saving/)

  const [shoprite] = storeCards()
  const toggle = within(shoprite).getByRole('button', { name: 'View item breakdown' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await userEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  expect(toggle).toHaveTextContent('Hide item breakdown')
  const breakdown = within(shoprite).getByRole('list', { name: 'Item breakdown' })
  expect(breakdown).toHaveTextContent('Clover Full Cream Milk 2LR36.99')
  expect(within(shoprite).getByText('Store Total').parentElement).toHaveTextContent('R98.97')
})

test('changing a quantity updates the totals', async () => {
  seedBasket()
  renderBasket()
  await screen.findByText(/You are saving/)

  await userEvent.click(screen.getByRole('button', { name: 'Increase Clover Full Cream Milk 2L' }))
  expect(screen.getByLabelText('Quantity of Clover Full Cream Milk 2L')).toHaveTextContent('2')
  expect(storeCards()[0]).toHaveTextContent('R135.96') // 98.97 + 36.99

  await userEvent.click(screen.getByRole('button', { name: 'Decrease Clover Full Cream Milk 2L' }))
  expect(storeCards()[0]).toHaveTextContent('R98.97')
  // The stepper never goes below 1; the bin removes the item
  expect(screen.getByRole('button', { name: 'Decrease Clover Full Cream Milk 2L' })).toBeDisabled()
})

test('removing an item updates the comparison', async () => {
  seedBasket()
  renderBasket()
  await screen.findByText(/You are saving/)

  await userEvent.click(screen.getByRole('button', { name: 'Remove White Sugar 2kg' }))
  expect(screen.getByText('2 items')).toBeInTheDocument()
  // Without sugar Checkers carries everything, so no store is missing items any more
  expect(await screen.findByText('R57.98')).toBeInTheDocument() // Pick n Pay: 38.49 + 19.49
  expect(screen.queryByText(/Missing/)).not.toBeInTheDocument()
  expect(storeCards()).toHaveLength(3)
})

test('no savings banner when the two cheapest stores cost the same', async () => {
  // Milk + Bread: Shoprite and Checkers are both R55.98, so there is nothing to save
  seedBasket(sampleSeedBasket.slice(0, 2))
  renderBasket()
  expect(await screen.findByRole('list', { name: 'Compare stores' })).toBeInTheDocument()
  expect(screen.queryByText(/You are saving/)).not.toBeInTheDocument()
})

test('the basket can be renamed', async () => {
  seedBasket()
  renderBasket()

  await userEvent.click(screen.getByRole('button', { name: 'Rename basket' }))
  const input = screen.getByRole('textbox', { name: 'Basket name' })
  await userEvent.clear(input)
  await userEvent.type(input, 'Month-end shop{Enter}')

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Month-end shop')
  expect(JSON.parse(localStorage.getItem(BASKET_KEY)).title).toBe('Month-end shop')
})

test('tapping a store header opens that store (S3)', async () => {
  seedBasket()
  renderBasket()
  await screen.findByText(/You are saving/)

  await userEvent.click(screen.getByRole('link', { name: 'Pick n Pay Hatfield' }))
  expect(screen.getByText('At /stores/sample-pnp-hatfield')).toBeInTheDocument()
})

test('offline: shows cached data and disables every change', async () => {
  seedBasket()
  renderBasket()
  await screen.findByText(/You are saving/)

  setOnline(false)
  expect(await screen.findByText("You're offline. Changes will not be saved.")).toBeInTheDocument()
  expect(screen.getByText('Cached (3 items)')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Compare stores (Cached)' })).toBeInTheDocument()
  expect(screen.getByText(/Cached comparison/)).toHaveTextContent('Cached comparison: Saving R4.00 at Shoprite today.')
  expect(storeCards()[0]).toHaveTextContent(/Queue: Cached \d{2}:\d{2}/)

  expect(screen.getByRole('button', { name: 'Rename basket' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Increase Clover Full Cream Milk 2L' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Remove White Sugar 2kg' })).toBeDisabled()
})
