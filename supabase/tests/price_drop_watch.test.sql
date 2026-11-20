-- #20 Price-drop schedule tests (pgTAP). Run with: npm run db:test
-- Everything runs in one transaction and is rolled back, so the shared database is left unchanged.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

-- ── Test data: the seed basket prices (plan §11) ────────────────────────────────────────
-- Store 1 = R98.97 (complete), Store 2 = R102.97 (complete), Store 3 = R55.98 (no sugar).
insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-4000-8000-000000000401', 'drop.a@queueless.test', now()),
  ('aaaaaaaa-0000-4000-8000-000000000402', 'drop.b@queueless.test', now()),
  ('aaaaaaaa-0000-4000-8000-000000000403', 'drop.gone@queueless.test', now());
insert into public.profiles (id, email, is_16_or_older, privacy_consent_at, deletion_requested_at) values
  ('aaaaaaaa-0000-4000-8000-000000000401', 'drop.a@queueless.test', true, now(), null),
  ('aaaaaaaa-0000-4000-8000-000000000402', 'drop.b@queueless.test', true, now(), null),
  ('aaaaaaaa-0000-4000-8000-000000000403', 'drop.gone@queueless.test', true, now(), now());
insert into public.suburbs (id, name, city) values ('bbbbbbbb-0000-4000-8000-000000000401', 'Drop Suburb', 'Test City');
insert into public.stores (id, name, suburb_id, address, opening_hours) values
  ('cccccccc-0000-4000-8000-000000000401', 'Drop Store 1', 'bbbbbbbb-0000-4000-8000-000000000401', 'Test', '08:00–20:00'),
  ('cccccccc-0000-4000-8000-000000000402', 'Drop Store 2', 'bbbbbbbb-0000-4000-8000-000000000401', 'Test', '08:00–20:00'),
  ('cccccccc-0000-4000-8000-000000000403', 'Drop Store 3', 'bbbbbbbb-0000-4000-8000-000000000401', 'Test', '08:00–20:00');
insert into public.products (id, barcode, product_name, brand_label, volumetric_size) values
  ('eeeeeeee-0000-4000-8000-000000000401', 'DROP-0001', 'Drop Milk',  'Test', '2L'),
  ('eeeeeeee-0000-4000-8000-000000000402', 'DROP-0002', 'Drop Bread', 'Test', '700g'),
  ('eeeeeeee-0000-4000-8000-000000000403', 'DROP-0003', 'Drop Sugar', 'Test', '2kg'),
  ('eeeeeeee-0000-4000-8000-000000000404', 'DROP-0004', 'Drop Oil',   'Test', '2L');
insert into public.listings (product_id, store_id, price_zar) values
  ('eeeeeeee-0000-4000-8000-000000000401', 'cccccccc-0000-4000-8000-000000000401', 36.99),
  ('eeeeeeee-0000-4000-8000-000000000401', 'cccccccc-0000-4000-8000-000000000402', 38.49),
  ('eeeeeeee-0000-4000-8000-000000000401', 'cccccccc-0000-4000-8000-000000000403', 37.99),
  ('eeeeeeee-0000-4000-8000-000000000402', 'cccccccc-0000-4000-8000-000000000401', 18.99),
  ('eeeeeeee-0000-4000-8000-000000000402', 'cccccccc-0000-4000-8000-000000000402', 19.49),
  ('eeeeeeee-0000-4000-8000-000000000402', 'cccccccc-0000-4000-8000-000000000403', 17.99),
  ('eeeeeeee-0000-4000-8000-000000000403', 'cccccccc-0000-4000-8000-000000000401', 42.99),
  ('eeeeeeee-0000-4000-8000-000000000403', 'cccccccc-0000-4000-8000-000000000402', 44.99);

-- A: active seed basket (Milk + Bread + Sugar), plus an old inactive one.
-- B: Oil only, which no store sells. Gone: asked to delete their account.
insert into public.baskets (id, user_id, is_active) values
  ('dddddddd-0000-4000-8000-000000000401', 'aaaaaaaa-0000-4000-8000-000000000401', true),
  ('dddddddd-0000-4000-8000-000000000402', 'aaaaaaaa-0000-4000-8000-000000000401', false),
  ('dddddddd-0000-4000-8000-000000000403', 'aaaaaaaa-0000-4000-8000-000000000402', true),
  ('dddddddd-0000-4000-8000-000000000404', 'aaaaaaaa-0000-4000-8000-000000000403', true);
insert into public.basket_items (basket_id, product_id, quantity) values
  ('dddddddd-0000-4000-8000-000000000401', 'eeeeeeee-0000-4000-8000-000000000401', 1),
  ('dddddddd-0000-4000-8000-000000000401', 'eeeeeeee-0000-4000-8000-000000000402', 1),
  ('dddddddd-0000-4000-8000-000000000401', 'eeeeeeee-0000-4000-8000-000000000403', 1),
  ('dddddddd-0000-4000-8000-000000000402', 'eeeeeeee-0000-4000-8000-000000000401', 1),
  ('dddddddd-0000-4000-8000-000000000403', 'eeeeeeee-0000-4000-8000-000000000404', 1),
  ('dddddddd-0000-4000-8000-000000000404', 'eeeeeeee-0000-4000-8000-000000000401', 1);

-- ── Who can use it ──────────────────────────────────────────────────────────────────────
select is((select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'basket_price_watch'),
  true, 'RLS is enabled on basket_price_watch');
select is(has_table_privilege('authenticated', 'public.basket_price_watch', 'select'), false,
  'Logged-in users cannot read basket_price_watch');
select is(has_table_privilege('authenticated', 'public.basket_price_watch', 'update'), false,
  'Logged-in users cannot change the last total');
select is(has_function_privilege('anon', 'public.price_drop_candidates()', 'execute'), false,
  'Guests cannot run price_drop_candidates (it returns emails)');
select is(has_function_privilege('authenticated', 'public.price_drop_candidates()', 'execute'), false,
  'Logged-in users cannot run price_drop_candidates');
select is(has_function_privilege('service_role', 'public.price_drop_candidates()', 'execute'), true,
  'The server (service role) can run it');

-- ── What it returns ─────────────────────────────────────────────────────────────────────
select is((select count(*)::int from public.price_drop_candidates() where email like 'drop.%'), 2,
  'One row per active basket: the inactive basket and the account being deleted are skipped');
select is((select total_cents from public.price_drop_candidates() where basket_id = 'dddddddd-0000-4000-8000-000000000401'),
  9897, 'The seed basket''s cheapest COMPLETE total is R98.97 (BR3), not the incomplete R55.98');
select is((select store_name from public.price_drop_candidates() where basket_id = 'dddddddd-0000-4000-8000-000000000401'),
  'Drop Store 1', '... at Drop Store 1');
select is((select email from public.price_drop_candidates() where basket_id = 'dddddddd-0000-4000-8000-000000000401'),
  'drop.a@queueless.test', 'With the owner''s email');
select ok((select total_cents is null and store_name is null from public.price_drop_candidates()
           where basket_id = 'dddddddd-0000-4000-8000-000000000403'),
  'No store carries the whole basket: no cheapest store');
select is((select last_total_cents from public.price_drop_candidates() where basket_id = 'dddddddd-0000-4000-8000-000000000401'),
  null, 'Never checked before: no last total yet');

insert into public.basket_price_watch (basket_id, last_total_cents) values ('dddddddd-0000-4000-8000-000000000401', 12000);
select is((select last_total_cents from public.price_drop_candidates() where basket_id = 'dddddddd-0000-4000-8000-000000000401'),
  12000, 'After a check, the last total comes back with the basket');

select * from finish();
rollback;
