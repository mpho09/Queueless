-- #20 Change email (PRD §5, plan §7): S6 calls supabase.auth.updateUser({ email }). With "Secure email
-- change" on (config.toml [auth.email] double_confirm_changes = true), Supabase Auth only changes
-- auth.users.email after BOTH the current and the new address confirm the link.
--
-- profiles.email is a copy used by S6 and the price-drop email (#56), and clients can't update it,
-- so this trigger keeps it in step with the login email. Stored lowercase, like at sign-up (#44).

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = lower(new.email)
   where id = new.id
     and email is distinct from lower(new.email);
  return new;
end;
$$;

-- Only the trigger runs it. Supabase grants new functions to anon and authenticated by default.
revoke all on function public.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email and new.email is not null)
  execute function public.sync_profile_email();
