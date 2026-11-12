-- #8 Database foundation: tables (docs/IMPLEMENTATION_PLAN.md §4.1).
-- All times are timestamptz (UTC), shown in SAST by the app. All IDs are uuid.

create type public.user_role    as enum ('Shopper', 'Retailer');
create type public.stock_status as enum ('In Stock', 'Limited Stock', 'Out of Stock', 'Unknown');
create type public.report_type  as enum ('Queue', 'Price', 'Stock');
create type public.queue_level  as enum ('none', 'short', 'moderate', 'long');

-- Reference data: suburbs and stores (D1)
create table public.suburbs (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,                 -- 'Hatfield', 'Arcadia', 'Benoni'
  city text not null
);

create table public.stores (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,               -- 'Shoprite Hatfield'
  suburb_id     uuid not null references public.suburbs (id) on delete restrict,
  address       text not null,               -- 'Hatfield, Pretoria'
  opening_hours text not null,               -- '08:00–20:00'
  latitude      numeric(9, 6),               -- only for the 50 km location check, never shown as a map
  longitude     numeric(9, 6)
);

-- One profile per Supabase Auth user (D3). Created by the profiles_trigger migration (#14).
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text not null unique check (email = lower(email)),
  display_name       text,
  role               public.user_role not null default 'Shopper',
  retailer_approved  boolean not null default false,
  suburb_id          uuid references public.suburbs (id) on delete set null,
  reward_points      int not null default 0 check (reward_points >= 0),
  is_16_or_older     boolean not null,
  privacy_consent_at timestamptz not null,
  created_at         timestamptz not null default now()
);

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  barcode         varchar(30) not null unique,
  product_name    varchar(150) not null,
  brand_label     varchar(80) not null,
  volumetric_size varchar(30) not null,
  thumbnail_path  text                       -- Supabase Storage, compressed < 50 KB
);

-- A product's price and stock at one store
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  store_id     uuid not null references public.stores (id) on delete cascade,
  price_zar    numeric(10, 2) not null check (price_zar > 0),
  stock_status public.stock_status not null default 'In Stock',
  verified_at  timestamptz not null default now(),
  unique (product_id, store_id)
);

-- Crowd-sourced queue / price / stock reports (D2, D4)
create table public.report_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles (id) on delete set null,
  store_id          uuid not null references public.stores (id) on delete cascade,
  listing_id        uuid references public.listings (id) on delete cascade,
  report_type       public.report_type not null default 'Queue',
  submitted_value   varchar(50) not null,    -- a queue_level, a price like '34.99', or a stock_status
  is_verified       boolean not null default false,
  location_mismatch boolean not null default false,   -- more than 50 km from the store (PRD §6.2)
  created_at        timestamptz not null default now(),
  check (report_type = 'Queue' or listing_id is not null)
);

-- Saved baskets for logged-in users (guests use localStorage, plan §4.3)
create table public.baskets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      varchar(60) not null default 'My basket',
  is_active  boolean not null default true,
  updated_at timestamptz not null default now()
);
create unique index one_active_basket on public.baskets (user_id) where is_active;

create table public.basket_items (
  basket_id  uuid not null references public.baskets (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   int not null default 1 check (quantity between 1 and 99),
  primary key (basket_id, product_id)
);

-- In-app notifications (PRD §4.5)
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  link_to    text not null,                  -- e.g. '/savings'
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Failed log-in tracking for the 5-attempt lockout (D11). Service role only.
create table public.login_attempts (
  email        text primary key,
  failed_count int not null default 0,
  locked_until timestamptz
);

create index on public.listings (product_id);
create index on public.listings (store_id);
create index on public.report_logs (store_id, report_type, created_at desc);
create index on public.report_logs (user_id, store_id, report_type, created_at desc);
create index products_name_search on public.products
  using gin (to_tsvector('english', product_name || ' ' || brand_label));
