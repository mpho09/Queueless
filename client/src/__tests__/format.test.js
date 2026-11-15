import { formatDate, formatDateTime, formatTime, formatZAR } from '../lib/format.js'

describe('formatZAR', () => {
  test('formats rands with a comma and two decimals', () => {
    expect(formatZAR(1234.5)).toBe('R1,234.50')
  })

  test.each([
    [0, 'R0.00'],
    [36.99, 'R36.99'],
    [98.97, 'R98.97'],
    [1000000, 'R1,000,000.00'],
    ['42.5', 'R42.50'],
    [-12, '-R12.00'],
  ])('%p → %p', (input, expected) => {
    expect(formatZAR(input)).toBe(expected)
  })

  test('returns an empty string for missing values', () => {
    expect(formatZAR(null)).toBe('')
    expect(formatZAR(undefined)).toBe('')
    expect(formatZAR('abc')).toBe('')
  })
})

describe('dates and times (Africa/Johannesburg)', () => {
  // 12:05 UTC is 14:05 SAST
  const date = new Date('2026-03-12T12:05:00Z')

  test('formatDate → "12 Mar 2026"', () => {
    expect(formatDate(date)).toBe('12 Mar 2026')
  })

  test('formatTime uses the 24-hour clock in SAST', () => {
    expect(formatTime(date)).toBe('14:05')
    expect(formatTime('2026-03-12T21:30:00Z')).toBe('23:30')
  })

  test('formatDateTime → "12 Mar 14:05"', () => {
    expect(formatDateTime(date)).toBe('12 Mar 14:05')
  })
})
