// Sample data matching the planned supabase/seed.sql (docs/Implementation plan.md §11).
// Used only when Supabase isn't configured or its tables don't exist yet (#8),
// so the screens can be built and tested before the database is ready.

export const sampleSuburbs = [
  { id: 'sample-arcadia', name: 'Arcadia', city: 'Pretoria' },
  { id: 'sample-benoni', name: 'Benoni', city: 'Ekurhuleni' },
  { id: 'sample-hatfield', name: 'Hatfield', city: 'Pretoria' },
]

export const sampleStores = [
  { id: 'sample-shoprite-hatfield', name: 'Shoprite Hatfield', suburbId: 'sample-hatfield', suburbName: 'Hatfield', queueLevel: 'long' },
  { id: 'sample-pnp-hatfield', name: 'Pick n Pay Hatfield', suburbId: 'sample-hatfield', suburbName: 'Hatfield', queueLevel: 'short' },
  { id: 'sample-checkers-hatfield', name: 'Checkers Hatfield', suburbId: 'sample-hatfield', suburbName: 'Hatfield', queueLevel: 'moderate' },
]

export const sampleProducts = [
  { id: 'sample-milk', name: 'Clover Full Cream Milk 2L', brand: 'Clover', size: '2L' },
  { id: 'sample-bread', name: 'Albany Superior White Bread 700g', brand: 'Albany', size: '700g' },
  { id: 'sample-sugar', name: 'White Sugar 2kg', brand: 'Huletts', size: '2kg' },
  { id: 'sample-oil', name: 'Sunflower Oil 2L', brand: 'Sunfoil', size: '2L' },
]

const SHOPRITE = 'sample-shoprite-hatfield'
const PNP = 'sample-pnp-hatfield'
const CHECKERS = 'sample-checkers-hatfield'

// The listings table from docs/Implementation plan.md §11 (Checkers has no sugar; only Shoprite has oil).
export const sampleListings = [
  { productId: 'sample-milk', storeId: SHOPRITE, price: 36.99, stockStatus: 'In Stock' },
  { productId: 'sample-milk', storeId: PNP, price: 38.49, stockStatus: 'Out of Stock' },
  { productId: 'sample-milk', storeId: CHECKERS, price: 37.99, stockStatus: 'In Stock' },
  { productId: 'sample-bread', storeId: SHOPRITE, price: 18.99, stockStatus: 'Unknown' },
  { productId: 'sample-bread', storeId: PNP, price: 19.49, stockStatus: 'In Stock' },
  { productId: 'sample-bread', storeId: CHECKERS, price: 17.99, stockStatus: 'In Stock' },
  { productId: 'sample-sugar', storeId: SHOPRITE, price: 42.99, stockStatus: 'In Stock' },
  { productId: 'sample-sugar', storeId: PNP, price: 44.99, stockStatus: 'In Stock' },
  { productId: 'sample-oil', storeId: SHOPRITE, price: 64.99, stockStatus: 'Limited Stock' },
]

/** The test shopper's basket from the seed data: Milk + Bread + Sugar, one of each. */
export const sampleSeedBasket = [
  { productId: 'sample-milk', quantity: 1 },
  { productId: 'sample-bread', quantity: 1 },
  { productId: 'sample-sugar', quantity: 1 },
]
