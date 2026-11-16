-- #8 RLS tests (pgTAP). Run with: npm run db:test
-- Everything runs in one transaction and is rolled back, so the shared database is left unchanged.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

-- ── Every table has RLS on ──────────────────────────────────────────────────────────────
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'RLS is enabled on every public table'
);

-- ── Test data: two users with profiles, one store, one basket each ──────────────────────
insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'test.a@queueless.test', now()),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'test.b@queueless.test', null);
insert into public.profiles (id, email, is_16_or_older, privacy_consent_at) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'test.a@queueless.test', true, now()),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'test.b@queueless.test', true, now());
insert into public.suburbs (id, name, city) values ('bbbbbbbb-0000-4000-8000-000000000001', 'Test Suburb', 'Test City');
insert into public.stores (id, name, suburb_id, address, opening_hours)
  values ('cccccccc-0000-4000-8000-000000000001', 'Test Store', 'bbbbbbbb-0000-4000-8000-000000000001', 'Test', '08:00–20:00');
insert into public.products (id, barcode, product_name, brand_label, volumetric_size)
  values ('eeeeeeee-0000-4000-8000-000000000001', 'TEST-0001', 'Test Product', 'Test', '1kg');
insert into public.baskets (id, user_id) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002');

-- ── Guests (anon) ───────────────────────────────────────────────────────────────────────
set local role anon;

select ok(
  (select count(*) from public.stores where id = 'cccccccc-0000-4000-8000-000000000001') = 1,
  'A guest can read stores'
);
select throws_ok(
  $$ insert into public.suburbs (name, city) values ('Hacked', 'Nowhere') $$,
  '42501', null,
  'A guest cannot add a suburb'
);
select throws_ok(
  $$ update public.listings set price_zar = 1 $$,
  '42501', null,
  'A guest cannot change prices'
);
select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'A guest cannot read profiles'
);

-- ── Logged-in user A (email confirmed) ──────────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select array_agg(id) from public.profiles),
  array['aaaaaaaa-0000-4000-8000-000000000001'::uuid],
  'A user can only see their own profile'
);
select is(
  (select array_agg(id) from public.baskets),
  array['dddddddd-0000-4000-8000-000000000001'::uuid],
  'A user can only see their own basket'
);
select lives_ok(
  $$ update public.profiles set display_name = 'Tester A' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'A user can change their own display name'
);
select throws_ok(
  $$ update public.profiles set reward_points = 9999 where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null,
  'A user cannot give themselves reward points'
);
select throws_ok(
  $$ update public.profiles set role = 'Retailer' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null,
  'A user cannot change their own role'
);
select throws_ok(
  $$ insert into public.basket_items (basket_id, product_id)
     values ('dddddddd-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000001') $$,
  '42501', null,
  'A user cannot add items to someone else''s basket'
);
select lives_ok(
  $$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000001', 'Queue', 'short') $$,
  'A verified shopper can submit a queue report'
);
select throws_ok(
  $$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
     values ('aaaaaaaa-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001', 'Queue', 'short') $$,
  '42501', null,
  'A user cannot submit a report as someone else'
);

-- ── Logged-in user B (email NOT confirmed) ──────────────────────────────────────────────
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
     values ('aaaaaaaa-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001', 'Queue', 'short') $$,
  '42501', null,
  'An unverified user cannot submit a report'
);

select * from finish();
rollback;
