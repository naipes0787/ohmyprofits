-- =============================================================================
-- ohMyProfits — Row Level Security (§3.2)
--
-- Every table is restricted to rows where owner_id = auth.uid(). Because
-- owner_id is set by a BEFORE INSERT trigger from auth.uid(), the WITH CHECK
-- clause is technically redundant for fresh rows, but we keep it for defense
-- in depth — a future trigger change cannot accidentally let cross-owner
-- writes through.
-- =============================================================================

alter table public.clients     enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

alter table public.clients     force row level security;
alter table public.categories  force row level security;
alter table public.products    force row level security;
alter table public.orders      force row level security;
alter table public.order_items force row level security;

-- -----------------------------------------------------------------------------
-- Clients
-- -----------------------------------------------------------------------------
-- The SELECT policy is ownership-only. The `deleted_at is null` filter is
-- applied at the query layer (see src/features/*) — putting it here would
-- cascade into UPDATE's implicit post-row visibility check and reject any
-- write that sets `deleted_at` (Postgres evaluates SELECT USING as a kind of
-- WITH CHECK against the post-update row when there's an implicit RETURNING).
create policy "clients_select_own"
  on public.clients for select to authenticated
  using (owner_id = auth.uid());

create policy "clients_insert_own"
  on public.clients for insert to authenticated
  with check (owner_id = auth.uid());

create policy "clients_update_own"
  on public.clients for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "clients_delete_own"
  on public.clients for delete to authenticated
  using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------
create policy "categories_select_own"
  on public.categories for select to authenticated
  using (owner_id = auth.uid());

create policy "categories_insert_own"
  on public.categories for insert to authenticated
  with check (owner_id = auth.uid());

create policy "categories_update_own"
  on public.categories for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "categories_delete_own"
  on public.categories for delete to authenticated
  using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
create policy "products_select_own"
  on public.products for select to authenticated
  using (owner_id = auth.uid());

create policy "products_insert_own"
  on public.products for insert to authenticated
  with check (owner_id = auth.uid());

create policy "products_update_own"
  on public.products for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "products_delete_own"
  on public.products for delete to authenticated
  using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create policy "orders_select_own"
  on public.orders for select to authenticated
  using (owner_id = auth.uid());

create policy "orders_insert_own"
  on public.orders for insert to authenticated
  with check (owner_id = auth.uid());

create policy "orders_update_own"
  on public.orders for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "orders_delete_own"
  on public.orders for delete to authenticated
  using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Order items
-- -----------------------------------------------------------------------------
create policy "order_items_select_own"
  on public.order_items for select to authenticated
  using (owner_id = auth.uid());

create policy "order_items_insert_own"
  on public.order_items for insert to authenticated
  with check (owner_id = auth.uid());

create policy "order_items_update_own"
  on public.order_items for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "order_items_delete_own"
  on public.order_items for delete to authenticated
  using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Anonymous role: explicitly no access.
-- -----------------------------------------------------------------------------
revoke all on table public.clients     from anon;
revoke all on table public.categories  from anon;
revoke all on table public.products    from anon;
revoke all on table public.orders      from anon;
revoke all on table public.order_items from anon;
