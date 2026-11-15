import { act, render, screen } from '@testing-library/react'
import OfflineBanner from '../components/feedback/OfflineBanner.jsx'

function setOnline(value) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

afterEach(() => setOnline(true))

test('is hidden while online', () => {
  setOnline(true)
  render(<OfflineBanner />)
  expect(screen.queryByText("You're offline. Changes will not be saved.")).not.toBeInTheDocument()
})

test('appears when the connection drops and hides when it returns', () => {
  setOnline(true)
  render(<OfflineBanner />)

  act(() => setOnline(false))
  expect(screen.getByRole('status')).toHaveTextContent("You're offline. Changes will not be saved.")

  act(() => setOnline(true))
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
