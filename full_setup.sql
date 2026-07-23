-- ============================================================
-- SaDonTech Hub — COMPLETE Supabase setup (run this ONE file)
-- Run once in your Supabase project's SQL Editor:
--   Project → SQL Editor → New query → paste this entire file → Run
-- Safe to re-run if something fails partway — every statement is
-- idempotent (if-not-exists / create-or-replace / on-conflict-do-nothing).
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES
-- One row per auth user. 'role' controls admin access.
-- Created automatically on signup via the trigger below.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can view every profile (needed for the admin dashboard's order list, etc.)
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. ADDRESSES — saved delivery addresses per customer
-- ------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text default 'Home',
  full_name text not null,
  phone text not null,
  street text not null,
  city text not null,
  region text,
  country text not null default 'Ghana',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

drop policy if exists "Users manage their own addresses" on public.addresses;
create policy "Users manage their own addresses"
  on public.addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. PRODUCTS — the shared catalog (replaces the hardcoded JS array)
-- ------------------------------------------------------------
create table if not exists public.products (
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

-- Anyone (including anonymous shoppers) can browse the catalog.
drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  using (true);

-- Only admins can add/edit/delete products.
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
  on public.products for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ------------------------------------------------------------
-- 4. ORDERS + ORDER ITEMS
-- ------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  address_id uuid references public.addresses(id) on delete set null,
  payment_method text not null check (payment_method in ('momo', 'card', 'pay_on_delivery')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  paystack_reference text unique,
  delivery_status text not null default 'processing'
    check (delivery_status in ('processing', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled')),
  subtotal numeric(10, 2) not null,
  delivery_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  contact_email text not null,
  contact_phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Users view their own orders" on public.orders;
create policy "Users view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "Users create their own orders" on public.orders;
create policy "Users create their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins manage all orders" on public.orders;
create policy "Admins manage all orders"
  on public.orders for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- NOTE: payment_status should only ever flip to 'paid' from the verify-payment
-- Edge Function (using the service role key), never directly from the browser —
-- see supabase/functions/verify-payment. There is deliberately no browser-facing
-- policy that lets a customer set payment_status themselves.

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0)
);

alter table public.order_items enable row level security;

drop policy if exists "Users view items from their own orders" on public.order_items;
create policy "Users view items from their own orders"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "Users insert items into their own orders" on public.order_items;
create policy "Users insert items into their own orders"
  on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "Admins manage all order items" on public.order_items;
create policy "Admins manage all order items"
  on public.order_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ------------------------------------------------------------
-- 5. WISHLIST — replaces the localStorage-only version
-- ------------------------------------------------------------
create table if not exists public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.wishlist_items enable row level security;

drop policy if exists "Users manage their own wishlist" on public.wishlist_items;
create policy "Users manage their own wishlist"
  on public.wishlist_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. REVIEWS — moderated, tied to a real signed-in customer
-- ------------------------------------------------------------
create table if not exists public.reviews (
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

drop policy if exists "Approved reviews are publicly readable" on public.reviews;
create policy "Approved reviews are publicly readable"
  on public.reviews for select
  using (is_approved = true);

drop policy if exists "Users can view and submit their own reviews" on public.reviews;
create policy "Users can view and submit their own reviews"
  on public.reviews for select
  using (auth.uid() = user_id);

drop policy if exists "Signed-in users can submit reviews" on public.reviews;
create policy "Signed-in users can submit reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "Admins moderate reviews" on public.reviews;
create policy "Admins moderate reviews"
  on public.reviews for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ------------------------------------------------------------
-- 7. SEED DATA — the current product catalog, so the storefront and the
--    admin dashboard both have real data immediately. Safe to re-run.
-- ------------------------------------------------------------
insert into public.products (id, name, category, subcategory, description, price, quantity, image_url)
values
  (1, 'Hp Notebook', 'Computers', 'Laptop computers', 'Specs RAM 16GB, ROM 256GB SSD, i5 2.5 MHz, 8th gen, Window 11 OS', 3500, 12, 'images/Hp_Notebook.jpg'),
  (2, 'Leather Handbag', 'Fashion', 'Bags', 'Quality leather material – strong and lasting, for business purposes', 200, 13, 'images/Leather_Handbag.jpg'),
  (3, 'PS 5', 'Smart Devices', 'Gaming', 'PlayStation 5 – next-gen gaming console, affordable', 4800, 7, 'images/product3.png'),
  (4, 'MacBook Air', 'Computers', 'Laptop computers', 'Apple MacBook Air – ultra-thin, ultra-fast', 4500, 3, 'images/product4.png'),
  (5, 'Apple Watch', 'Smart Devices', 'Watches', 'Apple Watch – health & fitness tracker', 300, 11, 'images/product5.png'),
  (6, 'Air Pods', 'Accessories', 'Airpods', 'Apple AirPods – wireless audio freedom', 200, 6, 'images/product6.png'),
  (7, 'Samsung TV', 'Electronics', 'Televisions', '65-inch 4K Smart TV with HDR', 3500, 8, 'images/product1.png'),
  (8, 'Pixel 4a', 'Smart Devices', 'Phones', 'Google Pixel 4a – crisp camera, pure Android', 2200, 2, 'images/product2.png'),
  (9, 'Laptop Stand', 'Accessories', 'Others', '2 in 1, Ten speed height adjustment stand', 180, 15, 'images/Laptop_Stand.jpg')
on conflict (id) do nothing;

-- Keep the identity sequence ahead of the manually-specified seed ids above,
-- so the next product an admin adds gets id 10, not a clash with these.
select setval(pg_get_serial_sequence('public.products', 'id'), (select max(id) from public.products));

-- ------------------------------------------------------------
-- (Optional) Create a Storage bucket named "product-images" (public read)
-- from the Supabase dashboard if you want real image uploads later.
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
