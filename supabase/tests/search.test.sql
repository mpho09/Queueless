-- #11 Search tests (pgTAP). Uses the seed data from supabase/seed.sql.
-- Everything runs in one transaction and is rolled back, so the shared database is left unchanged.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

-- Guests use search, so test as anon
set local role anon;

select is(
  (select product_name from search_products('White Sugar 2kg') limit 1),
  'White Sugar 2kg',
  'T-US1-1: "White Sugar 2kg" finds White Sugar 2kg'
);
select is(
  (select array_agg(e->>'store_name' order by ord)
     from search_products('White Sugar 2kg') r,
          jsonb_array_elements(r.listings) with ordinality as x(e, ord)
    where r.product_name = 'White Sugar 2kg'),
  array['Shoprite Hatfield', 'Pick n Pay Hatfield'],
  'Store prices are listed lowest first (Shoprite R42.99, then Pick n Pay R44.99)'
);
select is(
  (select count(*)::int from search_products('white sugar')),
  1,
  'Search ignores upper and lower case'
);
select ok(
  exists (select 1 from search_products('sugr') where product_name = 'White Sugar 2kg'),
  'A small typo ("sugr") still finds White Sugar 2kg'
);
select ok(
  exists (select 1 from search_products('Clover') where product_name = 'Clover Full Cream Milk 2L'),
  'Search also matches the brand'
);
select is(
  (select count(*)::int from search_products('Quinoa Organic 1kg')),
  0,
  'T-US1-2: no matches returns nothing'
);
select is(
  (select count(*)::int from search_products('   ')),
  0,
  'An empty search returns nothing'
);
select is(
  (select count(*)::int from search_products('%')),
  0,
  'A "%" is searched literally, not as "match everything"'
);
select is(
  (select count(*)::int from search_products('White Sugar 2kg', '10000000-0000-4000-8000-000000000002')),
  0,
  'Filtering by Arcadia (no stores) returns nothing'
);
select is(
  (select count(*)::int from search_products('l', null, 1, 0)),
  1,
  'Paging returns at most p_limit rows'
);
select ok(
  (select bool_and(total_count = (select count(*) from search_products('l', null, 50, 0)))
     from search_products('l', null, 1, 1)),
  'total_count is the full number of matches, not just this page'
);

select * from finish();
rollback;
