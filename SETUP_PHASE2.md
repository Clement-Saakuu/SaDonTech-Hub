# SaDonTech Hub — Phase 2 Setup (Products, Orders, Admin, Real Payment Verification)

Do these in order. Assumes you already completed `SETUP.md` (Phase 1) and
signup/login/logout/reset-password are working.

## 1. Run the Phase 2 migration

1. Supabase dashboard → **SQL Editor** → New query.
2. Paste the entire contents of `supabase/phase2_migration.sql` and **Run**.

This rebuilds `products`, `order_items`, `wishlist_items`, and `reviews`
with a numeric `id` for products (matching the ids your storefront code
already uses everywhere), and adds two database functions:

- **`place_order(...)`** — the only way an order is created. It locks the
  relevant product rows, checks stock, computes the total itself (never
  trusts a price sent from the browser), and decrements stock — all in one
  atomic transaction.
- **`cancel_order(...)`** — restores stock if a customer abandons or fails
  an online payment, so stock isn't held hostage by a checkout that never
  completed.

If this fails with an error about existing tables/policies, it's safe to
re-run — it drops and recreates the four tables it owns before rebuilding
them.

## 2. Seed the product catalog

1. SQL Editor → New query.
2. Paste `supabase/seed_products.sql` and **Run**.

This loads the same 9 products the site launched with, so the storefront
isn't empty. From here on, **edit products through `admin.html`**, not by
editing `app.js` — the storefront now reads live from this table.

## 3. Make yourself an admin (if you haven't already)

1. Sign up / log in once through the site.
2. Supabase → **Table Editor → profiles** → find your row → change `role`
   from `customer` to `admin`.
3. Visit `admin.html` — you should see the dashboard instead of "Admins
   only."

## 4. Deploy the payment-verification Edge Function

This is the piece that makes "payment confirmed" trustworthy — it checks
the transaction directly with Paystack using your **secret** key, which
never touches the browser.

You'll need the Supabase CLI (one-time install):

```bash
npm install -g supabase
supabase login
```

Then, from this project's root folder (where the `supabase/` folder is):

```bash
supabase link --project-ref cgwffvsabwecpuuvmohn
supabase functions deploy verify-payment
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

- Get your Paystack **secret** key (starts `sk_test_` or `sk_live_`) from
  https://dashboard.paystack.com/#/settings/developer — **never put this
  key in any file in this repo or in `supabase-config.js`**. It only ever
  goes into `supabase secrets set`, which stores it encrypted on
  Supabase's servers for the Edge Function to read.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically
  for every Edge Function — you don't set those yourself.

## 5. Test the full order flow

1. Add items to cart on the storefront, go to checkout.
2. If you're not logged in, you'll be prompted to log in first — orders
   are now tied to real accounts (this also enables order history).
3. Try **Pay on Delivery**: order should confirm immediately, and stock
   should visibly decrease on the product grid.
4. Try **Mobile Money**: complete a test payment in the Paystack popup
   (use Paystack's test card/mobile money numbers from their docs while
   `PAYSTACK_PUBLIC_KEY` in `app.js` is still a `pk_test_` key). Confirm
   the order shows as "paid" — check `admin.html` → Orders to see it.
5. Check `account.html` → Order History — the order should appear there
   with its items and status.
6. In `admin.html`, try updating an order's delivery status — it should
   save immediately.

## What changed in this phase

- **Products**: now live in Supabase (`products` table), editable from
  `admin.html`. `app.js` falls back to the old hardcoded list only if
  Supabase isn't configured or the fetch fails.
- **Checkout**: requires login, calls `place_order()` (server-validated
  stock + pricing) instead of the browser deciding what to charge.
- **Payment verification**: Mobile Money/card payments are confirmed by
  the `verify-payment` Edge Function talking directly to Paystack with the
  secret key — the browser's "payment succeeded" callback is no longer
  trusted on its own.
- **Order history & addresses**: `account.html` now shows real orders and
  lets customers manage saved addresses (one is also saved automatically
  on every checkout).
- **Wishlist**: synced to Supabase for logged-in users (falls back to
  localStorage for guests browsing without an account).
- **Admin dashboard** (`admin.html`): add/edit/delete products, adjust
  stock, and update order payment/delivery status. Restricted to
  `profiles.role = 'admin'`.

## What's still not in this build

- **Guest checkout** — checkout now requires an account, which is what
  makes order history and stock control trustworthy. If you want a guest
  path too, that's a follow-up (it needs a different way to look up an
  order later, e.g. by reference + email).
- **Order/payment email or SMS notifications** — not wired up yet. The
  cleanest next step is another small Edge Function that fires off an
  email (e.g. via Resend) whenever `place_order` succeeds or
  `verify-payment` confirms a payment. SMS would similarly need a provider
  like Twilio and has a per-message cost.
- **Product image uploads** — `admin.html` takes an image path/URL, not a
  file upload. Supabase Storage can add real uploads later; for now, keep
  uploading images to the `images/` folder in the deployed site (or host
  them anywhere public) and paste the URL.
