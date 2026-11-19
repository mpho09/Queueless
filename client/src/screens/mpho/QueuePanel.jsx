import Card from '../../components/ui/Card.jsx'
import QueueBadge from '../../components/domain/QueueBadge.jsx'
import { formatTime } from '../../lib/format.js'

/** S3 "Current queue" panel (BR4): the level, how many recent reports it's based on, and the last one's time. */
export default function QueuePanel({ queue, offline = false }) {
  const hasReports = queue.level !== 'unknown' && queue.reportCount > 0
  const reports = `${queue.reportCount} ${queue.reportCount === 1 ? 'report' : 'reports'}`

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-caption font-semibold tracking-wide text-muted uppercase">
        Current queue{offline ? ' (cached)' : ''}
      </h2>
      <div>
        <QueueBadge level={queue.level} />
      </div>
      {hasReports ? (
        <p className="text-caption text-muted">
          Based on {reports} · {offline ? 'Cached at' : 'Last report'} {formatTime(queue.lastReportAt)}
        </p>
      ) : (
        <p className="text-caption text-muted">No recent reports. Be the first to report.</p>
      )}
      <p className="text-caption text-muted">
        {offline
          ? 'Queue reports disabled while offline.'
          : hasReports
            ? 'Recent reports count more.'
            : 'Shoppers rely on community updates.'}
      </p>
    </Card>
  )
}
