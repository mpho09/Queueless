-- Seed data (docs/IMPLEMENTATION_PLAN.md §11). TEST DATA ONLY: never real users or real prices.
-- Loaded by `npm run db:seed`. Fixed IDs + "on conflict do nothing" make it safe to run again.
-- Test accounts are NOT created here: see server/scripts/seed-users.js (#14).

-- ── Suburbs ─────────────────────────────────────────────────────────────────────────────
insert into public.suburbs (id, name, city) values
  ('10000000-0000-4000-8000-000000000001', 'Hatfield', 'Pretoria'),
  ('10000000-0000-4000-8000-000000000002', 'Arcadia',  'Pretoria'),
  ('10000000-0000-4000-8000-000000000003', 'Benoni',   'Ekurhuleni')
on conflict do nothing;

-- ── Stores (all in Hatfield) ────────────────────────────────────────────────────────────
insert into public.stores (id, name, suburb_id, address, opening_hours, latitude, longitude) values
  ('20000000-0000-4000-8000-000000000001', 'Shoprite Hatfield',   '10000000-0000-4000-8000-000000000001', 'Hatfield, Pretoria', '08:00–20:00', -25.748700, 28.238000),
  ('20000000-0000-4000-8000-000000000002', 'Pick n Pay Hatfield', '10000000-0000-4000-8000-000000000001', 'Hatfield, Pretoria', '08:00–20:00', -25.750200, 28.236500),
  ('20000000-0000-4000-8000-000000000003', 'Checkers Hatfield',   '10000000-0000-4000-8000-000000000001', 'Hatfield, Pretoria', '08:00–20:00', -25.746900, 28.240100)
on conflict do nothing;

-- ── Products (placeholder barcodes) ─────────────────────────────────────────────────────
insert into public.products (id, barcode, product_name, brand_label, volumetric_size) values
  ('30000000-0000-4000-8000-000000000001', '6000000000011', 'Clover Full Cream Milk 2L',        'Clover',  '2L'),
  ('30000000-0000-4000-8000-000000000002', '6000000000022', 'Albany Superior White Bread 700g', 'Albany',  '700g'),
  ('30000000-0000-4000-8000-000000000003', '6000000000033', 'White Sugar 2kg',                  'Huletts', '2kg'),
  ('30000000-0000-4000-8000-000000000004', '6000000000044', 'Sunflower Oil 2L',                 'Sunfoil', '2L')
on conflict do nothing;

-- ── Listings: price and stock per store ─────────────────────────────────────────────────
-- Gaps are deliberate: Checkers has no sugar (tests "Missing 1 Item"), oil only at Shoprite.
-- Two prices are 3 days old (tests the BR1 "Unverified" badge).
-- Basket Milk + Bread + Sugar → Shoprite R98.97 · Pick n Pay R102.97 · Checkers R55.98 (missing 1).
insert into public.listings (id, product_id, store_id, price_zar, stock_status, verified_at) values
  -- Clover Full Cream Milk 2L
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 36.99, 'In Stock',      now()),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 38.49, 'Out of Stock',  now()),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 37.99, 'In Stock',      now()),
  -- Albany Superior White Bread 700g
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 18.99, 'Unknown',       now()),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 19.49, 'In Stock',      now()),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 17.99, 'In Stock',      now()),
  -- White Sugar 2kg (none at Checkers)
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 42.99, 'In Stock',      now()),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 44.99, 'In Stock',      now() - interval '3 days'),
  -- Sunflower Oil 2L (Shoprite only)
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 64.99, 'Limited Stock', now() - interval '3 days')
on conflict do nothing;

-- ── Queue reports ───────────────────────────────────────────────────────────────────────
-- Recent reports so each store shows a different queue level: Shoprite long, Pick n Pay short,
-- Checkers moderate. No user_id (seed data). Queue levels count reports from the last 120 min
-- only (BR4), so these stop showing ~2 hours after seeding.
insert into public.report_logs (id, store_id, report_type, submitted_value, is_verified, created_at) values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Queue', 'long',     true, now() - interval '2 minutes'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Queue', 'long',     true, now() - interval '5 minutes'),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Queue', 'long',     true, now() - interval '8 minutes'),
  ('50000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Queue', 'long',     true, now() - interval '12 minutes'),
  ('50000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'Queue', 'long',     true, now() - interval '20 minutes'),
  ('50000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'Queue', 'long',     true, now() - interval '30 minutes'),
  ('50000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'Queue', 'short',    true, now() - interval '3 minutes'),
  ('50000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', 'Queue', 'short',    true, now() - interval '10 minutes'),
  ('50000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 'Queue', 'moderate', true, now() - interval '4 minutes'),
  ('50000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000003', 'Queue', 'moderate', true, now() - interval '9 minutes')
on conflict do nothing;
