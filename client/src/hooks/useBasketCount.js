import { useBasket } from './useBasket.js'

/** Number of products in the shopper's basket, for the header badge. */
export function useBasketCount() {
  return useBasket().count
}
