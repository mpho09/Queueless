import { queueLevel, reportWeight } from '../../../utils/queueDecay.js'

const NOW = new Date('2026-11-19T12:00:00Z').getTime()
const minutesAgo = (min) => new Date(NOW - min * 60000).toISOString()

describe('BR4 report weight', () => {
  test.each([
    [0, 0.8],
    [15, 0.8],
    [67.5, 0.4],
    [120, 0],
  ])('a report %s min old weighs %s', (age, weight) => {
    expect(reportWeight(age)).toBeCloseTo(weight, 10)
  })

  test('older than 120 min or from the future counts for nothing', () => {
    expect(reportWeight(500)).toBe(0)
    expect(reportWeight(-1)).toBe(0)
  })
})

describe('BR4 queue level', () => {
  test('no reports is Unknown', () => {
    expect(queueLevel([], NOW)).toBe('unknown')
  })

  test('only reports older than 120 min is Unknown', () => {
    expect(queueLevel([{ level: 'long', createdAt: minutesAgo(121) }], NOW)).toBe('unknown')
  })

  test('recent reports of one level give that level', () => {
    const reports = [
      { level: 'long', createdAt: minutesAgo(2) },
      { level: 'long', createdAt: minutesAgo(10) },
    ]
    expect(queueLevel(reports, NOW)).toBe('long')
  })

  test('fresh short + fresh long average to moderate (same as the SQL test)', () => {
    const reports = [
      { level: 'short', createdAt: minutesAgo(5) },
      { level: 'long', createdAt: minutesAgo(5) },
      { level: 'none', createdAt: minutesAgo(119) },
    ]
    expect(queueLevel(reports, NOW)).toBe('moderate')
  })

  test('a fresh report outweighs an old one', () => {
    const reports = [
      { level: 'none', createdAt: minutesAgo(100) },
      { level: 'long', createdAt: minutesAgo(1) },
    ]
    expect(queueLevel(reports, NOW)).toBe('long')
  })

  test('unknown level values are ignored', () => {
    expect(queueLevel([{ level: 'huge', createdAt: minutesAgo(1) }], NOW)).toBe('unknown')
  })
})
