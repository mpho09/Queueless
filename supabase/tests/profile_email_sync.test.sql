-- #20 Change email tests (pgTAP). Run with: npm run db:test
-- Everything runs in one transaction and is rolled back, so the shared database is left unchanged.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-4000-8000-000000000501', 'old.address@queueless.test', now()),
  ('aaaaaaaa-0000-4000-8000-000000000502', 'other.user@queueless.test', now());
insert into public.profiles (id, email, is_16_or_older, privacy_consent_at) values
  ('aaaaaaaa-0000-4000-8000-000000000501', 'old.address@queueless.test', true, now()),
  ('aaaaaaaa-0000-4000-8000-000000000502', 'other.user@queueless.test', true, now());

select is(has_function_privilege('anon', 'public.sync_profile_email()', 'execute'), false,
  'Guests cannot call sync_profile_email');
select is(has_function_privilege('authenticated', 'public.sync_profile_email()', 'execute'), false,
  'Logged-in users cannot call sync_profile_email');

-- What Supabase Auth does once both confirmation links are clicked
update auth.users set email = 'New.Address@Queueless.test' where id = 'aaaaaaaa-0000-4000-8000-000000000501';

select is((select email from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000501'),
  'new.address@queueless.test', 'The profile email follows the login email, stored lowercase');
select is((select email from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000502'),
  'other.user@queueless.test', 'Other users are untouched');

-- Other changes to the login (e.g. a sign-in) leave the profile alone
update auth.users set last_sign_in_at = now() where id = 'aaaaaaaa-0000-4000-8000-000000000502';
select is((select email from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000502'),
  'other.user@queueless.test', 'A sign-in does not change the profile email');

-- A user without a profile (e.g. made by an admin) can still change their login email
insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-4000-8000-000000000503', 'no.profile@queueless.test', now());
select lives_ok($$ update auth.users set email = 'still.no.profile@queueless.test'
                   where id = 'aaaaaaaa-0000-4000-8000-000000000503' $$,
  'Changing the email of a user with no profile does not fail');

-- Clients still cannot change profiles.email themselves
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000501", "role": "authenticated"}';
select throws_ok($$ update public.profiles set email = 'sneaky@queueless.test'
                    where id = 'aaaaaaaa-0000-4000-8000-000000000501' $$,
  '42501', null, 'A user cannot change profiles.email directly');
reset role;

select * from finish();
rollback;
