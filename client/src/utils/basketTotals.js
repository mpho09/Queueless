// BR3: basket totals with missing items (docs/Implementation plan.md §6).
// Money is added up in cents so totals like R98.97 come out exact.

const toCents = (rands) => Math.round(Number(rands) * 100)
const toRands = (cents) => cents / 100

/**
 * @param {{ productId: string, quantity: number }[]} items  the basket
 * @param {{ products: object[], stores: object[], listings: object[] }} prices
 *   products: { id, name }, stores: { id, name, suburbName?, queueLevel? },
 *   listings: { productId, storeId, price, stockStatus }
 * @returns {{ stores: object[], cheapest: object|null, saving: number|null }}
 *   Each store: total, available[], missing[], complete, cheapest, difference (vs the cheapest complete store).
 */
export function basketTotals(items, { products = [], stores = [], listings = [] } = {}) {
  if (items.length === 0) return { stores: [], cheapest: null, saving: null }

  const productName = new Map(products.map((p) => [p.id, p.name]))
  const priceAt = new Map(listings.map((l) => [`${l.storeId}|${l.productId}`, l]))

  const rows = stores
    .map((store) => {
      const available = []
      const missing = []
      let totalCents = 0
      for (const { productId, quantity } of items) {
        const name = productName.get(productId) ?? ''
        const listing = priceAt.get(`${store.id}|${productId}`)
        if (!listing) {
          missing.push({ productId, name })
          continue
        }
        // An Out of Stock item still counts: the store carries it (plan §6 BR3).
        const lineCents = toCents(listing.price) * quantity
        totalCents += lineCents
        available.push({
          productId,
          name,
          quantity,
          price: Number(listing.price),
          lineTotal: toRands(lineCents),
          stockStatus: listing.stockStatus,
        })
      }
      return { ...store, totalCents, available, missing, complete: missing.length === 0 }
    })
    // A store that carries none of the items has nothing to compare.
    .filter((row) => row.available.length > 0)

  const complete = rows.filter((r) => r.complete).sort((a, b) => a.totalCents - b.totalCents)
  const incomplete = rows
    .filter((r) => !r.complete)
    .sort((a, b) => a.missing.length - b.missing.length || a.totalCents - b.totalCents)

  const best = complete[0] ?? null
  const savingCents = complete.length > 1 ? complete[1].totalCents - best.totalCents : null

  const ordered = [...complete, ...incomplete].map(({ totalCents, ...row }) => ({
    ...row,
    total: toRands(totalCents),
    cheapest: best !== null && row.id === best.id,
    difference: row.complete && best ? toRands(totalCents - best.totalCents) : null,
  }))

  return {
    stores: ordered,
    cheapest: ordered.find((s) => s.cheapest) ?? null,
    saving: savingCents === null ? null : toRands(savingCents),
  }
}

/** "Shoprite Hatfield" → "Shoprite", for "…by choosing Shoprite today." */
export function chainName({ name, suburbName }) {
  if (suburbName && name.endsWith(` ${suburbName}`)) return name.slice(0, -suburbName.length - 1)
  return name
}
