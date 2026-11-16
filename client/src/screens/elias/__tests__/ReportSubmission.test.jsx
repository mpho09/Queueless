import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReportSubmission from '../ReportSubmission.jsx'
import * as reportApi from '../ReportApi.js'
import { messages } from '../../../lib/messages.js'

// Only the calls that talk to Supabase / the browser are replaced; the error mapping is the real one.
jest.mock('../ReportApi.js', () => ({
  ...jest.requireActual('../ReportApi.js'),
  fetchStore: jest.fn(),
  fetchListings: jest.fn(),
  getShopperLocation: jest.fn(),
  submitReport: jest.fn(),
}))

const store = { id: 's1', name: 'Shoprite Hatfield', latitude: -25.7479, longitude: 28.2293 }
const listings = [{ id: 'l1', name: 'Clover Full Cream Milk', size: '2L', priceZar: 34.99, stockStatus: 'In Stock' }]

function ShowStorePage() {
  const { pathname, state } = useLocation()
  return (
    <div>
      <p>At {pathname}</p>
      <p>{state?.toast}</p>
      <p>{state?.warning}</p>
    </div>
  )
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/stores/s1/report']}>
        <Routes>
          <Route path="stores/:storeId/report" element={<ReportSubmission />} />
          <Route path="stores/:storeId" element={<ShowStorePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'))
  })
}

const confirmButton = () => screen.getByRole('button', { name: /^Confirm/ })

async function chooseLongLine(user) {
  await screen.findByText(store.name)
  await user.click(screen.getByRole('radio', { name: 'Long Line (30+ Mins Wait)' }))
}

beforeEach(() => {
  jest.clearAllMocks()
  setOnline(true)
  reportApi.fetchStore.mockResolvedValue(store)
  reportApi.fetchListings.mockResolvedValue(listings)
  reportApi.getShopperLocation.mockResolvedValue(null)
  reportApi.submitReport.mockResolvedValue(undefined)
})

describe('ReportSubmission (S5)', () => {
  test('selecting Long Line and confirming submits the report, then returns to the store with the thank-you toast', async () => {
    const user = userEvent.setup()
    renderScreen()
    await chooseLongLine(user)
    await user.click(confirmButton())

    await waitFor(() =>
      expect(reportApi.submitReport).toHaveBeenCalledWith(
        expect.objectContaining({ storeId: 's1', reportType: 'Queue', value: 'long', locationMismatch: false }),
      ),
    )
    expect(await screen.findByText('At /stores/s1')).toBeInTheDocument()
    expect(screen.getByText('Queue report submitted. Thank you for your contribution!')).toBeInTheDocument()
  })

  test('the queue limit error shows the queue limit message and blocks Confirm', async () => {
    // The database raises BR2_LIMIT (P0001); the screen turns that into the exact PRD text.
    reportApi.submitReport.mockRejectedValue({ code: 'P0001', message: 'BR2_LIMIT', details: 'queue' })
    const user = userEvent.setup()
    renderScreen()
    await chooseLongLine(user)
    await user.click(confirmButton())

    expect(await screen.findByText(messages.queueLimit)).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
  })

  test('an invalid price shows the invalid price message and blocks Confirm', async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByText(store.name)
    await user.click(screen.getByRole('tab', { name: 'Price' }))
    await user.selectOptions(await screen.findByLabelText('Product'), 'l1')
    await user.type(screen.getByLabelText('New price (R)'), '34.999')

    expect(screen.getByText(messages.invalidPrice)).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()

    await user.clear(screen.getByLabelText('New price (R)'))
    await user.type(screen.getByLabelText('New price (R)'), '34.99')
    expect(screen.queryByText(messages.invalidPrice)).not.toBeInTheDocument()
    expect(confirmButton()).toBeEnabled()
  })

  test('a Retailer or unverified user sees the forbidden message', async () => {
    reportApi.submitReport.mockRejectedValue({ code: '42501', message: 'new row violates row-level security policy' })
    const user = userEvent.setup()
    renderScreen()
    await chooseLongLine(user)
    await user.click(confirmButton())

    expect(await screen.findByText(messages.forbidden)).toBeInTheDocument()
  })

  test('more than 50 km away: the report is still saved, flagged as a location mismatch', async () => {
    reportApi.getShopperLocation.mockResolvedValue({ latitude: -26.2041, longitude: 28.0473 }) // Johannesburg
    const user = userEvent.setup()
    renderScreen()
    await chooseLongLine(user)
    await user.click(confirmButton())

    await waitFor(() => expect(reportApi.submitReport).toHaveBeenCalledWith(expect.objectContaining({ locationMismatch: true })))
    expect(await screen.findByText(messages.locationMismatch)).toBeInTheDocument()
  })

  test('Confirm is disabled while offline', async () => {
    const user = userEvent.setup()
    renderScreen()
    await chooseLongLine(user)
    expect(confirmButton()).toBeEnabled()

    setOnline(false)
    await waitFor(() => expect(confirmButton()).toBeDisabled())
  })
})
