-- ============================================================
-- ROLLBACK TEAM — undo the TEAM section of supabase-schema.sql
-- Paste into Supabase Dashboard > SQL Editor > Run only if you need to revert.
--
-- Touches policies, the two helper functions and the team_members table only.
-- It does NOT modify or delete any row of clients, projects, time_entries,
-- invoices or profiles. Member ACCOUNTS (auth.users) are not deleted either:
-- remove those from the Team panel first if you want them gone.
-- ============================================================

-- Lead read access
drop policy if exists "clients_select_led"      on public.clients;
drop policy if exists "projects_select_led"     on public.projects;
drop policy if exists "time_entries_select_led" on public.time_entries;
drop policy if exists "invoices_select_led"     on public.invoices;
drop policy if exists "profiles_select_led"     on public.profiles;

-- Restore the original owner-only insert policies
drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients
  for insert with check (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);

-- Helpers and table
drop function if exists public.is_admin();
drop function if exists public.is_lead_of(uuid);
drop table if exists public.team_members;
