-- ============================================================
-- SaDonTech Hub — Experts Portfolio Platform
-- Run once in the SQL Editor. Safe to re-run.
-- Requires full_setup.sql + fix_admin_rls_recursion.sql to already be
-- applied — this reuses public.is_admin().
-- ============================================================

-- ------------------------------------------------------------
-- EXPERT PROFILES
-- Deliberately NOT keyed 1:1 to auth.users — user_id is nullable so the
-- 4 founding profiles below can exist before those people have signed up.
-- Once someone signs up with a matching email, they can "claim" it
-- (see the claim policy further down).
-- ------------------------------------------------------------
create table if not exists public.expert_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  role_title text,
  highlight text,
  bio text,
  expertise text[] not null default '{}',
  photo_url text,
  whatsapp_link text,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'inactive')),
  monthly_fee numeric(10, 2) not null default 50,
  subscription_paid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expert_profiles enable row level security;

-- Public directory only ever shows active (paid-up) experts.
drop policy if exists "Public can view active experts" on public.expert_profiles;
create policy "Public can view active experts"
  on public.expert_profiles for select
  using (status = 'active');

-- An expert can always see/manage their own profile regardless of status
-- (so they can see "pending payment" and fix it).
drop policy if exists "Experts manage their own profile" on public.expert_profiles;
create policy "Experts manage their own profile"
  on public.expert_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Signed-in users can create their expert profile" on public.expert_profiles;
create policy "Signed-in users can create their expert profile"
  on public.expert_profiles for insert
  with check (user_id = auth.uid());

-- Lets a founding member (or anyone pre-seeded by an admin) take ownership
-- of an unclaimed profile once they sign up with the matching email.
-- Cannot be used to hijack someone else's profile: the row must have
-- user_id = null AND the email must match the caller's own verified email.
drop policy if exists "Users can claim their unclaimed profile" on public.expert_profiles;
create policy "Users can claim their unclaimed profile"
  on public.expert_profiles for update
  using (user_id is null and email = auth.email())
  with check (user_id = auth.uid() and email = auth.email());

drop policy if exists "Admins manage all expert profiles" on public.expert_profiles;
create policy "Admins manage all expert profiles"
  on public.expert_profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- EXPERT PROJECTS — links to live projects + template/resource links
-- ------------------------------------------------------------
create table if not exists public.expert_projects (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.expert_profiles(id) on delete cascade,
  title text not null,
  description text,
  project_url text,
  template_url text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.expert_projects enable row level security;

drop policy if exists "Public can view projects of active experts" on public.expert_projects;
create policy "Public can view projects of active experts"
  on public.expert_projects for select
  using (exists (select 1 from public.expert_profiles ep where ep.id = expert_id and ep.status = 'active'));

drop policy if exists "Experts manage their own projects" on public.expert_projects;
create policy "Experts manage their own projects"
  on public.expert_projects for all
  using (exists (select 1 from public.expert_profiles ep where ep.id = expert_id and ep.user_id = auth.uid()))
  with check (exists (select 1 from public.expert_profiles ep where ep.id = expert_id and ep.user_id = auth.uid()));

drop policy if exists "Admins manage all expert projects" on public.expert_projects;
create policy "Admins manage all expert projects"
  on public.expert_projects for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- EXPERT DOCUMENTS — CV/resume metadata. The actual files live in the
-- "expert-documents" Storage bucket (private); this table just tracks
-- which file belongs to whom so the app can request a short-lived signed
-- URL for viewing. See the Storage policies below.
-- ------------------------------------------------------------
create table if not exists public.expert_documents (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.expert_profiles(id) on delete cascade,
  doc_type text not null check (doc_type in ('cv', 'resume')),
  file_path text not null,
  original_filename text,
  uploaded_at timestamptz not null default now()
);

alter table public.expert_documents enable row level security;

drop policy if exists "Experts manage their own documents" on public.expert_documents;
create policy "Experts manage their own documents"
  on public.expert_documents for all
  using (exists (select 1 from public.expert_profiles ep where ep.id = expert_id and ep.user_id = auth.uid()))
  with check (exists (select 1 from public.expert_profiles ep where ep.id = expert_id and ep.user_id = auth.uid()));

drop policy if exists "Public can view documents of active experts" on public.expert_documents;
create policy "Public can view documents of active experts"
  on public.expert_documents for select
  using (exists (select 1 from public.expert_profiles ep where ep.id = expert_id and ep.status = 'active'));

drop policy if exists "Admins manage all expert documents" on public.expert_documents;
create policy "Admins manage all expert documents"
  on public.expert_documents for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- STORAGE — run this AFTER creating a bucket named "expert-documents"
-- from the dashboard (Storage → New bucket → leave "Public" UNCHECKED).
-- Files are uploaded to paths like: {expert_id}/cv-{timestamp}.pdf
-- so these policies can tell whose file is whose from the path alone.
-- ------------------------------------------------------------
drop policy if exists "Experts manage their own storage files" on storage.objects;
create policy "Experts manage their own storage files"
  on storage.objects for all
  using (
    bucket_id = 'expert-documents'
    and exists (
      select 1 from public.expert_profiles ep
      where ep.id::text = (storage.foldername(name))[1]
      and ep.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'expert-documents'
    and exists (
      select 1 from public.expert_profiles ep
      where ep.id::text = (storage.foldername(name))[1]
      and ep.user_id = auth.uid()
    )
  );

drop policy if exists "Public can view active experts documents" on storage.objects;
create policy "Public can view active experts documents"
  on storage.objects for select
  using (
    bucket_id = 'expert-documents'
    and exists (
      select 1 from public.expert_profiles ep
      where ep.id::text = (storage.foldername(name))[1]
      and ep.status = 'active'
    )
  );

drop policy if exists "Admins view all expert documents in storage" on storage.objects;
create policy "Admins view all expert documents in storage"
  on storage.objects for select
  using (bucket_id = 'expert-documents' and public.is_admin());

-- ------------------------------------------------------------
-- SEED: the 4 founding team members, migrated from the old hardcoded
-- staff_team.html. NOT linked to a login yet (user_id is null) — when
-- each person signs up on the Expert Portal with the matching email
-- below, they'll see a "Claim this profile" option instead of starting
-- from scratch. Grandfathered in as active with no fee owed yet.
--
-- IMPORTANT: only Clement's real email was available from the original
-- files. Francis/Mary/John below use PLACEHOLDER emails — replace these
-- with their real emails before they try to claim their profiles, or the
-- claim won't match. Easiest way: Table Editor → expert_profiles → edit
-- the `email` column for each row.
-- ------------------------------------------------------------
insert into public.expert_profiles
  (email, full_name, role_title, highlight, bio, expertise, photo_url, whatsapp_link, status, monthly_fee, subscription_paid_until)
select * from (values
  ('saakuu.clement@gmail.com', 'Clement Saakuu', 'CEO - SaDonTech Hub',
   'Developer · Data Analyst · Research Assistant · IT Entrepreneur',
   'Clement leads the SaDonTech Hub vision with a strong focus on digital transformation, practical technology training, and building data-driven solutions for modern communities.',
   array['Web development', 'Data analysis', 'Research support', 'Product strategy'],
   'images/clementphoto.png', 'https://wa.me/233202173740', 'active', 0::numeric, (current_date + interval '100 years')::date),

  ('francis.saakuu@REPLACE-ME.com', 'Francis Saakuu', 'Senior Consultant - GIS Analyst',
   'Geographic Information Systems Analyst at GeoDaline Consult',
   'Francis brings deep expertise in geospatial analysis, mapping, and spatial decision-making that helps organizations turn location data into actionable insight.',
   array['GIS analysis', 'Spatial mapping', 'Remote sensing support', 'Research-based consulting'],
   'images/Francisphoto.PNG', 'https://wa.me/233202173740', 'active', 0::numeric, (current_date + interval '100 years')::date),

  ('mary@REPLACE-ME.com', 'Professor Mary', 'Senior Lecturer & Lead Developer',
   'Giants Technology Academy',
   'Professor Mary combines teaching and technology leadership to mentor learners while shaping modern, user-friendly digital experiences for clients and students alike.',
   array['Frontend development', 'UI/UX design', 'Technology mentoring', 'Digital training'],
   'images/maryphoto.PNG', 'https://wa.me/233202173740', 'active', 0::numeric, (current_date + interval '100 years')::date),

  ('john@REPLACE-ME.com', 'John Ankuma', 'Lead Designer',
   'SaDonTech Hub',
   'John blends visual design, storytelling, and video production to create polished digital assets that communicate ideas with clarity and impact.',
   array['Graphic design', 'Brand visuals', 'Videography', 'Creative direction'],
   'images/johnphoto.png', 'https://wa.me/233202173740', 'active', 0::numeric, (current_date + interval '100 years')::date)
) as seed(email, full_name, role_title, highlight, bio, expertise, photo_url, whatsapp_link, status, monthly_fee, subscription_paid_until)
where not exists (select 1 from public.expert_profiles ep where ep.email = seed.email);
