// Input checks shared by forms. Add new checks below; keep the existing ones as they are.

// Up to 8 digits, then at most 2 decimals, e.g. 34.99. Matches listings.price_zar numeric(10,2).
const PRICE_PATTERN = /^\d{1,8}(\.\d{1,2})?$/

/** true for a price like 34.99: positive, at most 2 decimals, no letters or signs (#18). */
export function isValidPrice(value) {
  if (value === null || value === undefined) return false
  const text = String(value).trim()
  return PRICE_PATTERN.test(text) && Number(text) > 0
}

/** PRD §5 password rules: at least 8 characters, 1 uppercase letter and 1 number (#14). */
export function isValidPassword(value) {
  const text = String(value ?? '')
  return text.length >= 8 && /[A-Z]/.test(text) && /\d/.test(text)
}

/** A plausible email address: something@something.something, no spaces. Supabase checks the rest. */
export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim())
}
