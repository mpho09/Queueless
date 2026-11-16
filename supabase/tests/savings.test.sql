-- #20 Savings tests (pgTAP). Run with: npm run db:test
-- Everything runs in one transaction and is rolled back, so the shared database is left unchanged.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(15);

select is(
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'savings_events'),
  true,
  'RLS is enabled on savings_events'
);

-- ── Test data ───────────────────────────────────────────────────────────────────────────
-- Same prices as the seed basket (plan §11): Milk + Bread + Sugar.
-- Store 1 = R98.97 (complete), Store 2 = R102.97 (complete), Store 3 = R55.98 (no sugar).
-- BR3: Store 3 is cheapest but incomplete, so it can never be "Cheapest"; saving = R4.00.
insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-4000-8000-000000000201', 'savings.a@queueless.test', now()),
  ('aaaaaaaa-0000-4000-8000-000000000202', 'savings.b@queueless.test', now());
insert into public.profiles (id, email, is_16_or_older, privacy_consent_at) values
  ('aaaaaaaa-0000-4000-8000-000000000201', 'savings.a@queueless.test', true, now()),
  ('aaaaaaaa-0000-4000-8000-000000000202', 'savings.b@queueless.test', true, now());
insert into public.suburbs (id, name, city) values ('bbbbbbbb-0000-4000-8000-000000000201', 'Savings Suburb', 'Test City');
insert into public.stores (id, name, suburb_id, address, opening_hours) values
  ('cccccccc-0000-4000-8000-000000000201', 'Store 1', 'bbbbbbbb-0000-4000-8000-000000000201', 'Test', '08:00–20:00'),
  ('cccccccc-0000-4000-8000-000000000202', 'Store 2', 'bbbbbbbb-0000-4000-8000-000000000201', 'Test', '08:00–20:00'),
  ('cccccccc-0000-4000-8000-000000000203', 'Store 3', 'bbbbbbbb-0000-4000-8000-000000000201', 'Test', '08:00–20:00');
insert into public.products (id, barcode, product_name, brand_label, volumetric_size) values
  ('eeeeeeee-0000-4000-8000-000000000201', 'SAV-0001', 'Test Milk',  'Test', '2L'),
  ('eeeeeeee-0000-4000-8000-000000000202', 'SAV-0002', 'Test Bread', 'Test', '700g'),
  ('eeeeeeee-0000-4000-8000-000000000203', 'SAV-0003', 'Test Sugar', 'Test', '2kg'),
  ('eeeeeeee-0000-4000-8000-000000000204', 'SAV-0004', 'Test Oil',   'Test', '2L');
insert into public.listings (product_id, store_id, price_zar) values
  ('eeeeeeee-0000-4000-8000-000000000201', 'cccccccc-0000-4000-8000-000000000201', 36.99),
  ('eeeeeeee-0000-4000-8000-000000000201', 'cccccccc-0000-4000-8000-000000000202', 38.49),
  ('eeeeeeee-0000-4000-8000-000000000201', 'cccccccc-0000-4000-8000-000000000203', 37.99),
  ('eeeeeeee-0000-4000-8000-000000000202', 'cccccccc-0000-4000-8000-000000000201', 18.99),
  ('eeeeeeee-0000-4000-8000-000000000202', 'cccccccc-0000-4000-8000-000000000202', 19.49),
  ('eeeeeeee-0000-4000-8000-000000000202', 'cccccccc-0000-4000-8000-000000000203', 17.99),
  ('eeeeeeee-0000-4000-8000-000000000203', 'cccccccc-0000-4000-8000-000000000201', 42.99),
  ('eeeeeeee-0000-4000-8000-000000000203', 'cccccccc-0000-4000-8000-000000000202', 44.99),
  ('eeeeeeee-0000-4000-8000-000000000204', 'cccccccc-0000-4000-8000-000000000201', 64.99);
insert into public.baskets (id, user_id) values
  ('dddddddd-0000-4000-8000-000000000201', 'aaaaaaaa-0000-4000-8000-000000000201'),
  ('dddddddd-0000-4000-8000-000000000202', 'aaaaaaaa-0000-4000-8000-000000000202');
insert into public.basket_items (basket_id, product_id, quantity) values
  ('dddddddd-0000-4000-8000-000000000201', 'eeeeeeee-0000-4000-8000-000000000201', 1),
  ('dddddddd-0000-4000-8000-000000000201', 'eeeeeeee-0000-4000-8000-000000000202', 1),
  ('dddddddd-0000-4000-8000-000000000201', 'eeeeeeee-0000-4000-8000-000000000203', 1),
  -- B's basket: oil is only sold at Store 1, so there is no second store to compare with
  ('dddddddd-0000-4000-8000-000000000202', 'eeeeeeee-0000-4000-8000-000000000204', 1);

-- ── User A ──────────────────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000201", "role": "authenticated"}';

select is(
  public.record_basket_saving('dddddddd-0000-4000-8000-000000000201'),
  400,
  'Viewing the seed basket records a saving of R4.00 (BR3)'
);
select results_eq(
  $$ select amount_cents, store_id from public.savings_events $$,
  $$ values (400, 'cccccccc-0000-4000-8000-000000000201'::uuid) $$,
  'The saving is logged against the cheapest complete store, not the cheaper incomplete one'
);
select is(
  public.record_basket_saving('dddddddd-0000-4000-8000-000000000201'),
  400,
  'Viewing the same basket again today returns the same saving'
);
select is(
  (select count(*)::int from public.savings_events),
  1,
  'Only one saving is logged per basket per day'
);

-- Follow-up to #29 review: savings can't be inflated with old or extra baskets.
update public.baskets set is_active = false where id = 'dddddddd-0000-4000-8000-000000000201';
select is(
  public.record_basket_saving('dddddddd-0000-4000-8000-000000000201'),
  null,
  'A deactivated basket cannot record a saving'
);
insert into public.baskets (id, user_id) values
  ('dddddddd-0000-4000-8000-000000000203', 'aaaaaaaa-0000-4000-8000-000000000201');
insert into public.basket_items (basket_id, product_id) values
  ('dddddddd-0000-4000-8000-000000000203', 'eeeeeeee-0000-4000-8000-000000000201'),
  ('dddddddd-0000-4000-8000-000000000203', 'eeeeeeee-0000-4000-8000-000000000202'),
  ('dddddddd-0000-4000-8000-000000000203', 'eeeeeeee-0000-4000-8000-000000000203');
select public.record_basket_saving('dddddddd-0000-4000-8000-000000000203');
select is(
  (select count(*)::int from public.savings_events),
  1,
  'Only one saving is logged per user per day, even with a new basket'
);
select throws_ok(
  $$ select public.record_basket_saving('dddddddd-0000-4000-8000-000000000202') $$,
  '42501', null,
  'A user cannot log a saving for someone else''s basket'
);
select throws_ok(
  $$ insert into public.savings_events (user_id, basket_id, amount_cents)
     values ('aaaaaaaa-0000-4000-8000-000000000201', 'dddddddd-0000-4000-8000-000000000201', 99999) $$,
  '42501', null,
  'A user cannot insert a saving directly (no faking amounts)'
);
select throws_ok(
  $$ update public.savings_events set amount_cents = 99999 $$,
  '42501', null,
  'A user cannot change a saving'
);

-- ── User B ──────────────────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000202", "role": "authenticated"}';

select is(
  (select count(*)::int from public.savings_events),
  0,
  'A user cannot see someone else''s savings'
);
select is(
  public.record_basket_saving('dddddddd-0000-4000-8000-000000000202'),
  null,
  'No saving when fewer than two stores carry the whole basket'
);
select is(
  (select count(*)::int from public.savings_events),
  0,
  'Nothing is logged when there is no saving'
);

-- ── Guests (anon) ───────────────────────────────────────────────────────────────────────
reset role;
set local role anon;

select throws_ok(
  $$ select count(*) from public.savings_events $$,
  '42501', null,
  'A guest cannot read savings'
);
select throws_ok(
  $$ select public.record_basket_saving('dddddddd-0000-4000-8000-000000000201') $$,
  '42501', null,
  'A guest cannot log a saving'
);

select * from finish();
rollback;
