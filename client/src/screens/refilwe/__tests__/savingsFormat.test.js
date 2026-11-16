import { initials, isNewUser, monthLong, monthShort } from '../savingsFormat.js'
import { emptySavings, sampleSavings } from '../sampleSavings.js'

test('month labels for the chart and the "Saved this month" card', () => {
  expect(monthShort('2026-08')).toBe('Aug')
  expect(monthShort('2026-11')).toBe('Nov')
  expect(monthLong('2026-11')).toBe('November 2026')
  expect(monthLong('2027-01')).toBe('January 2027')
})

test('initials for the profile avatar', () => {
  expect(initials('Joy Mokoena')).toBe('JM')
  expect(initials('  refilwe  ')).toBe('R')
  expect(initials('Mary Jane Smith')).toBe('MS')
  expect(initials('')).toBe('?')
})

test('a user with no savings and no activity is a new user', () => {
  expect(isNewUser(emptySavings)).toBe(true)
  expect(isNewUser(sampleSavings)).toBe(false)
  expect(isNewUser({ ...emptySavings, recent: sampleSavings.recent })).toBe(false)
})
