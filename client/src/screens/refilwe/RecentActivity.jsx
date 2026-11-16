import Card from '../../components/ui/Card.jsx'
import { formatDate, formatTime } from '../../lib/format.js'
import { savingsText } from './savingsText.js'

/** Latest reports and savings: title, "+10 points" when points were earned, store and time. */
export default function RecentActivity({ items }) {
  return (
    <Card as="section" aria-labelledby="activity-heading" className="flex flex-col gap-2 p-4 sm:p-6">
      <h2 id="activity-heading" className="text-body font-semibold text-ink sm:text-[24px] sm:leading-8">
        Recent activity
      </h2>
      <ul aria-label="Recent activity" className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-body font-medium text-ink">{item.title}</p>
              {item.points > 0 && (
                <span className="shrink-0 rounded-full bg-green-bg px-2 py-0.5 text-caption font-semibold text-savings">
                  +{item.points} points
                </span>
              )}
            </div>
            <p className="text-caption text-muted">
              {item.storeName} · {formatTime(item.at)}, {formatDate(item.at)}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-auto hidden border-t border-border pt-3 text-center text-caption text-muted sm:block">
        {savingsText.pointsNote}
      </p>
    </Card>
  )
}
