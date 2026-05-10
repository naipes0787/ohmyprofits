-- =============================================================================
-- ohMyProfits — initial schema
-- Tables: clients, categories, products, orders, order_items
-- Multi-tenant from day one: every domain row carries owner_id = auth.uid().
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "citext"   with schema extensions;

-- -----------------------------------------------------------------------------
-- updated_at trigger helper.
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Owner-id trigger: end-user clients NEVER set owner_id; we populate from
-- auth.uid(). Service-role callers (seed scripts, admin tools) bypass this by
-- supplying owner_id explicitly — RLS still enforces owner_id = auth.uid() on
-- the regular `authenticated` and `anon` roles, so a normal client can't
-- smuggle in a foreign owner_id. This is the security boundary referenced in
-- §3.2.
-- -----------------------------------------------------------------------------
create or replace function public.set_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is not null then
    -- Authenticated user path: stamp owner_id from the JWT and ignore any
    -- value the caller tried to send.
    new.owner_id := uid;
  elsif new.owner_id is null then
    -- No JWT and no explicit owner_id — refuse, this row would be unowned.
    raise exception 'auth.uid() is null — owner_id cannot be assigned'
      using errcode = '28000';
  end if;
  -- Service-role path: auth.uid() is null but owner_id was supplied. Trust it
  -- (only superuser / service_role bypasses RLS, which gates this entirely).
  return new;
end;
$$;

revoke all on function public.set_owner_id() from public;

-- =============================================================================
-- Clients
-- =============================================================================
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  email       extensions.citext,
  address     text,
  phone       text,
  deleted_at  timestamptz,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),

  constraint clients_name_len    check (char_length(name) between 1 and 120),
  constraint clients_desc_len    check (description is null or char_length(description) <= 2000),
  constraint clients_email_shape check (
    email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  constraint clients_address_len check (address is null or char_length(address) <= 500),
  constraint clients_phone_len   check (phone is null or char_length(phone) <= 32)
);

create index clients_owner_id_idx on public.clients (owner_id) where deleted_at is null;
create index clients_owner_name_idx on public.clients (owner_id, name) where deleted_at is null;

create trigger clients_set_owner_id    before insert on public.clients for each row execute function public.set_owner_id();
create trigger clients_set_updated_at  before update on public.clients for each row execute function public.set_updated_at();

-- =============================================================================
-- Categories
-- =============================================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),

  constraint categories_name_len check (char_length(name) between 1 and 120),
  constraint categories_desc_len check (description is null or char_length(description) <= 2000),
  constraint categories_owner_name_unique unique (owner_id, name)
);

create trigger categories_set_owner_id   before insert on public.categories for each row execute function public.set_owner_id();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();

-- =============================================================================
-- Products
-- =============================================================================
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name        text not null,
  description text,
  base_price  numeric(14, 4),
  cost_price  numeric(14, 4),
  stock       integer,
  deleted_at  timestamptz,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),

  constraint products_name_len    check (char_length(name) between 1 and 120),
  constraint products_desc_len    check (description is null or char_length(description) <= 2000),
  constraint products_base_nonneg check (base_price is null or base_price >= 0),
  constraint products_cost_nonneg check (cost_price is null or cost_price >= 0),
  constraint products_stock_nonneg check (stock is null or stock >= 0)
);

create index products_owner_id_idx          on public.products (owner_id) where deleted_at is null;
create index products_owner_category_idx    on public.products (owner_id, category_id) where deleted_at is null;
create index products_owner_name_idx        on public.products (owner_id, name) where deleted_at is null;

create trigger products_set_owner_id   before insert on public.products for each row execute function public.set_owner_id();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();

-- Enforce that a product's category_id belongs to the same owner.
-- This is a defense-in-depth check on top of RLS; an attacker who somehow
-- bypassed RLS still cannot reference another owner's category.
create or replace function public.products_check_category_owner()
returns trigger
language plpgsql
as $$
declare
  cat_owner uuid;
begin
  select owner_id into cat_owner from public.categories where id = new.category_id;
  if cat_owner is null or cat_owner <> new.owner_id then
    raise exception 'Category % does not belong to owner %', new.category_id, new.owner_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Sorts after products_set_owner_id so new.owner_id is populated.
create trigger products_y_check_category_owner
  before insert or update of category_id, owner_id on public.products
  for each row execute function public.products_check_category_owner();

-- =============================================================================
-- Order status / payment status enums
-- =============================================================================
create type public.order_status as enum (
  'Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled'
);

create type public.payment_status as enum (
  'Pending', 'Paid', 'Partial'
);

-- =============================================================================
-- Orders
-- =============================================================================
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete restrict,
  -- order_number is generated by the server-side trigger (migration 0003).
  -- Keep the column NOT NULL but allow the trigger to populate it pre-INSERT.
  order_number     text not null default '__pending__',
  order_year       integer not null default extract(year from timezone('utc', now()))::int,
  status           public.order_status   not null default 'Pending',
  payment_status   public.payment_status not null default 'Pending',
  pending_amount   numeric(14, 4),
  discount_percent numeric(5, 2),
  currency         text not null default 'USD',
  order_date       date  not null default (timezone('utc', now()))::date,
  delivery_address text,
  notes            text,
  deleted_at       timestamptz,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),

  constraint orders_owner_number_unique unique (owner_id, order_number),
  constraint orders_currency_iso        check (currency ~ '^[A-Z]{3}$'),
  constraint orders_discount_range      check (
    discount_percent is null
    or (discount_percent >= 0 and discount_percent <= 100)
  ),
  constraint orders_pending_nonneg      check (pending_amount is null or pending_amount >= 0),
  constraint orders_partial_requires_amount check (
    payment_status <> 'Partial' or pending_amount is not null
  ),
  constraint orders_delivery_len        check (delivery_address is null or char_length(delivery_address) <= 500),
  constraint orders_notes_len           check (notes is null or char_length(notes) <= 2000)
);

create index orders_owner_id_idx       on public.orders (owner_id) where deleted_at is null;
create index orders_owner_client_idx   on public.orders (owner_id, client_id) where deleted_at is null;
create index orders_owner_status_idx   on public.orders (owner_id, status) where deleted_at is null;
create index orders_owner_date_idx     on public.orders (owner_id, order_date desc) where deleted_at is null;

create trigger orders_set_owner_id     before insert on public.orders for each row execute function public.set_owner_id();
create trigger orders_set_updated_at   before update on public.orders for each row execute function public.set_updated_at();

-- Same defense-in-depth check for client_id.
create or replace function public.orders_check_client_owner()
returns trigger
language plpgsql
as $$
declare
  cli_owner uuid;
begin
  select owner_id into cli_owner from public.clients where id = new.client_id;
  if cli_owner is null or cli_owner <> new.owner_id then
    raise exception 'Client % does not belong to owner %', new.client_id, new.owner_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Named with a "y_" prefix so it sorts AFTER orders_set_owner_id (so owner_id
-- is populated when we read it) and BEFORE orders_z_assign_number.
create trigger orders_y_check_client_owner
  before insert or update of client_id, owner_id on public.orders
  for each row execute function public.orders_check_client_owner();

-- =============================================================================
-- Order items
-- =============================================================================
create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  order_id      uuid not null references public.orders(id)   on delete cascade,
  product_id    uuid not null references public.products(id) on delete restrict,
  quantity      integer not null,
  unit_price    numeric(14, 4) not null,
  position      integer not null default 0,
  created_at    timestamptz not null default timezone('utc', now()),

  constraint order_items_quantity_positive check (quantity >= 1),
  constraint order_items_unit_price_nonneg check (unit_price >= 0)
);

create index order_items_order_idx        on public.order_items (order_id);
create index order_items_owner_product    on public.order_items (owner_id, product_id);

create trigger order_items_set_owner_id   before insert on public.order_items for each row execute function public.set_owner_id();

-- Enforce same-owner relationship for both order and product.
create or replace function public.order_items_check_owner()
returns trigger
language plpgsql
as $$
declare
  ord_owner uuid;
  prod_owner uuid;
begin
  select owner_id into ord_owner  from public.orders   where id = new.order_id;
  select owner_id into prod_owner from public.products where id = new.product_id;
  if ord_owner is null or ord_owner <> new.owner_id then
    raise exception 'Order % does not belong to owner %', new.order_id, new.owner_id
      using errcode = '23514';
  end if;
  if prod_owner is null or prod_owner <> new.owner_id then
    raise exception 'Product % does not belong to owner %', new.product_id, new.owner_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Sorts after order_items_set_owner_id so new.owner_id is populated.
create trigger order_items_y_check_owner
  before insert or update of order_id, product_id, owner_id on public.order_items
  for each row execute function public.order_items_check_owner();
