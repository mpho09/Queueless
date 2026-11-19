-- #13 Create a profile for every new sign-up (Implementation Plan §5, migration `profiles_trigger`).
--
-- Clients can't insert into public.profiles, so the database does it when Supabase Auth creates the
-- user. The Sign up screen (A2) must send the two required checkboxes as user metadata:
--
--   supabase.auth.signUp({
--     email, password,
--     options: { data: { display_name, is_16_or_older: true, privacy_consent: true } },
--   })
--
-- Rules:
--   * both checkboxes true      → profile created (role Shopper, 0 points, consent time = now)
--   * either one sent as false  → sign-up is rejected (PRD §5: 16+ and privacy consent are required)
--   * no sign-up data at all    → no profile (users made by an admin or by the database tests);
--                                 without a profile they can't report or save, so nothing is bypassed

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta    jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  is_16   boolean := (meta ->> 'is_16_or_older')::boolean;
  consent boolean := (meta ->> 'privacy_consent')::boolean;
begin
  if is_16 is null and consent is null then
    return new;
  end if;

  if is_16 is not true then
    raise exception 'You must be 16 or older to use Queueless.' using errcode = 'check_violation';
  end if;
  if consent is not true then
    raise exception 'You must agree to the Privacy Notice.' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, email, display_name, is_16_or_older, privacy_consent_at)
  values (new.id, lower(new.email), nullif(trim(meta ->> 'display_name'), ''), true, now());

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
