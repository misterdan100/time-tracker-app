-- ============================================================
-- ROLLBACK TEAM HOURS IN CLIENT INVOICES — undo that section of supabase-schema.sql
-- Paste into Supabase Dashboard > SQL Editor > Run only if you need to revert.
--
-- Touches policies and functions only; no business data changes.
-- IMPORTANT: the app version with team hours finalizes EVERY invoice through finalize_invoice.
-- After this rollback that version can no longer finalize invoices, so revert the app code too.
-- ============================================================

-- 1) Atomic finalize
drop function if exists public.finalize_invoice(uuid, jsonb, numeric, numeric, numeric, text, uuid[], uuid[]);

-- 2) Time entry policies back to the MEMBER INVOICES versions (only invoice_id locks hours)
drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own" on public.time_entries
  for update
  using (auth.uid() = user_id and (invoice_id is null or public.is_admin()))
  with check (
    auth.uid() = user_id
    and (
      public.owns_project(project_id)
      or public.is_assigned(project_id)
      or public.has_entries_on(project_id)
    )
  );
drop policy if exists "time_entries_delete_own" on public.time_entries;
create policy "time_entries_delete_own" on public.time_entries
  for delete using (auth.uid() = user_id and (invoice_id is null or public.is_admin()));

-- The columns time_entries.lead_invoice_id and invoices.include_team are left in place: they are
-- harmless for the previous app version. Team hours already linked to client invoices keep that
-- link but are no longer locked for members.
