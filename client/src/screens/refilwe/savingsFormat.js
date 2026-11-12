// Small helpers for S6 that only this screen uses.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function monthIndex(yearMonth) {
  return Number(yearMonth.slice(5, 7)) - 1
}

/** '2026-11' → 'Nov' (chart labels) */
export function monthShort(yearMonth) {
  return MONTHS[monthIndex(yearMonth)].slice(0, 3)
}

/** '2026-11' → 'November 2026' ("Saved this month" card) */
export function monthLong(yearMonth) {
  return `${MONTHS[monthIndex(yearMonth)]} ${yearMonth.slice(0, 4)}`
}

/** 'Joy Mokoena' → 'JM' (first and last name) */
export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Nothing saved and nothing reported yet → show the "Start comparing prices" state. */
export function isNewUser(savings) {
  return (
    savings.monthTotalCents === 0 &&
    savings.recent.length === 0 &&
    savings.last4Months.every((m) => m.cents === 0)
  )
}
