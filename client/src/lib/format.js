// Formatting for South Africa (PRD §12.1 locale rules).
// Intl gives "R 1 234,50" in some browsers, so currency is formatted by hand.

const TIME_ZONE = 'Africa/Johannesburg'

/** 1234.5 → "R1,234.50"; -12 → "-R12.00" */
export function formatZAR(amount) {
  const value = Number(amount)
  if (amount === null || amount === '' || !Number.isFinite(value)) return ''
  const sign = value < 0 ? '-' : ''
  const [rands, cents] = Math.abs(value).toFixed(2).split('.')
  const withCommas = rands.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}R${withCommas}.${cents}`
}

function parts(date, options) {
  const d = date instanceof Date ? date : new Date(date)
  const result = {}
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, ...options })
  for (const { type, value } of formatter.formatToParts(d)) result[type] = value
  return result
}

/** → "12 Mar 2026" in SAST */
export function formatDate(date) {
  const p = parts(date, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${p.day} ${p.month} ${p.year}`
}

/** → "14:05" (24-hour, SAST) */
export function formatTime(date) {
  const p = parts(date, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return `${p.hour}:${p.minute}`
}

/** → "12 Mar 14:05" (used for cached-data timestamps) */
export function formatDateTime(date) {
  return `${formatDate(date).split(' ').slice(0, 2).join(' ')} ${formatTime(date)}`
}
