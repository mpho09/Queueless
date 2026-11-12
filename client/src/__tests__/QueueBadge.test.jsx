import { render, screen } from '@testing-library/react'
import QueueBadge from '../components/domain/QueueBadge.jsx'

test.each([
  ['none', 'No Queue'],
  ['short', 'Short Line (under 10 Mins Wait)'],
  ['moderate', 'Moderate Line (10–30 Mins Wait)'],
  ['long', 'Long Line (30+ Mins Wait)'],
  ['unknown', 'Unknown'],
  [undefined, 'Unknown'],
])('level %p shows "%s"', (level, text) => {
  render(<QueueBadge level={level} />)
  expect(screen.getByText(text)).toBeInTheDocument()
})
