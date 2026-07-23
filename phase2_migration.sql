-- ============================================================
-- SaDonTech Hub — Phase 2 migration
-- Run this in the SQL Editor AFTER schema.sql.
-- Safe to run on a fresh project with no real orders/products yet —
-- it drops and recreates products/order_items/wishlist_items/reviews
-- to fix the id type. If you've already got real data in those tables,
-- back it up first.
-- ============================================================

drop table if exists public.reviews cascade;
drop table if exists public.wishlist_items cascade;
drop table if exists public.order_items cascade;
drop table if exists public.products cascade;

-- ------------------------------------------------------------
-- PRODUCTS (bigint id — matches the numeric ids used throughout the
-- storefront's cart/wishlist/checkout code, e.g. addToCart(3))
-- ------------------------------------------------------------
create table public.products (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null,
  subcategory text,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  image_url text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Products are publicly readable"
  on public.products for select
  using (true);

create policy "Admins manage products"
  on public.products for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ------------------------------------------------------------
-- ORDER ITEMS
-- ------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0)
);

alter table public.order_items enable row level security;

create policy "Users view items from their own orders"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create policy "Admins manage all order items"
  on public.order_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Note: there is deliberately NO customer-facing insert policy on order_items.
-- Rows are only ever created by place_order() below (security definer), so an
-- order's contents can't be tampered with from the browser after the fact.

-- ------------------------------------------------------------
-- WISHLIST
-- ------------------------------------------------------------
create table public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.wishlist_items enable row level security;

create policy "Users manage their own wishlist"
  on public.wishlist_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- REVIEWS
-- ------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_id bigint references public.products(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text not null,
  quote text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Approved reviews are publicly readable"
  on public.reviews for select
  using (is_approved = true);

create policy "Users can view their own reviews"
  on public.reviews for select
  using (auth.uid() = user_id);

create policy "Signed-in users can submit reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Admins moderate reviews"
  on public.reviews for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ------------------------------------------------------------
-- Also relax orders.address_id / order_items FK types don't need to change
-- (orders.id stays uuid, addresses.id stays uuid).
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- place_order(): the ONLY way an order gets created. Runs as one atomic
-- transaction: locks each product row, checks stock, computes the total
-- itself (never trusts a client-supplied price), inserts the order +
-- order_items, and decrements stock. Callable by any logged-in user, but
-- always acts as that user (auth.uid()) — never on someone else's behalf.
-- ------------------------------------------------------------
create or replace function public.place_order(
  p_items jsonb,              -- [{ "product_id": 3, "quantity": 2 }, ...]
  p_full_name text,
  p_phone text,
  p_street text,
  p_city text,
  p_country text,
  p_payment_method text,
  p_contact_email text,
  p_contact_phone text,
  p_delivery_fee numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_address_id uuid;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty int;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to place an order.';
  end if;

  if p_payment_method not in ('momo', 'card', 'pay_on_delivery') then
    raise exception 'Invalid payment method.';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  -- Save/attach the delivery address used for this order.
  insert into public.addresses (user_id, full_name, phone, street, city, country)
  values (auth.uid(), p_full_name, p_phone, p_street, p_city, p_country)
  returning id into v_address_id;

  -- Validate stock and compute the trusted subtotal server-side.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
      where id = (v_item->>'product_id')::bigint
      for update; -- lock the row so concurrent checkouts can't oversell

    if not found then
      raise exception 'One of the items in your cart is no longer available.';
    end if;

    v_qty := (v_item->>'quantity')::int;
    if v_qty < 1 then
      raise exception 'Invalid quantity for %', v_product.name;
    end if;
    if v_product.quantity < v_qty then
      raise exception 'Only % left in stock for %', v_product.quantity, v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  end loop;

  insert into public.orders (
    user_id, address_id, payment_method, payment_status,
    subtotal, delivery_fee, total, contact_email, contact_phone
  )
  values (
    auth.uid(), v_address_id, p_payment_method, 'pending',
    v_subtotal, p_delivery_fee, v_subtotal + p_delivery_fee, p_contact_email, p_contact_phone
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products where id = (v_item->>'product_id')::bigint;
    v_qty := (v_item->>'quantity')::int;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty);

    update public.products set quantity = quantity - v_qty, updated_at = now() where id = v_product.id;
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.place_order to authenticated;

-- ------------------------------------------------------------
-- cancel_order(): restores stock and marks an order failed/cancelled.
-- Used when a customer abandons or fails the online payment step.
-- Only works on the caller's own order, and only while still 'pending'
-- (so it can't be used to undo an order that already succeeded).
-- ------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_rows int;
begin
  update public.orders
    set payment_status = 'failed', delivery_status = 'cancelled', updated_at = now()
    where id = p_order_id and user_id = auth.uid() and payment_status = 'pending';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return; -- nothing to do: not found, not theirs, or already resolved
  end if;

  for v_item in select * from public.order_items where order_id = p_order_id
  loop
    update public.products set quantity = quantity + v_item.quantity, updated_at = now()
      where id = v_item.product_id;
  end loop;
end;
$$;

grant execute on function public.cancel_order to authenticated;
