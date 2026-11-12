-- Local/demo seed data only. Do not apply this file to a production project.
insert into public.suburbs (id, name, city)
values
  ('10000000-0000-4000-8000-000000000001', 'Hatfield', 'Pretoria'),
  ('10000000-0000-4000-8000-000000000002', 'Arcadia', 'Pretoria'),
  ('10000000-0000-4000-8000-000000000003', 'Benoni', 'Ekurhuleni')
on conflict (id) do update
set name = excluded.name,
    city = excluded.city;

insert into public.stores (id, name, suburb_id, address, opening_hours, latitude, longitude)
values
  ('20000000-0000-4000-8000-000000000001', 'Shoprite Hatfield', '10000000-0000-4000-8000-000000000001', 'Hatfield, Pretoria', '08:00–20:00', -25.7461, 28.1881),
  ('20000000-0000-4000-8000-000000000002', 'Pick n Pay Hatfield', '10000000-0000-4000-8000-000000000001', 'Hatfield, Pretoria', '08:00–20:00', -25.7461, 28.1881),
  ('20000000-0000-4000-8000-000000000003', 'Checkers Hatfield', '10000000-0000-4000-8000-000000000001', 'Hatfield, Pretoria', '08:00–20:00', -25.7461, 28.1881)
on conflict (id) do update
set name = excluded.name,
    suburb_id = excluded.suburb_id,
    address = excluded.address,
    opening_hours = excluded.opening_hours,
    latitude = excluded.latitude,
    longitude = excluded.longitude;

insert into public.products (id, barcode, product_name, brand_label, volumetric_size)
values
  ('30000000-0000-4000-8000-000000000001', '6000000000011', 'Clover Full Cream Milk 2L', 'Clover', '2L'),
  ('30000000-0000-4000-8000-000000000002', '6000000000022', 'Albany Superior White Bread 700g', 'Albany', '700g'),
  ('30000000-0000-4000-8000-000000000003', '6000000000033', 'White Sugar 2kg', 'Huletts', '2kg'),
  ('30000000-0000-4000-8000-000000000004', '6000000000044', 'Sunflower Oil 2L', 'Sunfoil', '2L')
on conflict (id) do update
set barcode = excluded.barcode,
    product_name = excluded.product_name,
    brand_label = excluded.brand_label,
    volumetric_size = excluded.volumetric_size;

insert into public.listings (id, product_id, store_id, price_zar, stock_status, verified_at)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 36.99, 'In Stock', now()),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 38.49, 'Out of Stock', now()),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 37.99, 'In Stock', now()),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 18.99, 'Unknown', now()),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 19.49, 'In Stock', now()),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 17.99, 'In Stock', now()),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 42.99, 'In Stock', now()),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 44.99, 'In Stock', now() - interval '3 days'),
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 64.99, 'Limited Stock', now() - interval '3 days')
on conflict (id) do update
set product_id = excluded.product_id,
    store_id = excluded.store_id,
    price_zar = excluded.price_zar,
    stock_status = excluded.stock_status,
    verified_at = excluded.verified_at;

insert into public.report_logs (id, store_id, report_type, submitted_value, is_verified, created_at)
values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Queue', 'long', true, now() - interval '5 minutes'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Queue', 'long', true, now() - interval '8 minutes'),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Queue', 'long', true, now() - interval '11 minutes'),
  ('50000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Queue', 'long', true, now() - interval '14 minutes'),
  ('50000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'Queue', 'long', true, now() - interval '17 minutes'),
  ('50000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'Queue', 'long', true, now() - interval '20 minutes'),
  ('50000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'Queue', 'short', true, now() - interval '6 minutes'),
  ('50000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', 'Queue', 'short', true, now() - interval '12 minutes'),
  ('50000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 'Queue', 'moderate', true, now() - interval '7 minutes'),
  ('50000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000003', 'Queue', 'moderate', true, now() - interval '13 minutes')
on conflict (id) do update
set store_id = excluded.store_id,
    report_type = excluded.report_type,
    submitted_value = excluded.submitted_value,
    is_verified = excluded.is_verified,
    created_at = excluded.created_at;

do $$
declare
  test_user_id uuid;
  test_basket_id uuid;
begin
  select id into test_user_id
  from public.profiles
  where email = 'tester.joy@queueless.co.za';

  if test_user_id is not null then
    select id into test_basket_id
    from public.baskets
    where user_id = test_user_id and is_active
    limit 1;

    if test_basket_id is null then
      test_basket_id := '60000000-0000-4000-8000-000000000001';
      insert into public.baskets (id, user_id, title, is_active)
      values (test_basket_id, test_user_id, 'Test basket', true)
      on conflict (id) do update
      set user_id = excluded.user_id,
          title = excluded.title,
          is_active = excluded.is_active;
    end if;

    insert into public.basket_items (basket_id, product_id, quantity)
    select test_basket_id, id, 1
    from public.products
    where barcode in ('6000000000011', '6000000000022', '6000000000033')
    on conflict (basket_id, product_id) do update
    set quantity = excluded.quantity;
  end if;
end;
$$;
