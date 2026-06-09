-- ============================================================
-- Time Tracker — Supabase schema
-- Paste this whole file into Supabase Dashboard > SQL Editor > Run
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- ============================================================

-- Each row is owned by the authenticated user (user_id = auth.uid()).
-- Row Level Security (RLS) ensures users only see/modify their own data.

-- ---------- TABLES ----------

create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_name text not null,
  owner_name   text not null default '',
  country      text not null default 'US',
  email        text not null default '',
  created_at   timestamptz not null default now()
);

create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id  uuid not null references public.clients (id) on delete cascade,
  name       text not null,
  address    text not null default '',
  city       text not null default '',
  work_type  text not null default 'Other',
  status     text not null default 'Active',
  color      text not null default '#3b82f6',
  created_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  date       text not null,
  hours      numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- INDEXES ----------

create index if not exists clients_user_id_idx       on public.clients (user_id);
create index if not exists projects_user_id_idx      on public.projects (user_id);
create index if not exists projects_client_id_idx    on public.projects (client_id);
create index if not exists time_entries_user_id_idx  on public.time_entries (user_id);
create index if not exists time_entries_project_idx  on public.time_entries (project_id);

-- ---------- ROW LEVEL SECURITY ----------

alter table public.clients      enable row level security;
alter table public.projects     enable row level security;
alter table public.time_entries enable row level security;

-- clients
drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients
  for select using (auth.uid() = user_id);
drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients
  for insert with check (auth.uid() = user_id);
drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own" on public.clients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own" on public.clients
  for delete using (auth.uid() = user_id);

-- projects
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- time_entries
drop policy if exists "time_entries_select_own" on public.time_entries;
create policy "time_entries_select_own" on public.time_entries
  for select using (auth.uid() = user_id);
drop policy if exists "time_entries_insert_own" on public.time_entries;
create policy "time_entries_insert_own" on public.time_entries
  for insert with check (auth.uid() = user_id);
drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own" on public.time_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "time_entries_delete_own" on public.time_entries;
create policy "time_entries_delete_own" on public.time_entries
  for delete using (auth.uid() = user_id);

-- ============================================================
-- INVOICES (added later — safe to re-run)
-- ============================================================

-- An invoice = client + date range + selected projects + hourly rate.
-- line_items is an immutable snapshot used for the PDF/totals.
-- time_entries.invoice_id links billed hours (set on finalize) so we can
-- compute "uninvoiced hours" and prevent double-billing.

-- ---------- TABLE ----------

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id      uuid not null references public.clients (id) on delete cascade,
  invoice_number text not null,
  title          text not null default '',
  period_start   text not null,
  period_end     text not null,
  hourly_rate    numeric not null default 0,
  currency       text not null default 'COP',
  status         text not null default 'draft',  -- draft | finalized | paid
  total_hours    numeric not null default 0,
  total_amount   numeric not null default 0,
  line_items     jsonb not null default '[]'::jsonb,  -- [{projectId, projectName, hours, amount}]
  notes          text not null default '',
  issued_at      text,  -- ISO timestamp set when finalized
  paid_at        text,  -- ISO timestamp set when marked paid
  created_at     timestamptz not null default now()
);

-- ---------- LINK time_entries -> invoices ----------

alter table public.time_entries
  add column if not exists invoice_id uuid references public.invoices (id) on delete set null;

-- ---------- CLIENT billing defaults ----------

alter table public.clients
  add column if not exists default_rate numeric not null default 0;
alter table public.clients
  add column if not exists currency text not null default 'COP';

-- Make COP the default currency going forward (idempotent; existing rows keep their value).
alter table public.clients  alter column currency set default 'COP';
alter table public.invoices alter column currency set default 'COP';

-- ---------- INDEXES ----------

create index if not exists invoices_user_id_idx     on public.invoices (user_id);
create index if not exists invoices_client_id_idx   on public.invoices (client_id);
create index if not exists time_entries_invoice_idx on public.time_entries (invoice_id);

-- ---------- ROW LEVEL SECURITY ----------

alter table public.invoices enable row level security;

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own" on public.invoices
  for select using (auth.uid() = user_id);
drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own" on public.invoices
  for insert with check (auth.uid() = user_id);
drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own" on public.invoices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_delete_own" on public.invoices
  for delete using (auth.uid() = user_id);
