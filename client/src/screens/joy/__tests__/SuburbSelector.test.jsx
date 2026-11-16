import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import SuburbSelector, { ALL_SUBURBS } from '../SuburbSelector.jsx'
import { useSuburb } from '../../../hooks/useSuburb.js'
import { fetchSuburbs } from '../../../lib/data.js'

function TestHarness() {
  const [savedSuburbId, setSuburbId] = useSuburb()
  const suburbs = useQuery({ queryKey: ['suburbs'], queryFn: fetchSuburbs })
  const suburbList = suburbs.data ?? []
  const activeId = savedSuburbId ?? suburbList[0]?.id ?? ''
  const activeSuburb = suburbList.find((s) => s.id === activeId)

  return (
    <SuburbSelector
      suburbs={suburbList}
      value={activeId}
      suburbName={activeSuburb?.name}
      onChange={setSuburbId}
      ready={suburbs.isSuccess}
    />
  )
}

function renderHarness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TestHarness />
    </QueryClientProvider>,
  )
}

beforeEach(() => localStorage.clear())

test('selects a seeded suburb, shows status text, and clears back to all suburbs', async () => {
  renderHarness()

  await screen.findByRole('option', { name: /Hatfield/ })
  const select = screen.getByLabelText('Your suburb')

  fireEvent.change(select, { target: { value: 'sample-arcadia' } })
  expect(localStorage.getItem('queueless.suburbId')).toBe('sample-arcadia')
  expect(screen.getByText('Showing stores in Arcadia')).toBeInTheDocument()

  const clearBtn = screen.getByRole('button', { name: 'Clear suburb filter' })
  fireEvent.click(clearBtn)
  expect(localStorage.getItem('queueless.suburbId')).toBe(ALL_SUBURBS)
  expect(screen.getByText('Showing stores in all suburbs')).toBeInTheDocument()
})
