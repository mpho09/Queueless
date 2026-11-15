-- #11 F1 Search: find products by name and compare their price at every store (US1, plan Phase 2).

-- ── Fuzzy name matching ─────────────────────────────────────────────────────────────────
-- pg_trgm lets "white sugr" still find "White Sugar 2kg", and makes ILIKE '%…%' fast.
create extension if not exists pg_trgm with schema extensions;

create index if not exists products_name_trgm on public.products
  using gin (product_name extensions.gin_trgm_ops);

-- ── search_products ─────────────────────────────────────────────────────────────────────
-- One row per matching product, with every store's price as a JSON array, cheapest first.
-- Products are ordered by their cheapest price (lowest first), then by name.
-- p_suburb (optional) keeps only stores in that suburb; products with no store there are left out.
-- total_count is the number of matches before paging, for "4 results in Hatfield" and "Load more".
-- security invoker: runs with the caller's rights, so the RLS read rules still apply.
create function public.search_products(
  q        text,
  p_suburb uuid default null,
  p_limit  int  default 10,
  p_offset int  default 0
)
returns table (
  product_id      uuid,
  product_name    text,
  brand_label     text,
  volumetric_size text,
  listings        jsonb,
  total_count     bigint
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with term as (
    -- trim, cap the length, and escape LIKE wildcards so "%" or "_" are searched literally
    select left(btrim(coalesce(q, '')), 100) as raw,
           replace(replace(replace(left(btrim(coalesce(q, '')), 100), '\', '\\'), '%', '\%'), '_', '\_') as escaped
  ),
  matches as (
    select p.id, p.product_name, p.brand_label, p.volumetric_size
    from public.products p, term t
    where t.raw <> ''
      and (
        p.product_name ilike '%' || t.escaped || '%'
        or p.brand_label ilike '%' || t.escaped || '%'
        or t.raw <% p.product_name            -- word similarity, for small typos
      )
  ),
  priced as (
    select m.id,
           min(l.price_zar) as cheapest,
           jsonb_agg(
             jsonb_build_object(
               'listing_id',   l.id,
               'store_id',     s.id,
               'store_name',   s.name,
               'suburb_name',  sb.name,
               'price_zar',    l.price_zar,
               'stock_status', l.stock_status,
               'verified_at',  l.verified_at
             )
             order by l.price_zar, s.name
           ) as listings
    from matches m
    join public.listings l on l.product_id = m.id
    join public.stores s on s.id = l.store_id
    join public.suburbs sb on sb.id = s.suburb_id
    where p_suburb is null or s.suburb_id = p_suburb
    group by m.id
  )
  select m.id, m.product_name, m.brand_label, m.volumetric_size, pr.listings,
         count(*) over () as total_count
  from matches m
  join priced pr on pr.id = m.id
  order by pr.cheapest, m.product_name
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.search_products(text, uuid, int, int) from public;
grant execute on function public.search_products(text, uuid, int, int) to anon, authenticated;

-- ── Live price updates ──────────────────────────────────────────────────────────────────
-- S2 listens for changed prices and highlights them without a page refresh.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'listings'
     ) then
    alter publication supabase_realtime add table public.listings;
  end if;
end;
$$;
