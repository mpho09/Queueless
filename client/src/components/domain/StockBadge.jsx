import { Check, CircleHelp, TriangleAlert, X } from 'lucide-react'

// Stock levels from the database (stock_status enum). Always icon + text, never colour alone.
const STOCK = {
  'In Stock': { className: 'text-savings', Icon: Check },
  'Limited Stock': { className: 'text-amber-text', Icon: TriangleAlert },
  'Out of Stock': { className: 'text-red', Icon: X },
  Unknown: { className: 'text-muted', Icon: CircleHelp },
}

/** "✓ In Stock", "⚠ Limited Stock", "✕ Out of Stock" or "? Unknown". Shared by S2 (#11) and S3 (#12). */
export default function StockBadge({ status }) {
  const label = STOCK[status] ? status : 'Unknown'
  const { className, Icon } = STOCK[label]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 text-caption font-medium ${className}`}>
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </span>
  )
}
