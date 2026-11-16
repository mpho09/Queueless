import { isStale, STALE_LABEL } from '../../../utils/priceAge.js'

const HOUR = 60 * 60 * 1000
const now = new Date('2026-11-16T12:00:00Z').getTime()
const hoursAgo = (h) => new Date(now - h * HOUR).toISOString()

describe('BR1 price age', () => {
  test('47 hours old: not stale (no badge)', () => {
    expect(isStale(hoursAgo(47), now)).toBe(false)
  })

  test('exactly 48 hours old: not stale (must be MORE than 48 h)', () => {
    expect(isStale(hoursAgo(48), now)).toBe(false)
  })

  test('49 hours old: stale (badge)', () => {
    expect(isStale(hoursAgo(49), now)).toBe(true)
  })

  test('a missing or invalid date is never stale', () => {
    expect(isStale(null, now)).toBe(false)
    expect(isStale('not a date', now)).toBe(false)
  })

  test('badge text matches the plan', () => {
    expect(STALE_LABEL).toBe('Unverified for 2 days')
  })
})
