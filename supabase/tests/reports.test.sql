-- #18 Report rules tests (pgTAP): BR2 limits, D4 verification, price/stock updates, who can report.
-- Run with: npm run db:test
-- Everything runs in one transaction and is rolled back, so the shared database is left unchanged.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(37);

-- ── Test data ───────────────────────────────────────────────────────────────────────────
-- Users: 01 limits tester, 02/05 queue pair, 03 retailer, 04 unverified, 06/07 price+stock pair, 08/09 distant pair
insert into auth.users (id, email, email_confirmed_at) values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'rep.1@queueless.test', now()),
  ('a1a1a1a1-0000-4000-8000-000000000002', 'rep.2@queueless.test', now()),
  ('a1a1a1a1-0000-4000-8000-000000000003', 'rep.3@queueless.test', now()),
  ('a1a1a1a1-0000-4000-8000-000000000004', 'rep.4@queueless.test', null),
  ('a1a1a1a1-0000-4000-8000-000000000005', 'rep.5@queueless.test', now()),
  ('a1a1a1a1-0000-4000-8000-000000000006', 'rep.6@queueless.test', now()),
  ('a1a1a1a1-0000-4000-8000-000000000007', 'rep.7@queueless.test', now()),
  ('a1a1a1a1-0000-4000-8000-000000000008', 'rep.8@queueless.test', now()),
  ('a1a1a1a1-0000-4000-8000-000000000009', 'rep.9@queueless.test', now()),
  ('a1a1a1a1-0000-4000-8000-000000000010', 'rep.10@queueless.test', now());
insert into public.profiles (id, email, role, is_16_or_older, privacy_consent_at) values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'rep.1@queueless.test', 'Shopper',  true, now()),
  ('a1a1a1a1-0000-4000-8000-000000000002', 'rep.2@queueless.test', 'Shopper',  true, now()),
  ('a1a1a1a1-0000-4000-8000-000000000003', 'rep.3@queueless.test', 'Retailer', true, now()),
  ('a1a1a1a1-0000-4000-8000-000000000004', 'rep.4@queueless.test', 'Shopper',  true, now()),
  ('a1a1a1a1-0000-4000-8000-000000000005', 'rep.5@queueless.test', 'Shopper',  true, now()),
  ('a1a1a1a1-0000-4000-8000-000000000006', 'rep.6@queueless.test', 'Shopper',  true, now()),
  ('a1a1a1a1-0000-4000-8000-000000000007', 'rep.7@queueless.test', 'Shopper',  true, now()),
  ('a1a1a1a1-0000-4000-8000-000000000008', 'rep.8@queueless.test', 'Shopper',  true, now()),
  ('a1a1a1a1-0000-4000-8000-000000000009', 'rep.9@queueless.test', 'Shopper',  true, now()),
  ('a1a1a1a1-0000-4000-8000-000000000010', 'rep.10@queueless.test', 'Shopper',  true, now());

insert into public.suburbs (id, name, city) values ('b1b1b1b1-0000-4000-8000-000000000001', 'Report Test Suburb', 'Test City');
-- S1 limits, S2 queue pair, S3 price/stock pair, S4 distant pair, S5 spare
insert into public.stores (id, name, suburb_id, address, opening_hours) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'Report Store 1', 'b1b1b1b1-0000-4000-8000-000000000001', 'Test', '08:00–20:00'),
  ('c1c1c1c1-0000-4000-8000-000000000002', 'Report Store 2', 'b1b1b1b1-0000-4000-8000-000000000001', 'Test', '08:00–20:00'),
  ('c1c1c1c1-0000-4000-8000-000000000003', 'Report Store 3', 'b1b1b1b1-0000-4000-8000-000000000001', 'Test', '08:00–20:00'),
  ('c1c1c1c1-0000-4000-8000-000000000004', 'Report Store 4', 'b1b1b1b1-0000-4000-8000-000000000001', 'Test', '08:00–20:00'),
  ('c1c1c1c1-0000-4000-8000-000000000005', 'Report Store 5', 'b1b1b1b1-0000-4000-8000-000000000001', 'Test', '08:00–20:00');
insert into public.products (id, barcode, product_name, brand_label, volumetric_size)
  values ('e1e1e1e1-0000-4000-8000-000000000001', 'REPORT-0001', 'Report Test Product', 'Test', '1kg');
-- L1 belongs to store 1, L3 to store 3
insert into public.listings (id, product_id, store_id, price_zar) values
  ('f1f1f1f1-0000-4000-8000-000000000001', 'e1e1e1e1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 10.00),
  ('f1f1f1f1-0000-4000-8000-000000000003', 'e1e1e1e1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000003', 10.00);

-- ── BR2: user 1 at store 1 ──────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'Queue', 'short') $$, 'Queue report 1 of 5 is accepted');
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'Queue', 'short') $$, 'Queue report 2 of 5 is accepted');
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'Queue', 'short') $$, 'Queue report 3 of 5 is accepted');
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'Queue', 'short') $$, 'Queue report 4 of 5 is accepted');
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'Queue', 'short') $$, 'Queue report 5 of 5 is accepted');
select throws_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'Queue', 'short') $$,
  'P0001', 'BR2_LIMIT', 'The 6th queue report in an hour is rejected');

select lives_ok($$ insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'f1f1f1f1-0000-4000-8000-000000000001', 'Price', '11.00') $$, 'Price update 1 of 3 is accepted');
select lives_ok($$ insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'f1f1f1f1-0000-4000-8000-000000000001', 'Price', '11.00') $$, 'Price update 2 of 3 is accepted');
select lives_ok($$ insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'f1f1f1f1-0000-4000-8000-000000000001', 'Price', '11.00') $$, 'Price update 3 of 3 is accepted');
select throws_ok($$ insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'f1f1f1f1-0000-4000-8000-000000000001', 'Price', '11.00') $$,
  'P0001', 'BR2_LIMIT', 'The 4th price update in an hour is rejected');
select throws_ok($$ insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000001', 'f1f1f1f1-0000-4000-8000-000000000001', 'Stock', 'Out of Stock') $$,
  'P0001', 'BR2_LIMIT', 'Stock reports share the price limit of 3 per hour');
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000005', 'Queue', 'short') $$,
  'The limit is per store: the same user can still report at another store');

-- ── Bad values are rejected ─────────────────────────────────────────────────────────────
select throws_ok($$ insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000003', 'f1f1f1f1-0000-4000-8000-000000000003', 'Price', '34.999') $$,
  '22023', 'INVALID_REPORT', 'A price with 3 decimals is rejected');
select throws_ok($$ insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000002', 'f1f1f1f1-0000-4000-8000-000000000003', 'Price', '12.00') $$,
  '22023', 'INVALID_REPORT', 'A price report for a listing from another store is rejected');
select throws_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000001', 'c1c1c1c1-0000-4000-8000-000000000002', 'Queue', 'huge') $$,
  '22023', 'INVALID_REPORT', 'An unknown queue level is rejected');

-- ── Who can report ──────────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000003', 'c1c1c1c1-0000-4000-8000-000000000002', 'Queue', 'long') $$,
  '42501', null, 'A Retailer cannot submit a report');

set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000004', 'c1c1c1c1-0000-4000-8000-000000000002', 'Queue', 'long') $$,
  '42501', null, 'A user with an unconfirmed email cannot submit a report');

-- ── D4: two matching queue reports at store 2 (users 2 and 5) ───────────────────────────
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000002", "role": "authenticated"}';
insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000002', 'c1c1c1c1-0000-4000-8000-000000000002', 'Queue', 'long');

reset role;
select is((select is_verified from public.report_logs
           where user_id = 'a1a1a1a1-0000-4000-8000-000000000002' and store_id = 'c1c1c1c1-0000-4000-8000-000000000002'),
  false, 'A single report is not verified');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000005", "role": "authenticated"}';
insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000005', 'c1c1c1c1-0000-4000-8000-000000000002', 'Queue', 'long');

reset role;
select is((select count(*)::int from public.report_logs
           where store_id = 'c1c1c1c1-0000-4000-8000-000000000002' and is_verified),
  2, 'Two matching queue reports are both verified');
select is((select array_agg(reward_points order by id) from public.profiles
           where id in ('a1a1a1a1-0000-4000-8000-000000000002', 'a1a1a1a1-0000-4000-8000-000000000005')),
  array[10, 10], 'Both shoppers get 10 points');
select is((select count(*)::int from public.notifications
           where user_id in ('a1a1a1a1-0000-4000-8000-000000000002', 'a1a1a1a1-0000-4000-8000-000000000005')
             and link_to = '/savings'),
  2, 'Both shoppers get a verification notification');

-- ── D4: matching price reports at store 3 (users 6 and 7) update the listing ────────────
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000006", "role": "authenticated"}';
insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000006', 'c1c1c1c1-0000-4000-8000-000000000003', 'f1f1f1f1-0000-4000-8000-000000000003', 'Price', '12.00');

reset role;
select is((select price_zar from public.listings where id = 'f1f1f1f1-0000-4000-8000-000000000003'),
  10.00::numeric, 'An unverified price report does not change the listing');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000007", "role": "authenticated"}';
insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000007', 'c1c1c1c1-0000-4000-8000-000000000003', 'f1f1f1f1-0000-4000-8000-000000000003', 'Price', '12.30');

reset role;
select is((select count(*)::int from public.report_logs
           where store_id = 'c1c1c1c1-0000-4000-8000-000000000003' and report_type = 'Price' and is_verified),
  2, 'Two price reports within R0.50 are both verified');
select is((select price_zar from public.listings where id = 'f1f1f1f1-0000-4000-8000-000000000003'),
  12.30::numeric, 'The verified price updates the listing');
select is((select array_agg(reward_points order by id) from public.profiles
           where id in ('a1a1a1a1-0000-4000-8000-000000000006', 'a1a1a1a1-0000-4000-8000-000000000007')),
  array[10, 10], 'Both price reporters get 10 points');

-- Two matching stock reports update the stock status
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000006", "role": "authenticated"}';
insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000006', 'c1c1c1c1-0000-4000-8000-000000000003', 'f1f1f1f1-0000-4000-8000-000000000003', 'Stock', 'Out of Stock');
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000007", "role": "authenticated"}';
insert into public.report_logs (user_id, store_id, listing_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000007', 'c1c1c1c1-0000-4000-8000-000000000003', 'f1f1f1f1-0000-4000-8000-000000000003', 'Stock', 'Out of Stock');

reset role;
select is((select stock_status::text from public.listings where id = 'f1f1f1f1-0000-4000-8000-000000000003'),
  'Out of Stock', 'Two matching stock reports update the stock status');

-- ── Distant reports are never verified (users 8 and 9 at store 4) ───────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000008", "role": "authenticated"}';
insert into public.report_logs (user_id, store_id, report_type, submitted_value, location_mismatch)
  values ('a1a1a1a1-0000-4000-8000-000000000008', 'c1c1c1c1-0000-4000-8000-000000000004', 'Queue', 'short', true);
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000009", "role": "authenticated"}';
insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000009', 'c1c1c1c1-0000-4000-8000-000000000004', 'Queue', 'short');

reset role;
select is((select count(*)::int from public.report_logs
           where store_id = 'c1c1c1c1-0000-4000-8000-000000000004' and is_verified),
  0, 'A report flagged as more than 50 km away is never verified');

-- Same-user reports never verify each other (user 1 sent 5 identical queue reports)
select is((select count(*)::int from public.report_logs
           where user_id = 'a1a1a1a1-0000-4000-8000-000000000001' and is_verified),
  0, 'A shopper cannot verify their own reports');

-- ── The server decides created_at and is_verified (found in review of #35) ──────────────
-- User 10 (at store 5) tries to backdate a report by a day and mark it verified.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000010", "role": "authenticated"}';
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value, created_at, is_verified)
  values ('a1a1a1a1-0000-4000-8000-000000000010', 'c1c1c1c1-0000-4000-8000-000000000005', 'Queue', 'moderate', now() - interval '1 day', true) $$,
  'A report sent with a backdated created_at and is_verified = true is accepted');

reset role;
select is((select created_at = now() from public.report_logs where user_id = 'a1a1a1a1-0000-4000-8000-000000000010'),
  true, 'created_at is set by the server, not the client');
select is((select is_verified from public.report_logs where user_id = 'a1a1a1a1-0000-4000-8000-000000000010'),
  false, 'A client cannot mark its own report as verified');

-- Backdating does not dodge the limit: 4 more backdated reports make 5, and the 6th is rejected.
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000010", "role": "authenticated"}';
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value, created_at)
  values ('a1a1a1a1-0000-4000-8000-000000000010', 'c1c1c1c1-0000-4000-8000-000000000005', 'Queue', 'moderate', now() - interval '1 day') $$,
  'Backdated queue report 2 of 5 is accepted');
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value, created_at)
  values ('a1a1a1a1-0000-4000-8000-000000000010', 'c1c1c1c1-0000-4000-8000-000000000005', 'Queue', 'moderate', now() - interval '1 day') $$,
  'Backdated queue report 3 of 5 is accepted');
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value, created_at)
  values ('a1a1a1a1-0000-4000-8000-000000000010', 'c1c1c1c1-0000-4000-8000-000000000005', 'Queue', 'moderate', now() - interval '1 day') $$,
  'Backdated queue report 4 of 5 is accepted');
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value, created_at)
  values ('a1a1a1a1-0000-4000-8000-000000000010', 'c1c1c1c1-0000-4000-8000-000000000005', 'Queue', 'moderate', now() - interval '1 day') $$,
  'Backdated queue report 5 of 5 is accepted');
select throws_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value, created_at)
  values ('a1a1a1a1-0000-4000-8000-000000000010', 'c1c1c1c1-0000-4000-8000-000000000005', 'Queue', 'moderate', now() - interval '1 day') $$,
  'P0001', 'BR2_LIMIT', 'A 6th backdated report is still rejected: backdating does not dodge the limit');

-- The limit window rolls: once user 10's reports are more than 60 minutes old, they can report again.
reset role;
update public.report_logs set created_at = now() - interval '61 minutes'
  where user_id = 'a1a1a1a1-0000-4000-8000-000000000010';
set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-0000-4000-8000-000000000010", "role": "authenticated"}';
select lives_ok($$ insert into public.report_logs (user_id, store_id, report_type, submitted_value)
  values ('a1a1a1a1-0000-4000-8000-000000000010', 'c1c1c1c1-0000-4000-8000-000000000005', 'Queue', 'moderate') $$,
  'The limit resets once the reports are more than 60 minutes old');

reset role;
select * from finish();
rollback;
