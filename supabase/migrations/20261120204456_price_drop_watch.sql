-- #20 Price-drop email schedule (plan §10.1). The rule itself is server/src/jobs/priceDrop.js (#30);
-- this migration gives the scheduled run (GET /api/jobs/price-drop, Vercel Cron) its data.
--
-- basket_price_watch: per basket, the total when we last told the shopper ("the price when we last
-- told you", see priceDrop.js). Server only: RLS on, no client grants, so a shopper can't change it.
-- price_drop_candidates(): every active basket with its owner's email and its cheapest COMPLETE store
-- (BR3, same SQL as record_basket_saving). Accounts waiting to be deleted (#47) are skipped.

create table public.basket_price_watch (
  basket_id        uuid primary key references public.baskets (id) on delete cascade,
  last_total_cents int not null check (last_total_cents > 0),
  updated_at       timestamptz not null default now()
);

alter table public.basket_price_watch enable row level security;
-- Supabase grants new tables to anon and authenticated by default; this one is for the server only.
revoke all on public.basket_price_watch from public, anon, authenticated;

create or replace function public.price_drop_candidates()
returns table (
  basket_id        uuid,
  email            text,
  last_total_cents int,
  store_name       text,
  total_cents      int
)
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    select bi.basket_id, bi.product_id, bi.quantity
    from public.basket_items bi
    join public.baskets b on b.id = bi.basket_id
    where b.is_active
  ),
  item_counts as (
    select i.basket_id, count(*) as n
    from items i
    group by i.basket_id
  ),
  store_totals as (
    select i.basket_id, l.store_id,
           sum(round(l.price_zar * 100)::int * i.quantity) as total_cents,
           count(*) as priced_items
    from items i
    join public.listings l on l.product_id = i.product_id
    group by i.basket_id, l.store_id
  ),
  cheapest as (
    -- BR3: only stores that carry every item; the lowest total wins (store id breaks ties).
    select distinct on (st.basket_id) st.basket_id, st.store_id, st.total_cents
    from store_totals st
    join item_counts c on c.basket_id = st.basket_id
    where st.priced_items = c.n
    order by st.basket_id, st.total_cents, st.store_id
  )
  select b.id, p.email, w.last_total_cents, s.name, ch.total_cents::int
  from public.baskets b
  join public.profiles p on p.id = b.user_id
  join item_counts c on c.basket_id = b.id
  left join cheapest ch on ch.basket_id = b.id
  left join public.stores s on s.id = ch.store_id
  left join public.basket_price_watch w on w.basket_id = b.id
  where b.is_active
    and p.deletion_requested_at is null;
$$;

-- Only the server (service role) may run it: it returns every shopper's email.
revoke all on function public.price_drop_candidates() from public, anon, authenticated;
