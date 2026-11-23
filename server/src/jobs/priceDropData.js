// The database side of the price-drop job (#20): the two functions runPriceDropCheck (priceDrop.js)
// is given. Uses the service role; the data comes from migration price_drop_watch.

/** Every active basket with its owner's email, last total and cheapest complete store (BR3). */
export async function getActiveBaskets(db) {
  const { data, error } = await db.rpc('price_drop_candidates')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    basketId: row.basket_id,
    email: row.email,
    lastTotalCents: row.last_total_cents,
    cheapest: row.total_cents == null ? null : { storeName: row.store_name, totalCents: row.total_cents },
  }))
}

/** Remembers the total we compare against next time ("the price when we last told you"). */
export async function saveLastTotal(db, basketId, totalCents, now = new Date()) {
  const { error } = await db
    .from('basket_price_watch')
    .upsert({ basket_id: basketId, last_total_cents: totalCents, updated_at: now.toISOString() })
  if (error) throw new Error(error.message)
}
