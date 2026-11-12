// The shopper's basket. Guests keep it in localStorage under `queueless.basket`
// (docs/Implementation plan.md §4.3). Saving it to the `baskets` table for
// logged-in users, and merging the guest basket on log-in, comes with accounts (#13):
// use `mergeBaskets` for that.

export const BASKET_KEY = 'queueless.basket'
export const DEFAULT_TITLE = 'My basket'
const MAX_QUANTITY = 99 // basket_items.quantity check (1–99)
const MAX_TITLE = 60 // baskets.title varchar(60)

const EMPTY = Object.freeze({ title: DEFAULT_TITLE, items: Object.freeze([]) })

const clampQuantity = (n) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(Number(n) || 1)))

// ---- Pure operations: each returns a new basket ----

export function addItem(basket, productId, quantity = 1) {
  const existing = basket.items.find((i) => i.productId === productId)
  const items = existing
    ? basket.items.map((i) =>
        i.productId === productId ? { ...i, quantity: clampQuantity(i.quantity + quantity) } : i,
      )
    : [...basket.items, { productId, quantity: clampQuantity(quantity) }]
  return { ...basket, items }
}

export function setQuantity(basket, productId, quantity) {
  return {
    ...basket,
    items: basket.items.map((i) => (i.productId === productId ? { ...i, quantity: clampQuantity(quantity) } : i)),
  }
}

export function removeItem(basket, productId) {
  return { ...basket, items: basket.items.filter((i) => i.productId !== productId) }
}

export function renameBasket(basket, title) {
  const clean = String(title ?? '').trim().slice(0, MAX_TITLE)
  return { ...basket, title: clean || DEFAULT_TITLE }
}

/** On log-in: add the guest basket's quantities to the account basket (plan §4.3). */
export function mergeBaskets(account, guest) {
  return guest.items.reduce((basket, item) => addItem(basket, item.productId, item.quantity), account)
}

// ---- localStorage-backed store shared by every component ----

let memoryRaw = null // used when storage is blocked (private mode)
let lastRaw
let lastBasket = EMPTY
const listeners = new Set()

function readRaw() {
  try {
    return localStorage.getItem(BASKET_KEY)
  } catch {
    return memoryRaw
  }
}

function parse(raw) {
  if (!raw) return EMPTY
  try {
    const data = JSON.parse(raw)
    const items = Array.isArray(data?.items)
      ? data.items
          .filter((i) => typeof i?.productId === 'string')
          .map((i) => ({ productId: i.productId, quantity: clampQuantity(i.quantity) }))
      : []
    return { title: typeof data?.title === 'string' && data.title ? data.title : DEFAULT_TITLE, items }
  } catch {
    return EMPTY
  }
}

/** The current basket. Returns the same object until the stored value changes. */
export function getBasket() {
  const raw = readRaw()
  if (raw !== lastRaw) {
    lastRaw = raw
    lastBasket = parse(raw)
  }
  return lastBasket
}

export function saveBasket(basket) {
  const raw = JSON.stringify({ title: basket.title, items: basket.items })
  try {
    localStorage.setItem(BASKET_KEY, raw)
  } catch {
    memoryRaw = raw
  }
  for (const listener of listeners) listener()
}

export function subscribeBasket(listener) {
  listeners.add(listener)
  // Another tab changed the basket
  const onStorage = (e) => e.key === BASKET_KEY && listener()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
