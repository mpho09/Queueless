import { basketTotals, chainName } from '../utils/basketTotals.js'
import { sampleListings, sampleProducts, sampleSeedBasket, sampleStores } from '../lib/sampleData.js'

const prices = { products: sampleProducts, stores: sampleStores, listings: sampleListings }

describe('BR3 basket totals (seed basket: Milk + Bread + Sugar)', () => {
  const result = basketTotals(sampleSeedBasket, prices)
  const byName = Object.fromEntries(result.stores.map((s) => [s.name, s]))

  test('T-US2-1: totals per store match the seed data', () => {
    expect(byName['Shoprite Hatfield'].total).toBe(98.97)
    expect(byName['Pick n Pay Hatfield'].total).toBe(102.97)
    expect(byName['Checkers Hatfield'].total).toBe(55.98)
  })

  test('Checkers is missing the sugar, the others are complete', () => {
    expect(byName['Checkers Hatfield'].complete).toBe(false)
    expect(byName['Checkers Hatfield'].missing.map((m) => m.name)).toEqual(['White Sugar 2kg'])
    expect(byName['Checkers Hatfield'].available.map((a) => a.name)).toEqual([
      'Clover Full Cream Milk 2L',
      'Albany Superior White Bread 700g',
    ])
    expect(byName['Shoprite Hatfield'].complete).toBe(true)
    expect(byName['Pick n Pay Hatfield'].complete).toBe(true)
  })

  test('a store with missing items is never marked Cheapest, even when its total is lowest', () => {
    expect(byName['Checkers Hatfield'].cheapest).toBe(false)
    expect(byName['Shoprite Hatfield'].cheapest).toBe(true)
    expect(result.cheapest.name).toBe('Shoprite Hatfield')
  })

  test('the saving is R4.00 (2nd-cheapest complete minus cheapest complete)', () => {
    expect(result.saving).toBe(4)
    expect(byName['Pick n Pay Hatfield'].difference).toBe(4)
  })

  test('complete stores come first, cheapest first; incomplete stores come after', () => {
    expect(result.stores.map((s) => s.name)).toEqual([
      'Shoprite Hatfield',
      'Pick n Pay Hatfield',
      'Checkers Hatfield',
    ])
  })

  test('an Out of Stock item still counts towards the total (plan §6 BR3)', () => {
    const milk = byName['Pick n Pay Hatfield'].available.find((a) => a.productId === 'sample-milk')
    expect(milk.stockStatus).toBe('Out of Stock')
    expect(byName['Pick n Pay Hatfield'].complete).toBe(true)
  })
})

test('quantities multiply the price, with no floating-point drift', () => {
  const result = basketTotals(
    [
      { productId: 'sample-milk', quantity: 3 },
      { productId: 'sample-bread', quantity: 1 },
    ],
    prices,
  )
  const shoprite = result.stores.find((s) => s.name === 'Shoprite Hatfield')
  expect(shoprite.total).toBe(129.96) // 3 × 36.99 + 18.99
  expect(shoprite.available[0].lineTotal).toBe(110.97)
})

test('with only one complete store there is no saving', () => {
  const result = basketTotals([{ productId: 'sample-oil', quantity: 1 }], prices)
  expect(result.cheapest.name).toBe('Shoprite Hatfield')
  expect(result.saving).toBeNull()
})

test('stores that carry none of the basket items are left out', () => {
  const result = basketTotals([{ productId: 'sample-oil', quantity: 1 }], prices)
  expect(result.stores.map((s) => s.name)).toEqual(['Shoprite Hatfield'])
})

test('when no store is complete, nothing is Cheapest', () => {
  const result = basketTotals(
    [
      { productId: 'sample-sugar', quantity: 1 },
      { productId: 'sample-oil', quantity: 1 },
    ],
    { ...prices, listings: sampleListings.filter((l) => l.storeId !== 'sample-shoprite-hatfield') },
  )
  expect(result.cheapest).toBeNull()
  expect(result.saving).toBeNull()
  expect(result.stores.every((s) => !s.cheapest)).toBe(true)
})

test('an empty basket gives no stores', () => {
  expect(basketTotals([], prices)).toEqual({ stores: [], cheapest: null, saving: null })
})

test('chainName drops the suburb from the store name, for the savings banner', () => {
  expect(chainName({ name: 'Shoprite Hatfield', suburbName: 'Hatfield' })).toBe('Shoprite')
  expect(chainName({ name: 'Pick n Pay Hatfield', suburbName: 'Hatfield' })).toBe('Pick n Pay')
  expect(chainName({ name: 'Spar', suburbName: 'Hatfield' })).toBe('Spar')
})
