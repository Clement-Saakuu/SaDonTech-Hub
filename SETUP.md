# SaDonTech Hub — Supabase Setup (Phase 1: Auth)

This gets real signup/login/password-reset/email-verification working. It
takes about 10 minutes and costs nothing on Supabase's free tier.

## 1. Create the project

1. Go to https://supabase.com → sign up / log in → **New project**.
2. Pick a name, a database password (save it somewhere), and a region close
   to your customers (e.g. an EU or nearest available region for Ghana).
3. Wait ~2 minutes for it to finish provisioning.

## 2. Run the database schema

1. In your project, open **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` (in this folder) and
   click **Run**.
3. You should see "Success. No rows returned." This creates all the tables
   (profiles, addresses, products, orders, order_items, wishlist_items,
   reviews) with security rules already applied.

## 3. Get your API credentials

1. Go to **Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
3. Open `supabase-config.js` in this project and paste them in:
   ```js
   const SUPABASE_CONFIG = {
     url: "https://xxxxxxxx.supabase.co",
     anonKey: "eyJhbGciOi...",
   };
   ```
   These are safe to expose publicly — access is controlled by the Row Level
   Security policies in the schema, not by hiding this key.

## 4. Configure auth email + redirect URLs

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to wherever you'll host the site (e.g.
   `https://yourdomain.com` or, while testing locally,
   `http://localhost:PORT`).
3. Under **Redirect URLs**, add:
   - `http://localhost:PORT/*` (whatever you use for local testing)
   - `https://yourdomain.com/*` (once you have a real domain)
4. (Optional, recommended) Go to **Authentication → Emails** and customize
   the "Confirm signup" and "Reset password" templates with your branding.
   The defaults work fine to start.

## 5. Make yourself an admin

Product/order management (coming in the next phase) is gated by
`profiles.role = 'admin'`. After you sign up once through the site:

1. Go to **Table Editor → profiles** in Supabase.
2. Find your row (matched by your user id) and change `role` from
   `customer` to `admin`.

## 6. Test it

1. Serve the site locally (any static server works, e.g. `npx serve .` or
   VS Code's "Live Server").
2. Click **Login** in the navbar → **Sign up** → create an account.
3. Check your email for the confirmation link, click it.
4. Log in. The navbar should now show your first name, and `account.html`
   should show your profile.
5. Try **Forgot your password?** to confirm the reset email arrives and
   `reset-password.html` lets you set a new one.

## What's included in this phase

- Real signup / login / logout (Supabase Auth — passwords are hashed and
  checked server-side, not in the browser)
- Email verification (Supabase's hosted confirmation email)
- Password reset via email
- A `profiles` table (auto-created per user) with a `role` column ready for
  the admin dashboard
- Full database schema for addresses, orders, order items, wishlist, and
  reviews — created now so nothing has to migrate later, but not yet wired
  into the UI

## What's next (phase 2)

- `account.html`: saved addresses, order history, wishlist synced to your
  account instead of just this browser
- `admin.html`: product CRUD, stock control, order + delivery status
  management (gated to `role = 'admin'`)
- A Supabase Edge Function (`supabase/functions/verify-payment`) that
  verifies the Paystack reference server-side with your **secret** key
  before marking an order "paid" — this is the part that makes payment
  confirmation trustworthy instead of spoofable
- Order confirmation emails triggered from that same function
