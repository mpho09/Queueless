-- #18 Report rules (docs/IMPLEMENTATION_PLAN.md §4.2, §6): BR2 limits, D4 verification, price/stock updates.
-- This migration only ADDS functions and triggers. It does not change the #8 tables or RLS policies
-- (the "only verified Shoppers can insert" rule already lives in the rls migration).

-- ── BR2 + input checks: runs before every insert on report_logs ─────────────────────────
-- Limits per user, per store, in the last 60 minutes:
--   Queue reports: max 5.   Price + Stock reports share a max of 3.
-- Over the limit raises 'BR2_LIMIT' (errcode P0001). DETAIL says which limit ('queue' or 'price'),
-- so the app can show the right message.
-- security definer so the count always sees the user's own rows, whatever RLS says.
create function public.check_report_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit       int;
  v_count       int;
  v_listing_store uuid;
begin
  -- The client can send any column, so the server decides these two (found in review of #35):
  --  - created_at: a backdated report would not count toward "the last 60 minutes" (BR2 bypass)
  --  - is_verified: a report is only verified by the D4 trigger when another shopper matches it
  NEW.created_at := now();
  NEW.is_verified := false;

  -- Check the value really matches the report type, so bad data never reaches listings.
  if NEW.report_type = 'Queue' then
    if NEW.submitted_value not in ('none', 'short', 'moderate', 'long') then
      raise exception 'INVALID_REPORT' using errcode = '22023', detail = 'queue';
    end if;
  elsif NEW.report_type = 'Price' then
    -- up to 8 digits, at most 2 decimals, greater than zero (matches listings.price_zar)
    if NEW.submitted_value !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$' or NEW.submitted_value::numeric <= 0 then
      raise exception 'INVALID_REPORT' using errcode = '22023', detail = 'price';
    end if;
  elsif NEW.report_type = 'Stock' then
    if NEW.submitted_value not in ('In Stock', 'Limited Stock', 'Out of Stock') then
      raise exception 'INVALID_REPORT' using errcode = '22023', detail = 'stock';
    end if;
  end if;

  -- A price/stock report must point at a listing that belongs to the same store.
  if NEW.report_type <> 'Queue' then
    select l.store_id into v_listing_store from public.listings l where l.id = NEW.listing_id;
    if v_listing_store is distinct from NEW.store_id then
      raise exception 'INVALID_REPORT' using errcode = '22023', detail = 'listing';
    end if;
  end if;

  -- BR2 only applies to reports with a user (user_id can be null after account deletion).
  if NEW.user_id is not null then
    v_limit := case when NEW.report_type = 'Queue' then 5 else 3 end;

    select count(*) into v_count
    from public.report_logs r
    where r.user_id = NEW.user_id
      and r.store_id = NEW.store_id
      and (r.report_type = 'Queue') = (NEW.report_type = 'Queue')
      and r.created_at > now() - interval '60 minutes';

    if v_count >= v_limit then
      raise exception 'BR2_LIMIT' using errcode = 'P0001',
        detail = case when NEW.report_type = 'Queue' then 'queue' else 'price' end;
    end if;
  end if;

  return NEW;
end;
$$;

revoke execute on function public.check_report_before_insert() from public, anon, authenticated;

create trigger report_logs_before_insert
  before insert on public.report_logs
  for each row execute function public.check_report_before_insert();

-- ── D4: runs after every insert on report_logs ──────────────────────────────────────────
-- A "match" is a report from ANOTHER user for the same store and type, within 30 minutes,
-- not yet verified, and not flagged as more than 50 km away:
--   Queue: same value.   Price: same listing and prices within R0.50.   Stock: same listing and value.
-- When a match is found: both reports become verified, both users get +10 points and a
-- notification, and a Price/Stock report updates the listing.
-- security definer because clients can't update report_logs, profiles, listings or notifications.
create function public.verify_matching_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match_id   uuid;
  v_match_user uuid;
  v_store_name text;
begin
  -- Distant (>50 km) or anonymous reports are never used for verification.
  if NEW.user_id is null or NEW.location_mismatch or NEW.is_verified then
    return NEW;
  end if;

  select r.id, r.user_id into v_match_id, v_match_user
  from public.report_logs r
  where r.id <> NEW.id
    and r.user_id is not null
    and r.user_id <> NEW.user_id
    and r.store_id = NEW.store_id
    and r.report_type = NEW.report_type
    and not r.is_verified
    and not r.location_mismatch
    and r.created_at >= NEW.created_at - interval '30 minutes'
    and case NEW.report_type
          when 'Queue' then r.submitted_value = NEW.submitted_value
          when 'Price' then r.listing_id = NEW.listing_id
                            and abs(r.submitted_value::numeric - NEW.submitted_value::numeric) <= 0.50
          when 'Stock' then r.listing_id = NEW.listing_id
                            and r.submitted_value = NEW.submitted_value
        end
  order by r.created_at desc
  limit 1;

  if v_match_id is null then
    return NEW;
  end if;

  update public.report_logs set is_verified = true where id in (NEW.id, v_match_id);

  update public.profiles set reward_points = reward_points + 10
  where id in (NEW.user_id, v_match_user);

  select s.name into v_store_name from public.stores s where s.id = NEW.store_id;

  insert into public.notifications (user_id, body, link_to)
  select u, format('Thank you! Your update for %s has been verified. +10 points added.', v_store_name), '/savings'
  from unnest(array[NEW.user_id, v_match_user]) as u;

  -- Only verified price and stock reports change the listing (plan §4.2).
  if NEW.report_type = 'Price' then
    update public.listings
    set price_zar = NEW.submitted_value::numeric, verified_at = now()
    where id = NEW.listing_id;
  elsif NEW.report_type = 'Stock' then
    update public.listings
    set stock_status = NEW.submitted_value::public.stock_status, verified_at = now()
    where id = NEW.listing_id;
  end if;

  return NEW;
end;
$$;

revoke execute on function public.verify_matching_reports() from public, anon, authenticated;

create trigger report_logs_after_insert
  after insert on public.report_logs
  for each row execute function public.verify_matching_reports();
