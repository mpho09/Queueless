-- #13 Profile created on sign-up (pgTAP). Run with: npm run db:test
-- Everything runs in one transaction and is rolled back, so the shared database is left unchanged.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

-- ── Sign-up with both checkboxes creates a Shopper profile ──────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values (
  'ffffffff-0000-4000-8000-000000000001', 'New.Shopper@queueless.test',
  '{"display_name": "  Thandi  ", "is_16_or_older": true, "privacy_consent": true}'
);

select is(
  (select count(*)::int from public.profiles where id = 'ffffffff-0000-4000-8000-000000000001'),
  1,
  'Signing up with both checkboxes creates a profile'
);
select is(
  (select email from public.profiles where id = 'ffffffff-0000-4000-8000-000000000001'),
  'new.shopper@queueless.test',
  'The profile email is stored in lower case'
);
select is(
  (select display_name from public.profiles where id = 'ffffffff-0000-4000-8000-000000000001'),
  'Thandi',
  'The display name is trimmed'
);
select ok(
  (select role = 'Shopper' and reward_points = 0 and not retailer_approved and is_16_or_older
          and privacy_consent_at is not null
     from public.profiles where id = 'ffffffff-0000-4000-8000-000000000001'),
  'A new profile is a Shopper with 0 points, not approved, 16+ and consent recorded'
);

-- ── Missing a required checkbox rejects the sign-up ─────────────────────────────────────
select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data) values (
       'ffffffff-0000-4000-8000-000000000002', 'young@queueless.test',
       '{"is_16_or_older": false, "privacy_consent": true}') $$,
  '23514', 'You must be 16 or older to use Queueless.',
  'Under 16 cannot sign up'
);
select throws_ok(
  $$ insert into auth.users (id, email, raw_user_meta_data) values (
       'ffffffff-0000-4000-8000-000000000003', 'noconsent@queueless.test',
       '{"is_16_or_older": true}') $$,
  '23514', 'You must agree to the Privacy Notice.',
  'Sign-up without privacy consent is rejected'
);

-- ── No sign-up data (admin- or test-created users): no profile, no error ────────────────
insert into auth.users (id, email) values ('ffffffff-0000-4000-8000-000000000004', 'admin.made@queueless.test');
select is(
  (select count(*)::int from public.profiles where id = 'ffffffff-0000-4000-8000-000000000004'),
  0,
  'A user created without sign-up data gets no automatic profile'
);

-- ── Clients can't call the function directly ────────────────────────────────────────────
select ok(
  not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'Logged-in users cannot call handle_new_user() directly'
);

select * from finish();
rollback;
