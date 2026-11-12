-- #8 Database foundation: permissions (docs/IMPLEMENTATION_PLAN.md §5).
-- RLS is on for every table. Grants are set explicitly so each role can only do what's listed here.
-- The Express server uses the service role, which bypasses RLS: every server route that acts
-- for a user must run requireUser first and only touch that user's rows.

-- ── Start from no access, then grant exactly what's needed ──────────────────────────────
revoke all on all tables in schema public from anon, authenticated;

alter table public.suburbs        enable row level security;
alter table public.stores         enable row level security;
alter table public.profiles       enable row level security;
alter table public.products       enable row level security;
alter table public.listings       enable row level security;
alter table public.report_logs    enable row level security;
alter table public.baskets        enable row level security;
alter table public.basket_items   enable row level security;
alter table public.notifications  enable row level security;
alter table public.login_attempts enable row level security;

-- ── Helper: is the current user a Shopper with a confirmed email? ───────────────────────
-- security definer so it can read auth.users; search_path is empty so names can't be hijacked.
create function public.is_verified_shopper()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and p.role = 'Shopper'
  );
$$;
revoke execute on function public.is_verified_shopper() from public, anon;
grant execute on function public.is_verified_shopper() to authenticated;

-- ── Public reference data: everyone can read, nobody can write from the client ───────────
grant select on public.suburbs, public.stores, public.products, public.listings to anon, authenticated;

create policy "Anyone can read suburbs"  on public.suburbs  for select to anon, authenticated using (true);
create policy "Anyone can read stores"   on public.stores   for select to anon, authenticated using (true);
create policy "Anyone can read products" on public.products for select to anon, authenticated using (true);
create policy "Anyone can read listings" on public.listings for select to anon, authenticated using (true);
-- listings: no client update. Prices and stock change only through report triggers (#18)
-- and the service role (BR2 is enforced at the source).

-- ── profiles: owner only; role, points and approval can't be changed by the client ──────
grant select on public.profiles to authenticated;
grant update (display_name, suburb_id) on public.profiles to authenticated;

create policy "Users can read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Profiles are inserted by the sign-up trigger (#14), not by the client.

-- ── report_logs: verified Shoppers insert their own; read own rows only ──────────────────
-- BR2 limits (5 queue / 3 price per store per hour) are added by the report_triggers migration (#18).
grant select, insert on public.report_logs to authenticated;

create policy "Verified shoppers can submit reports" on public.report_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_verified_shopper()));
create policy "Users can read their own reports" on public.report_logs
  for select to authenticated using (user_id = (select auth.uid()));

-- ── baskets and basket_items: owner only ────────────────────────────────────────────────
grant select, insert, update, delete on public.baskets, public.basket_items to authenticated;

create policy "Users manage their own baskets" on public.baskets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage items in their own baskets" on public.basket_items
  for all to authenticated
  using (exists (select 1 from public.baskets b where b.id = basket_id and b.user_id = (select auth.uid())))
  with check (exists (select 1 from public.baskets b where b.id = basket_id and b.user_id = (select auth.uid())));

-- ── notifications: owner reads them and can only mark them read ─────────────────────────
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users can read their own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users can mark their own notifications read" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── login_attempts: service role only (RLS on, no policies, no grants) ──────────────────
