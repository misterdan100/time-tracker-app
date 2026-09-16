-- ============================================================
-- ROLLBACK PROJECT ASSIGNMENT — undo that section of supabase-schema.sql
-- Paste into Supabase Dashboard > SQL Editor > Run only if you need to revert.
--
-- Touches policies, three helper functions and the project_members table only.
-- It does NOT modify or delete any row of clients, projects, time_entries,
-- invoices or profiles (members' hours stay; they just lose access to the
-- assigned projects).
-- ============================================================

-- Restore the original owner-only time entry policies
drop policy if exists "time_entries_insert_own" on public.time_entries;
create policy "time_entries_insert_own" on public.time_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own" on public.time_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Member read access to assigned projects
drop policy if exists "projects_select_assigned" on public.projects;

-- Assignments table (its policies go with it)
drop table if exists public.project_members;

-- Helpers
drop function if exists public.has_entries_on(uuid);
drop function if exists public.is_assigned(uuid);
drop function if exists public.owns_project(uuid);
