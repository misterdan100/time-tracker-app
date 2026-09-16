-- ============================================================
-- ROLLBACK MEMBER INVOICES — undo that section of supabase-schema.sql
-- Paste into Supabase Dashboard > SQL Editor > Run only if you need to revert.
--
-- Steps 1-4 touch policies and functions only; no business data changes.
-- Step 5 is optional and DESTRUCTIVE (it deletes members' invoices) — read it first.
-- ============================================================

-- 1) Lead actions and helpers
drop function if exists public.mark_team_invoice_paid(uuid);
drop function if exists public.return_team_invoice(uuid);
drop policy if exists "profiles_select_lead" on public.profiles;

-- 2) Invoice policies back to owner-only
drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own" on public.invoices
  for insert with check (auth.uid() = user_id);
drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own" on public.invoices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_delete_own" on public.invoices
  for delete using (auth.uid() = user_id);

-- 3) Time entry policies back to the PROJECT ASSIGNMENT versions
drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own" on public.time_entries
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and (public.owns_project(project_id) or public.is_assigned(project_id))
  );
drop policy if exists "time_entries_delete_own" on public.time_entries;
create policy "time_entries_delete_own" on public.time_entries
  for delete using (auth.uid() = user_id);

-- 4) Helpers no longer referenced
drop function if exists public.owns_client(uuid);
drop function if exists public.my_lead_id();

-- The columns team_members.hourly_rate/currency and invoices.bill_to_user_id are left in
-- place: they are harmless for the previous app version.

-- 5) OPTIONAL, DESTRUCTIVE — only to make invoices.client_id required again.
--    This deletes every invoice a member sent to their lead (their hours are released).
--    Uncomment deliberately:
-- delete from public.invoices where client_id is null;
-- alter table public.invoices drop constraint if exists invoices_one_recipient;
-- alter table public.invoices alter column client_id set not null;
