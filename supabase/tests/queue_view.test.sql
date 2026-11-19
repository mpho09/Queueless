-- #12 BR4 queue level view (pgTAP). Run with: npm run db:test
-- Everything runs in one transaction and is rolled back, so the shared database is left unchanged.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

-- ── Test data: one suburb, four stores ──────────────────────────────────────────────────
insert into public.suburbs (id, name, city) values ('99999999-0000-4000-8000-000000000001', 'Queue Test Suburb', 'Test City');
insert into public.stores (id, name, suburb_id, address, opening_hours) values
  ('99999999-1000-4000-8000-000000000001', 'No Reports Store', '99999999-0000-4000-8000-000000000001', 'Test', '08:00–20:00'),
  ('99999999-1000-4000-8000-000000000002', 'Long Queue Store', '99999999-0000-4000-8000-000000000001', 'Test', '08:00–20:00'),
  ('99999999-1000-4000-8000-000000000003', 'Mixed Store',      '99999999-0000-4000-8000-000000000001', 'Test', '08:00–20:00'),
  ('99999999-1000-4000-8000-000000000004', 'Old Reports Store','99999999-0000-4000-8000-000000000001', 'Test', '08:00–20:00');

-- The report trigger sets created_at to now(), so insert first, then back-date for the test.
insert into public.report_logs (id, store_id, report_type, submitted_value) values
  ('99999999-2000-4000-8000-000000000001', '99999999-1000-4000-8000-000000000002', 'Queue', 'long'),
  ('99999999-2000-4000-8000-000000000002', '99999999-1000-4000-8000-000000000002', 'Queue', 'long'),
  ('99999999-2000-4000-8000-000000000003', '99999999-1000-4000-8000-000000000003', 'Queue', 'short'),
  ('99999999-2000-4000-8000-000000000004', '99999999-1000-4000-8000-000000000003', 'Queue', 'long'),
  ('99999999-2000-4000-8000-000000000005', '99999999-1000-4000-8000-000000000003', 'Queue', 'none'),
  ('99999999-2000-4000-8000-000000000006', '99999999-1000-4000-8000-000000000004', 'Queue', 'long');
update public.report_logs set created_at = now() - interval '2 minutes'   where id = '99999999-2000-4000-8000-000000000001';
update public.report_logs set created_at = now() - interval '10 minutes'  where id = '99999999-2000-4000-8000-000000000002';
-- Mixed: short and long both fresh (0.8 each) → average 2 = moderate; the 'none' at 119 min weighs ~0.008
update public.report_logs set created_at = now() - interval '5 minutes'   where id in ('99999999-2000-4000-8000-000000000003', '99999999-2000-4000-8000-000000000004');
update public.report_logs set created_at = now() - interval '119 minutes' where id = '99999999-2000-4000-8000-000000000005';
update public.report_logs set created_at = now() - interval '121 minutes' where id = '99999999-2000-4000-8000-000000000006';

select is(
  (select level from public.store_queue_status where store_id = '99999999-1000-4000-8000-000000000001'),
  'unknown',
  'A store with no reports is unknown'
);
select is(
  (select report_count from public.store_queue_status where store_id = '99999999-1000-4000-8000-000000000001'),
  0,
  'A store with no reports has a count of 0'
);
select is(
  (select level from public.store_queue_status where store_id = '99999999-1000-4000-8000-000000000002'),
  'long',
  'Two recent long reports give a long queue'
);
select is(
  (select report_count from public.store_queue_status where store_id = '99999999-1000-4000-8000-000000000002'),
  2,
  'The report count includes every recent report'
);
select ok(
  (select last_report_at > now() - interval '3 minutes' from public.store_queue_status
    where store_id = '99999999-1000-4000-8000-000000000002'),
  'last_report_at is the newest report'
);
select is(
  (select level from public.store_queue_status where store_id = '99999999-1000-4000-8000-000000000003'),
  'moderate',
  'Fresh short + fresh long average to moderate; a nearly expired report barely counts'
);
select is(
  (select level from public.store_queue_status where store_id = '99999999-1000-4000-8000-000000000004'),
  'unknown',
  'Reports older than 120 minutes are ignored'
);

-- ── Guests can read the totals, but still not the individual reports ────────────────────
set local role anon;
select is(
  (select count(*)::int from public.store_queue_status where store_id::text like '99999999-1000-%'),
  4,
  'A guest can read the queue level of every store'
);
select throws_ok(
  $$ select * from public.report_logs $$,
  '42501', null,
  'A guest still cannot read report_logs'
);
reset role;

select * from finish();
rollback;
