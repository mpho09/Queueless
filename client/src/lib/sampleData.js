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
