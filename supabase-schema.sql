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
-- clients_insert_own is defined in the TEAM section (admin-only inserts).
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
-- projects_insert_own is defined in the TEAM section (admin-only inserts).
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
-- time_entries_insert_own / _update_own are defined in the PROJECT ASSIGNMENT section
-- (hours only on projects you own or are assigned to).
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

-- ============================================================
-- PROFILES (issuer/studio details per user — added later)
-- ============================================================

-- One row per user (user_id is the PK). Holds the data printed as the
-- "From"/payment block on invoices. Fields default to '' so a profile can
-- exist partially filled; the app gates invoice creation on completeness.

create table if not exists public.profiles (
  user_id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  studio_name       text not null default '',
  tagline           text not null default '',
  professional_name text not null default '',
  address           text not null default '',
  city              text not null default '',
  country           text not null default 'Colombia',
  email             text not null default '',
  bank_account      text not null default '',
  bank_name         text not null default '',
  id_type           text not null default 'C.C.',  -- C.C. | NIT | ID
  id_number         text not null default '',
  phone             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- ============================================================
-- PROJECT WORK-TYPE TAGS (added later — safe to re-run)
-- ============================================================
-- A project can have several work types at once (e.g. Blueprints + 3D Modeling).
-- `work_types` (text[]) is the source of truth from now on. The legacy `work_type`
-- column is kept and still written (first tag) so nothing that reads it breaks;
-- existing rows are backfilled from it exactly once.

alter table public.projects
  add column if not exists work_types text[] not null default '{}';

update public.projects
   set work_types = array[work_type]
 where work_types = '{}'
   and work_type is not null
   and work_type <> '';

-- ============================================================
-- TEAM — roles and lead -> member accounts (added later — safe to re-run)
-- ============================================================
-- One admin (the lead) creates member accounts from the in-app Team panel.
-- Only the service role (api/admin.ts) writes team_members, so nobody can
-- promote themselves. The lead gets READ access to members' data ("View as").
-- The first admin row is inserted once by hand (kept out of this public file).

create table if not exists public.team_members (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('admin', 'member')),
  lead_id      uuid references auth.users (id) on delete set null,
  display_name text not null default '',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint team_members_not_own_lead check (lead_id is null or lead_id <> user_id)
);

create index if not exists team_members_lead_id_idx on public.team_members (lead_id);

alter table public.team_members enable row level security;
-- No write policies exist; also drop the default write grants (defense in depth).
revoke insert, update, delete, truncate on public.team_members from anon, authenticated;

drop policy if exists "team_members_select_self_or_led" on public.team_members;
create policy "team_members_select_self_or_led" on public.team_members
  for select to authenticated
  using (user_id = (select auth.uid()) or lead_id = (select auth.uid()));

-- ---------- helpers (SECURITY DEFINER: read team_members without RLS, no recursion) ----------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where user_id = (select auth.uid()) and role = 'admin' and active
  );
$$;

create or replace function public.is_lead_of(target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where user_id = target and lead_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin()       from public, anon;
revoke all on function public.is_lead_of(uuid) from public, anon;
grant execute on function public.is_admin()       to authenticated, service_role;
grant execute on function public.is_lead_of(uuid) to authenticated, service_role;

-- ---------- the lead can READ led users' data (OR'ed with the *_select_own policies) ----------

drop policy if exists "clients_select_led" on public.clients;
create policy "clients_select_led" on public.clients
  for select to authenticated using (public.is_lead_of(user_id));

drop policy if exists "projects_select_led" on public.projects;
create policy "projects_select_led" on public.projects
  for select to authenticated using (public.is_lead_of(user_id));

drop policy if exists "time_entries_select_led" on public.time_entries;
create policy "time_entries_select_led" on public.time_entries
  for select to authenticated using (public.is_lead_of(user_id));

drop policy if exists "invoices_select_led" on public.invoices;
create policy "invoices_select_led" on public.invoices
  for select to authenticated using (public.is_lead_of(user_id));

drop policy if exists "profiles_select_led" on public.profiles;
create policy "profiles_select_led" on public.profiles
  for select to authenticated using (public.is_lead_of(user_id));

-- ---------- only the admin creates clients and projects ----------

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients
  for insert with check (auth.uid() = user_id and public.is_admin());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id and public.is_admin());

-- ============================================================
-- PROJECT ASSIGNMENT — the lead assigns projects to members (added later — safe to re-run)
-- ============================================================
-- Members log hours only on projects assigned to them. If a member is unassigned they keep
-- READ access to that project (and their hours on it) but can't log or edit hours there.
-- Requires the TEAM section above.

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_id_idx on public.project_members (user_id);

alter table public.project_members enable row level security;
revoke update, truncate on public.project_members from anon, authenticated;

-- ---------- helpers (SECURITY DEFINER: no RLS recursion between projects/assignments/hours) ----------

create or replace function public.owns_project(p uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.projects
    where id = p and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_assigned(p uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members pm
    join public.team_members tm on tm.user_id = pm.user_id
    where pm.project_id = p and pm.user_id = (select auth.uid()) and tm.active
  );
$$;

create or replace function public.has_entries_on(p uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.time_entries
    where project_id = p and user_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_project(uuid)   from public, anon;
revoke all on function public.is_assigned(uuid)    from public, anon;
revoke all on function public.has_entries_on(uuid) from public, anon;
grant execute on function public.owns_project(uuid)   to authenticated, service_role;
grant execute on function public.is_assigned(uuid)    to authenticated, service_role;
grant execute on function public.has_entries_on(uuid) to authenticated, service_role;

-- ---------- project_members: the project owner (admin) manages assignments of their own members ----------

drop policy if exists "project_members_select" on public.project_members;
create policy "project_members_select" on public.project_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.owns_project(project_id));

drop policy if exists "project_members_insert" on public.project_members;
create policy "project_members_insert" on public.project_members
  for insert to authenticated
  with check (public.is_admin() and public.owns_project(project_id) and public.is_lead_of(user_id));

drop policy if exists "project_members_delete" on public.project_members;
create policy "project_members_delete" on public.project_members
  for delete to authenticated
  using (public.owns_project(project_id));

-- ---------- members read assigned projects (and ones they already logged hours on) ----------

drop policy if exists "projects_select_assigned" on public.projects;
create policy "projects_select_assigned" on public.projects
  for select to authenticated
  using (public.is_assigned(id) or public.has_entries_on(id));

-- ---------- hours only on projects you own or are assigned to ----------

drop policy if exists "time_entries_insert_own" on public.time_entries;
create policy "time_entries_insert_own" on public.time_entries
  for insert with check (
    auth.uid() = user_id and (public.owns_project(project_id) or public.is_assigned(project_id))
  );

drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own" on public.time_entries
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and (public.owns_project(project_id) or public.is_assigned(project_id))
  );
