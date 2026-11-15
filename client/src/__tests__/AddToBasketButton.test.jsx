import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import AddToBasketButton from '../components/domain/AddToBasketButton.jsx'
import GlobalHeader from '../components/layout/GlobalHeader.jsx'
import * as basketHook from '../hooks/useBasket.js'

function renderButton() {
  return render(
    <MemoryRouter>
      <GlobalHeader />
      <AddToBasketButton productId="sample-milk" productName="Clover Full Cream Milk 2L" />
      <AddToBasketButton productId="sample-bread" productName="Albany Superior White Bread 700g" />
    </MemoryRouter>,
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

afterEach(() => jest.restoreAllMocks())

test('adding items shows the toast and increments the header badge', async () => {
  renderButton()
  expect(screen.queryByRole('link', { name: /^Basket, \d/ })).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Add Clover Full Cream Milk 2L to basket' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Item added to your basket.')
  expect(screen.getByRole('link', { name: 'Basket, 1 item' })).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Add Albany Superior White Bread 700g to basket' }))
  expect(screen.getByRole('link', { name: 'Basket, 2 items' })).toBeInTheDocument()
})

test('T-US2-2: a network failure while adding shows the error message', async () => {
  const real = basketHook.useBasket
  jest.spyOn(basketHook, 'useBasket').mockImplementation(() => ({
    ...real(),
    add: () => Promise.reject(new Error('Failed to fetch')),
  }))
  renderButton()

  await userEvent.click(screen.getByRole('button', { name: 'Add Clover Full Cream Milk 2L to basket' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Action failed. Please verify your internet connection and try again.',
  )
  expect(screen.queryByText('Item added to your basket.')).not.toBeInTheDocument()
})

test('the button is disabled while offline', () => {
  setOnline(false)
  renderButton()
  expect(screen.getByRole('button', { name: 'Add Clover Full Cream Milk 2L to basket' })).toBeDisabled()
})
