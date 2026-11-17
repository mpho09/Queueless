-- #20 Savings: one saving per basket per day, shown on S6 (plan Phase 7).
-- Rule (plan defaults, settled in #7): when a logged-in user views S4, log
-- (2nd-cheapest complete store total − cheapest complete store total) for that basket, once per day.
-- A store missing any basket item is never "complete" (BR3).

create table public.savings_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  basket_id    uuid references public.baskets (id) on delete set null,
  store_id     uuid references public.stores (id) on delete set null,   -- the cheapest complete store
  amount_cents int not null check (amount_cents > 0),
  saved_on     date not null default (now() at time zone 'Africa/Johannesburg')::date,  -- SAST day
  created_at   timestamptz not null default now(),
  unique (basket_id, saved_on)
);
create index on public.savings_events (user_id, created_at desc);

-- ── Permissions ─────────────────────────────────────────────────────────────────────────
-- Supabase grants new tables to anon/authenticated by default, so start from nothing.
revoke all on public.savings_events from anon, authenticated;
alter table public.savings_events enable row level security;

-- Users read their own savings. Nobody writes from the client: rows only come from
-- record_basket_saving(), which works the amount out from real prices (no faked savings).
grant select on public.savings_events to authenticated;
create policy "Users can read their own savings" on public.savings_events
  for select to authenticated using (user_id = (select auth.uid()));

-- ── record_basket_saving: called by S4 when a logged-in user views their basket ──────────
-- Returns the saving in cents, or null when there is none (fewer than two complete stores,
-- or a tie). Safe to call on every visit: only the first call each day logs a row.
create function public.record_basket_saving(p_basket_id uuid)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_store  uuid;
  v_saving int;
begin
  -- security definer skips RLS, so check ownership here
  if v_user is null or not exists (
    select 1 from public.baskets b where b.id = p_basket_id and b.user_id = v_user
  ) then
    raise exception 'You can''t do that.' using errcode = '42501';
  end if;

  with items as (
    select bi.product_id, bi.quantity
    from public.basket_items bi
    where bi.basket_id = p_basket_id
  ),
  store_totals as (
    select l.store_id,
           sum(round(l.price_zar * 100)::int * i.quantity) as total_cents,
           count(*) as priced_items
    from items i
    join public.listings l on l.product_id = i.product_id
    group by l.store_id
  ),
  complete as (
    select st.store_id, st.total_cents,
           row_number() over (order by st.total_cents, st.store_id) as rank
    from store_totals st
    where st.priced_items = (select count(*) from items)
  )
  select cheapest.store_id, next.total_cents - cheapest.total_cents
    into v_store, v_saving
  from complete cheapest
  join complete next on next.rank = 2
  where cheapest.rank = 1;

  if v_saving is null or v_saving <= 0 then
    return null;
  end if;

  insert into public.savings_events (user_id, basket_id, store_id, amount_cents)
  values (v_user, p_basket_id, v_store, v_saving)
  on conflict (basket_id, saved_on) do nothing;

  return v_saving;
end;
$$;

revoke execute on function public.record_basket_saving(uuid) from public, anon;
grant execute on function public.record_basket_saving(uuid) to authenticated;
