import { Link } from 'react-router'
import CheapestPill from '../../components/domain/CheapestPill.jsx'
import StockBadge from '../../components/domain/StockBadge.jsx'
import PriceAgeBadge from '../../components/domain/PriceAgeBadge.jsx'
import { formatDate, formatTime, formatZAR } from '../../lib/format.js'

/** One store's price for a product on S2: name, price, stock, age. The cheapest row is green. */
export default function StorePriceRow({ listing, cheapest = false, justUpdated = false, cached = false }) {
  const updated = `${formatTime(listing.verifiedAt)}, ${formatDate(listing.verifiedAt)}`
  const tone = justUpdated ? 'bg-live/5' : cheapest ? 'bg-green-bg' : 'bg-bg'

  return (
    <li className={`flex items-start justify-between gap-3 px-4 py-3 ${tone}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/stores/${listing.storeId}`} className="text-body font-medium text-ink hover:text-primary hover:underline">
            {listing.storeName}
          </Link>
          {cheapest && <CheapestPill />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StockBadge status={listing.stockStatus} />
          <PriceAgeBadge verifiedAt={listing.verifiedAt} />
          <span className="text-caption text-muted">
            {justUpdated ? 'Updated just now' : `${cached ? 'Cached' : 'Updated'} ${updated}`}
          </span>
        </div>
      </div>
      <p
        className={`shrink-0 text-price font-bold ${justUpdated ? 'text-live' : cheapest ? 'text-savings' : 'text-ink'}`}
        aria-label={`${formatZAR(listing.price)} at ${listing.storeName}${cheapest ? ', cheapest' : ''}`}
      >
        {formatZAR(listing.price)}
      </p>
    </li>
  )
}
