alter table public.suburbs enable row level security;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.listings enable row level security;
alter table public.report_logs enable row level security;
alter table public.baskets enable row level security;
alter table public.basket_items enable row level security;
alter table public.notifications enable row level security;
alter table public.login_attempts enable row level security;

revoke all on table
  public.suburbs,
  public.stores,
  public.profiles,
  public.products,
  public.listings,
  public.report_logs,
  public.baskets,
  public.basket_items,
  public.notifications,
  public.login_attempts
from public, anon, authenticated;

grant all on table
  public.suburbs,
  public.stores,
  public.profiles,
  public.products,
  public.listings,
  public.report_logs,
  public.baskets,
  public.basket_items,
  public.notifications,
  public.login_attempts
to service_role;

grant select on table public.suburbs, public.stores, public.products, public.listings
to anon, authenticated;

create policy "Suburbs are publicly readable"
  on public.suburbs for select to anon, authenticated
  using (true);

create policy "Stores are publicly readable"
  on public.stores for select to anon, authenticated
  using (true);

create policy "Products are publicly readable"
  on public.products for select to anon, authenticated
  using (true);

create policy "Listings are publicly readable"
  on public.listings for select to anon, authenticated
  using (true);

grant select on table public.profiles to authenticated;
grant update (display_name, suburb_id) on table public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select on table public.report_logs to authenticated;
grant insert (user_id, store_id, listing_id, report_type, submitted_value)
  on table public.report_logs to authenticated;

create policy "Users can read their own reports"
  on public.report_logs for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Verified shoppers can submit their own reports"
  on public.report_logs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select auth.jwt() ->> 'email_confirmed_at') is not null
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'Shopper'
    )
  );

grant select, insert, update, delete on table public.baskets to authenticated;

create policy "Users can manage their own baskets"
  on public.baskets for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on table public.basket_items to authenticated;

create policy "Users can manage items in their own baskets"
  on public.basket_items for all to authenticated
  using (
    exists (
      select 1
      from public.baskets
      where id = basket_id
        and user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.baskets
      where id = basket_id
        and user_id = (select auth.uid())
    )
  );

grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

create policy "Users can read their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can mark their own notifications as read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
