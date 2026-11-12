create type public.user_role as enum ('Shopper', 'Retailer');
create type public.stock_status as enum ('In Stock', 'Limited Stock', 'Out of Stock', 'Unknown');
create type public.report_type as enum ('Queue', 'Price', 'Stock');
create type public.queue_level as enum ('none', 'short', 'moderate', 'long');

create table public.suburbs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text not null
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  suburb_id uuid not null references public.suburbs(id) on delete restrict,
  address text not null,
  opening_hours text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  unique (suburb_id, name)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(email)),
  display_name text,
  role public.user_role not null default 'Shopper',
  retailer_approved boolean not null default false,
  suburb_id uuid references public.suburbs(id) on delete set null,
  reward_points integer not null default 0 check (reward_points >= 0),
  is_16_or_older boolean not null,
  privacy_consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  barcode varchar(30) not null unique,
  product_name varchar(150) not null,
  brand_label varchar(80) not null,
  volumetric_size varchar(30) not null,
  thumbnail_path text
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  price_zar numeric(10, 2) not null check (price_zar > 0),
  stock_status public.stock_status not null default 'In Stock',
  verified_at timestamptz not null default now(),
  unique (product_id, store_id)
);

create table public.report_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  report_type public.report_type not null default 'Queue',
  submitted_value varchar(50) not null,
  is_verified boolean not null default false,
  location_mismatch boolean not null default false,
  created_at timestamptz not null default now(),
  check (report_type = 'Queue' or listing_id is not null)
);

create table public.baskets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title varchar(60) not null default 'My basket',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create unique index baskets_one_active_per_user
  on public.baskets(user_id)
  where is_active;

create table public.basket_items (
  basket_id uuid not null references public.baskets(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 99),
  primary key (basket_id, product_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  link_to text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.login_attempts (
  email text primary key,
  failed_count integer not null default 0 check (failed_count >= 0),
  locked_until timestamptz
);

create index listings_product_id_idx on public.listings(product_id);
create index listings_store_id_idx on public.listings(store_id);
create index report_logs_store_type_created_idx
  on public.report_logs(store_id, report_type, created_at desc);
create index report_logs_user_store_type_created_idx
  on public.report_logs(user_id, store_id, report_type, created_at desc);
create index products_name_search_idx
  on public.products using gin (to_tsvector('english', product_name || ' ' || brand_label));
