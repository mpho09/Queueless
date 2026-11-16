// Input checks shared by forms. Add new checks below; keep the existing ones as they are.

// Up to 8 digits, then at most 2 decimals, e.g. 34.99. Matches listings.price_zar numeric(10,2).
const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/

/** true for a price like 34.99: positive, at most 2 decimals, no letters or signs (#18). */
export function isValidPrice(value) {
  if (value === null || value === undefined) return false
  const text = String(value).trim()
  return PRICE_PATTERN.test(text) && Number(text) > 0
}
