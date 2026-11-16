-- #20 follow-up to the #29 review: stop savings being inflated on S6.
-- 1. Only the shopper's ACTIVE basket can record a saving (an old, deactivated basket can't).
-- 2. At most one saving per user per day, so "new basket → record → deactivate → repeat" adds nothing.

alter table public.savings_events
  add constraint savings_events_one_per_user_per_day unique (user_id, saved_on);

create or replace function public.record_basket_saving(p_basket_id uuid)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_active boolean;
  v_store  uuid;
  v_saving int;
begin
  -- security definer skips RLS, so check ownership here
  select b.is_active into v_active
  from public.baskets b
  where b.id = p_basket_id and b.user_id = v_user;

  if v_user is null or v_active is null then
    raise exception 'You can''t do that.' using errcode = '42501';
  end if;

  -- Only the active basket counts
  if not v_active then
    return null;
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

  -- One per basket per day and one per user per day: whichever is hit first, nothing new is logged.
  insert into public.savings_events (user_id, basket_id, store_id, amount_cents)
  values (v_user, p_basket_id, v_store, v_saving)
  on conflict do nothing;

  return v_saving;
end;
$$;

-- create or replace keeps the existing grants; repeat them so this file reads on its own.
revoke execute on function public.record_basket_saving(uuid) from public, anon;
grant execute on function public.record_basket_saving(uuid) to authenticated;
