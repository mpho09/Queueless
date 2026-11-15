import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  addItem,
  getBasket,
  removeItem,
  renameBasket,
  saveBasket,
  setQuantity,
  subscribeBasket,
} from '../lib/basketStore.js'

const update = (change) => saveBasket(change(getBasket()))

/**
 * The shopper's basket (guest basket in localStorage for now; see lib/basketStore.js).
 * `add` is async so callers already handle a failed save once baskets are stored in Supabase (#13).
 */
export function useBasket() {
  const basket = useSyncExternalStore(subscribeBasket, getBasket, getBasket)

  const add = useCallback(async (productId, quantity = 1) => {
    update((b) => addItem(b, productId, quantity))
  }, [])
  const changeQuantity = useCallback((productId, quantity) => update((b) => setQuantity(b, productId, quantity)), [])
  const remove = useCallback((productId) => update((b) => removeItem(b, productId)), [])
  const rename = useCallback((title) => update((b) => renameBasket(b, title)), [])

  return useMemo(
    () => ({
      title: basket.title,
      items: basket.items,
      count: basket.items.length,
      add,
      setQuantity: changeQuantity,
      remove,
      rename,
    }),
    [basket, add, changeQuantity, remove, rename],
  )
}
