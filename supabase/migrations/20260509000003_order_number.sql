-- =============================================================================
-- ohMyProfits — order_number generator (§1.2 / §3.2)
--
-- Format: ORD-XXXX-YYYY-NNNNNN
--   * XXXX    = first 4 hex chars of owner_id, uppercased (stable per-user tag).
--               This is for visual/identification convenience; it is NOT a
--               security boundary — RLS already prevents cross-user access.
--   * YYYY    = the order's order_year (extracted from order_date or now())
--   * NNNNNN  = zero-padded autoincrement, scoped to (owner_id, year)
--
-- Implementation: a counter table owned per (owner_id, year), advanced inside
-- a transaction with SELECT ... FOR UPDATE on the row to serialize concurrent
-- INSERTs from the same owner. This is collision-proof under load and tamper-
-- proof from the client (RLS prevents anon access; the trigger overwrites any
-- value the client may have sent).
-- =============================================================================

create table public.order_number_counters (
  owner_id uuid    not null references auth.users(id) on delete cascade,
  year     integer not null,
  next_seq bigint  not null default 1,
  primary key (owner_id, year),
  constraint order_number_counters_seq_positive check (next_seq >= 1)
);

alter table public.order_number_counters enable row level security;
alter table public.order_number_counters force  row level security;

-- The counters table is touched only by SECURITY DEFINER functions; deny all
-- direct access. (Even authenticated users have no policy here.)
revoke all on table public.order_number_counters from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Allocator: returns the next sequence for (owner, year), atomically.
-- -----------------------------------------------------------------------------
create or replace function public.next_order_number(
  p_owner uuid,
  p_year  integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq    bigint;
  v_tag    text;
  v_number text;
begin
  if p_owner is null then
    raise exception 'next_order_number: owner is required'
      using errcode = '22023';
  end if;

  insert into public.order_number_counters (owner_id, year, next_seq)
  values (p_owner, p_year, 1)
  on conflict (owner_id, year) do nothing;

  update public.order_number_counters
     set next_seq = next_seq + 1
   where owner_id = p_owner and year = p_year
   returning next_seq - 1 into v_seq;

  -- First 4 hex chars of owner_id, uppercased. Deterministic per user.
  v_tag := upper(substr(replace(p_owner::text, '-', ''), 1, 4));

  v_number := format('ORD-%s-%s-%s', v_tag, p_year::text, lpad(v_seq::text, 6, '0'));
  return v_number;
end;
$$;

revoke all on function public.next_order_number(uuid, integer) from public;

-- -----------------------------------------------------------------------------
-- BEFORE INSERT trigger on orders. Always rewrites order_number/order_year so
-- a client value is ignored.
-- -----------------------------------------------------------------------------
create or replace function public.orders_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
begin
  v_year := coalesce(
    extract(year from new.order_date)::int,
    extract(year from timezone('utc', now()))::int
  );
  new.order_year   := v_year;
  new.order_number := public.next_order_number(new.owner_id, v_year);
  return new;
end;
$$;

revoke all on function public.orders_assign_number() from public;

-- The owner_id trigger from migration 0001 fires first (alphabetically:
-- orders_set_owner_id < orders_z_assign_number). We name this trigger to sort
-- AFTER orders_set_owner_id so new.owner_id is populated when we read it.
create trigger orders_z_assign_number
  before insert on public.orders
  for each row execute function public.orders_assign_number();
