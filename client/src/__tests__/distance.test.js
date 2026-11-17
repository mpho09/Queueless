import { distanceKm, isTooFarFromStore, MAX_REPORT_DISTANCE_KM } from '../utils/distance.js'

describe('distanceKm', () => {
  test('the same point is 0 km away', () => {
    expect(distanceKm(-25.7479, 28.2293, -25.7479, 28.2293)).toBe(0)
  })

  test('one degree of latitude is about 111 km', () => {
    expect(distanceKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1)
  })

  test('Hatfield to Johannesburg is roughly 54 km', () => {
    const km = distanceKm(-25.7479, 28.2293, -26.2041, 28.0473)
    expect(km).toBeGreaterThan(52)
    expect(km).toBeLessThan(56)
  })

  test('the distance is the same in both directions', () => {
    expect(distanceKm(-25.7, 28.2, -26.2, 28.0)).toBeCloseTo(distanceKm(-26.2, 28.0, -25.7, 28.2), 6)
  })
})

describe('isTooFarFromStore', () => {
  const store = { latitude: -25.7479, longitude: 28.2293 }

  test('the limit is 50 km', () => {
    expect(MAX_REPORT_DISTANCE_KM).toBe(50)
  })

  test('a shopper at the store is not too far', () => {
    expect(isTooFarFromStore({ latitude: -25.7479, longitude: 28.2293 }, store)).toBe(false)
  })

  test('a shopper in Johannesburg (about 54 km) is too far', () => {
    expect(isTooFarFromStore({ latitude: -26.2041, longitude: 28.0473 }, store)).toBe(true)
  })

  test('no check when the store or the shopper has no coordinates', () => {
    expect(isTooFarFromStore(null, store)).toBe(false)
    expect(isTooFarFromStore({ latitude: -26.2, longitude: 28 }, { latitude: null, longitude: null })).toBe(false)
  })
})
