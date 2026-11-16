import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StorePlaceholder from '../StorePlaceholder.jsx'
import * as reportApi from '../ReportApi.js'

jest.mock('../ReportApi.js', () => ({ fetchStore: jest.fn() }))

function renderPage(entry) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="stores/:storeId" element={<StorePlaceholder />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => reportApi.fetchStore.mockResolvedValue({ id: 's1', name: 'Shoprite Hatfield' }))

describe('StorePlaceholder (temporary S3)', () => {
  test('shows the store and a Report Queue Status button linking to the report screen', async () => {
    renderPage('/stores/s1')
    expect(await screen.findByText('Shoprite Hatfield')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Report Queue Status' })).toHaveAttribute('href', '/stores/s1/report')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('shows the thank-you toast and the location warning sent back by S5', async () => {
    renderPage({ pathname: '/stores/s1', state: { toast: 'Queue report submitted. Thank you for your contribution!', warning: 'Location mismatch alert' } })
    expect(await screen.findByText('Queue report submitted. Thank you for your contribution!')).toBeInTheDocument()
    expect(screen.getByText('Location mismatch alert')).toBeInTheDocument()
  })
})
