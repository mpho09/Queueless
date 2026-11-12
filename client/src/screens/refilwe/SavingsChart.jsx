import Card from '../../components/ui/Card.jsx'
import { formatZAR } from '../../lib/format.js'
import { monthShort } from './savingsFormat.js'
import { savingsText } from './savingsText.js'

const BAR_AREA = 160 // px, tallest bar

/**
 * 4-month bar chart. Past months are teal, the current (last) month is green.
 * Each bar is a list item with its amount and month as text, so screen readers get the numbers.
 */
export default function SavingsChart({ months }) {
  const max = Math.max(...months.map((m) => m.cents), 1)
  const current = months.length - 1

  return (
    <Card as="section" aria-labelledby="chart-heading" className="flex flex-col gap-2 p-4 sm:p-6">
      <h2 id="chart-heading" className="text-body font-semibold text-ink sm:text-[24px] sm:leading-8">
        Monthly savings
      </h2>
      <p className="hidden text-body text-muted sm:block">{savingsText.chartIntro}</p>

      <ul aria-label="Monthly savings" className="mt-4 flex items-end justify-around gap-3 border-b border-border pb-3">
        {months.map((m, i) => {
          const isCurrent = i === current
          const height = Math.max(4, Math.round((m.cents / max) * BAR_AREA))
          return (
            <li
              key={m.month}
              aria-current={isCurrent ? 'date' : undefined}
              className="flex w-16 flex-col items-center gap-2"
            >
              <span className={`text-caption font-medium ${isCurrent ? 'text-savings' : 'text-ink'}`}>
                {formatZAR(m.cents / 100)}
              </span>
              <div
                aria-hidden="true"
                style={{ height }}
                className={`w-10 rounded-t sm:w-16 ${isCurrent ? 'bg-savings' : 'bg-primary'}`}
              />
              <span className={`text-caption ${isCurrent ? 'font-semibold text-savings' : 'text-muted'}`}>
                {monthShort(m.month)}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="hidden justify-between text-caption sm:flex">
        <span className="text-muted">Historical months: Teal</span>
        <span className="text-savings">Current month: Green</span>
      </div>
    </Card>
  )
}
