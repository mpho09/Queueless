import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StoresList from '../StoresList.jsx'
import * as reportApi from '../ReportApi.js'
import { messages } from '../../../lib/messages.js'

jest.mock('../ReportApi.js', () => ({ fetchStores: jest.fn() }))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StoresList />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StoresList', () => {
  test('lists each store as a link to its page', async () => {
    reportApi.fetchStores.mockResolvedValue([
      { id: 's1', name: 'Shoprite Hatfield', address: 'Hatfield, Pretoria', opening_hours: '08:00–20:00' },
    ])
    renderPage()
    const link = await screen.findByRole('link', { name: /Shoprite Hatfield/ })
    expect(link).toHaveAttribute('href', '/stores/s1')
    expect(link).toHaveTextContent('Hatfield, Pretoria · 08:00–20:00')
  })

  test('shows the empty message when there are no stores', async () => {
    reportApi.fetchStores.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText(messages.noStores)).toBeInTheDocument()
  })

  test('shows the error state when loading fails', async () => {
    reportApi.fetchStores.mockRejectedValue(new Error(messages.serverError))
    renderPage()
    expect(await screen.findByText(messages.serverError)).toBeInTheDocument()
  })
})
