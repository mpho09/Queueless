import { Package } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import AddToBasketButton from '../../components/domain/AddToBasketButton.jsx'
import StorePriceRow from './StorePriceRow.jsx'

/** One product on S2 with every store's price, cheapest first, and "Add to Basket". */
export default function ProductResultCard({ product, changed, cached }) {
  const headingId = `product-${product.id}`
  return (
    <Card as="article" aria-labelledby={headingId} className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-card border border-border bg-surface-soft sm:size-14">
          <Package aria-hidden="true" className="size-6 text-muted" />
        </span>
        <div className="min-w-0">
          <h2 id={headingId} className="text-card-title font-semibold text-ink">
            {product.name}
          </h2>
          <p className="text-caption text-muted sm:text-body">
            {product.brand} • {product.size}
          </p>
        </div>
      </div>

      <ul aria-label={`Prices for ${product.name}, lowest first`} className="divide-y divide-border overflow-hidden rounded-card border border-border">
        {product.listings.map((listing, i) => (
          <StorePriceRow
            key={listing.listingId}
            listing={listing}
            cheapest={i === 0}
            justUpdated={changed?.has(listing.listingId)}
            cached={cached}
          />
        ))}
      </ul>

      <AddToBasketButton productId={product.id} productName={product.name} className="w-full" />
    </Card>
  )
}
