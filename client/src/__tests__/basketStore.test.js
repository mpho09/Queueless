import { act, renderHook } from '@testing-library/react'
import {
  BASKET_KEY,
  DEFAULT_TITLE,
  addItem,
  mergeBaskets,
  removeItem,
  renameBasket,
  setQuantity,
} from '../lib/basketStore.js'
import { useBasket } from '../hooks/useBasket.js'

const empty = { title: DEFAULT_TITLE, items: [] }

describe('basket operations', () => {
  test('adding a new product puts it in with quantity 1', () => {
    expect(addItem(empty, 'milk').items).toEqual([{ productId: 'milk', quantity: 1 }])
  })

  test('adding a product that is already there increases its quantity', () => {
    const basket = addItem(addItem(empty, 'milk'), 'milk')
    expect(basket.items).toEqual([{ productId: 'milk', quantity: 2 }])
  })

  test('quantity stays between 1 and 99 (schema check)', () => {
    const basket = addItem(empty, 'milk')
    expect(setQuantity(basket, 'milk', 0).items[0].quantity).toBe(1)
    expect(setQuantity(basket, 'milk', 150).items[0].quantity).toBe(99)
    expect(setQuantity(basket, 'milk', 5).items[0].quantity).toBe(5)
    expect(addItem(setQuantity(basket, 'milk', 99), 'milk').items[0].quantity).toBe(99)
  })

  test('removing a product takes it out', () => {
    const basket = addItem(addItem(empty, 'milk'), 'bread')
    expect(removeItem(basket, 'milk').items).toEqual([{ productId: 'bread', quantity: 1 }])
  })

  test('renaming trims the title, caps it at 60 characters and falls back to "My basket"', () => {
    expect(renameBasket(empty, '  Month-end shop ').title).toBe('Month-end shop')
    expect(renameBasket(empty, '   ').title).toBe(DEFAULT_TITLE)
    expect(renameBasket(empty, 'x'.repeat(80)).title).toHaveLength(60)
  })

  test('operations never change the basket they were given', () => {
    const basket = addItem(empty, 'milk')
    setQuantity(basket, 'milk', 4)
    removeItem(basket, 'milk')
    expect(basket.items).toEqual([{ productId: 'milk', quantity: 1 }])
  })

  test('merging a guest basket into an account basket adds the quantities (plan §4.3)', () => {
    const account = { title: 'Weekly', items: [{ productId: 'milk', quantity: 2 }] }
    const guest = {
      title: DEFAULT_TITLE,
      items: [
        { productId: 'milk', quantity: 98 },
        { productId: 'bread', quantity: 1 },
      ],
    }
    expect(mergeBaskets(account, guest)).toEqual({
      title: 'Weekly',
      items: [
        { productId: 'milk', quantity: 99 },
        { productId: 'bread', quantity: 1 },
      ],
    })
  })
})

describe('useBasket (guest basket in localStorage)', () => {
  beforeEach(() => localStorage.clear())

  test('starts empty', () => {
    const { result } = renderHook(() => useBasket())
    expect(result.current.items).toEqual([])
    expect(result.current.title).toBe(DEFAULT_TITLE)
    expect(result.current.count).toBe(0)
  })

  test('saves changes under queueless.basket so they survive a page refresh', async () => {
    const { result, unmount } = renderHook(() => useBasket())
    await act(() => result.current.add('milk'))
    act(() => result.current.rename('Month-end'))
    unmount()

    expect(JSON.parse(localStorage.getItem(BASKET_KEY))).toEqual({
      title: 'Month-end',
      items: [{ productId: 'milk', quantity: 1 }],
    })
    const { result: reloaded } = renderHook(() => useBasket())
    expect(reloaded.current.items).toEqual([{ productId: 'milk', quantity: 1 }])
    expect(reloaded.current.title).toBe('Month-end')
  })

  test('every component using the basket sees the same change (header badge stays in sync)', async () => {
    const a = renderHook(() => useBasket())
    const b = renderHook(() => useBasket())
    await act(() => a.result.current.add('milk'))
    await act(() => a.result.current.add('bread'))
    expect(b.result.current.count).toBe(2)
    act(() => b.result.current.remove('milk'))
    expect(a.result.current.items).toEqual([{ productId: 'bread', quantity: 1 }])
  })

  test('ignores broken data in localStorage', () => {
    localStorage.setItem(BASKET_KEY, '{not json')
    const { result } = renderHook(() => useBasket())
    expect(result.current.items).toEqual([])
  })
})
