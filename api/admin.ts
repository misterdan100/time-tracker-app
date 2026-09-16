// Team account administration (Vercel Function, Node runtime).
//
// Every request must carry the caller's Supabase access token and the caller must be
// an active admin in public.team_members. Actions only ever touch *member* accounts led
// by the caller, so the admin's own account (and any other admin) can never be
// deactivated, re-passworded or deleted from here.
//
// Needs SUPABASE_SERVICE_ROLE_KEY (never VITE_-prefixed) and SUPABASE_URL or
// VITE_SUPABASE_URL. Never log request bodies: they contain passwords.

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  BILLED_MEMBER_MESSAGE,
  DISPLAY_NAME_MAX_LENGTH,
  HOURLY_RATE_MAX,
  INVOICE_CURRENCIES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type AdminRequest,
  type AdminUser,
  type Membership,
  type TeamRole,
} from './_contract.js';

/** ~100 years: Supabase has no permanent ban, so deactivation is a very long one. */
const BAN_FOREVER = '876000h';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

interface MemberRow {
  user_id: string;
  role: TeamRole;
  active: boolean;
  lead_id: string | null;
  display_name: string;
  hourly_rate: number | string | null;
  currency: string | null;
}

const MEMBER_COLUMNS = 'user_id, role, active, lead_id, display_name, hourly_rate, currency';

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const toMembership = (row: MemberRow | null | undefined): Membership | null =>
  row
    ? {
        role: row.role,
        active: row.active,
        leadId: row.lead_id,
        displayName: row.display_name,
        hourlyRate: Number(row.hourly_rate ?? 0),
        currency: row.currency ?? 'COP',
      }
    : null;

const toAdminUser = (user: User, row: MemberRow | null | undefined, callerId: string): AdminUser => ({
  id: user.id,
  email: user.email ?? '',
  createdAt: user.created_at,
  lastSignInAt: user.last_sign_in_at ?? null,
  membership: toMembership(row),
  isSelf: user.id === callerId,
});

function adminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new HttpError(500, 'Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// ---------- validation ----------

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new HttpError(400, `"${field}" is required.`);
  return value;
}

function validEmail(value: unknown): string {
  const email = requireString(value, 'email').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  return email;
}

function validPassword(value: unknown): string {
  const password = requireString(value, 'password');
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new HttpError(
      400,
      `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`
    );
  }
  return password;
}

function validDisplayName(value: unknown): string {
  const name = requireString(value, 'displayName').trim();
  if (name.length < 1 || name.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new HttpError(400, `Name must be 1-${DISPLAY_NAME_MAX_LENGTH} characters.`);
  }
  return name;
}

// ---------- auth ----------

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'Missing access token.');
  return token;
}

async function requireAdmin(token: string, admin: SupabaseClient): Promise<User> {
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Invalid or expired session.');

  const { data: row, error: rowError } = await admin
    .from('team_members')
    .select('role, active')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (rowError) throw new HttpError(500, 'Could not verify your role.');
  if (!row || row.role !== 'admin' || !row.active) {
    throw new HttpError(403, 'Only the team admin can manage accounts.');
  }
  return data.user;
}

/** Resolve a member account led by the caller; anything else is refused. */
async function loadMember(
  admin: SupabaseClient,
  callerId: string,
  userId: unknown
): Promise<{ user: User; row: MemberRow }> {
  const id = requireString(userId, 'userId');
  if (!UUID_RE.test(id)) throw new HttpError(400, 'Invalid user id.');
  if (id === callerId) throw new HttpError(403, 'You cannot change your own account here.');

  const { data: rowData, error: rowError } = await admin
    .from('team_members')
    .select(MEMBER_COLUMNS)
    .eq('user_id', id)
    .maybeSingle();
  if (rowError) throw new HttpError(500, 'Could not load the account.');
  const row = rowData as MemberRow | null;
  if (!row || row.role !== 'member' || row.lead_id !== callerId) {
    throw new HttpError(403, 'That account is not a member of your team.');
  }

  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data.user) throw new HttpError(404, 'Account not found.');
  return { user: data.user, row };
}

// ---------- actions ----------

async function listUsers(admin: SupabaseClient, caller: User) {
  const [{ data: authData, error: authError }, { data: rows, error: rowsError }] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin
        .from('team_members')
        .select(MEMBER_COLUMNS)
        .or(`user_id.eq.${caller.id},lead_id.eq.${caller.id}`),
    ]);
  if (authError) throw new HttpError(500, 'Could not list accounts.');
  if (rowsError) throw new HttpError(500, 'Could not load team members.');

  const byId = new Map(((rows ?? []) as MemberRow[]).map((r) => [r.user_id, r]));
  const users = authData.users
    .filter((u) => byId.has(u.id))
    .map((u) => toAdminUser(u, byId.get(u.id), caller.id));
  return json({ users });
}

async function createMember(admin: SupabaseClient, caller: User, body: Record<string, unknown>) {
  const email = validEmail(body.email);
  const password = validPassword(body.password);
  const displayName = validDisplayName(body.displayName);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) {
    const exists = error?.code === 'email_exists' || /already.*registered/i.test(error?.message ?? '');
    if (exists) throw new HttpError(409, 'An account with that email already exists.');
    throw new HttpError(500, error?.message || 'Could not create the account.');
  }

  const row: MemberRow = {
    user_id: data.user.id,
    role: 'member',
    active: true,
    lead_id: caller.id,
    display_name: displayName,
    hourly_rate: 0,
    currency: 'COP',
  };
  // Rate columns take their database defaults.
  const { hourly_rate: _rate, currency: _currency, ...insertRow } = row;
  const { error: insertError } = await admin.from('team_members').insert(insertRow);
  if (insertError) {
    // Don't leave an auth user without a team row behind.
    await admin.auth.admin.deleteUser(data.user.id);
    throw new HttpError(500, 'Could not add the account to your team.');
  }
  return json({ user: toAdminUser(data.user, row, caller.id) }, 201);
}

async function renameMember(admin: SupabaseClient, caller: User, body: Record<string, unknown>) {
  const { user, row } = await loadMember(admin, caller.id, body.userId);
  const displayName = validDisplayName(body.displayName);
  const { error } = await admin
    .from('team_members')
    .update({ display_name: displayName })
    .eq('user_id', user.id);
  if (error) throw new HttpError(500, 'Could not rename the account.');
  return json({ user: toAdminUser(user, { ...row, display_name: displayName }, caller.id) });
}

async function setMemberPassword(
  admin: SupabaseClient,
  caller: User,
  body: Record<string, unknown>
) {
  const { user } = await loadMember(admin, caller.id, body.userId);
  const password = validPassword(body.password);
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) throw new HttpError(500, error.message || 'Could not set the password.');
  return json({ ok: true });
}

async function setMemberActive(
  admin: SupabaseClient,
  caller: User,
  body: Record<string, unknown>
) {
  const { user, row } = await loadMember(admin, caller.id, body.userId);
  if (typeof body.active !== 'boolean') throw new HttpError(400, '"active" must be true or false.');
  const active = body.active;

  // Both steps are idempotent, so retrying after a partial failure is safe.
  const { error: banError } = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: active ? 'none' : BAN_FOREVER,
  });
  if (banError) throw new HttpError(500, banError.message || 'Could not update the account.');
  const { error } = await admin.from('team_members').update({ active }).eq('user_id', user.id);
  if (error) throw new HttpError(500, 'Could not update the account status.');
  return json({ user: toAdminUser(user, { ...row, active }, caller.id) });
}

async function setMemberRate(admin: SupabaseClient, caller: User, body: Record<string, unknown>) {
  const { user, row } = await loadMember(admin, caller.id, body.userId);
  const hourlyRate = body.hourlyRate;
  if (typeof hourlyRate !== 'number' || !Number.isFinite(hourlyRate) || hourlyRate < 0 || hourlyRate > HOURLY_RATE_MAX) {
    throw new HttpError(400, 'Enter a valid hourly rate.');
  }
  const currency = requireString(body.currency, 'currency');
  if (!(INVOICE_CURRENCIES as readonly string[]).includes(currency)) {
    throw new HttpError(400, 'Unsupported currency.');
  }
  const { error } = await admin
    .from('team_members')
    .update({ hourly_rate: hourlyRate, currency })
    .eq('user_id', user.id);
  if (error) throw new HttpError(500, 'Could not save the rate.');
  return json({ user: toAdminUser(user, { ...row, hourly_rate: hourlyRate, currency }, caller.id) });
}

async function deleteMember(admin: SupabaseClient, caller: User, body: Record<string, unknown>) {
  const { user } = await loadMember(admin, caller.id, body.userId);
  const confirmEmail = requireString(body.confirmEmail, 'confirmEmail').trim().toLowerCase();
  if (!user.email || confirmEmail !== user.email.toLowerCase()) {
    throw new HttpError(400, 'Type the account email exactly to confirm.');
  }
  // Deleting cascades their hours, including ones already billed to the lead or to a client,
  // so accounts with billing history can only be deactivated.
  const [billedHours, sentInvoices] = await Promise.all([
    admin
      .from('time_entries')
      .select('id')
      .eq('user_id', user.id)
      .or('invoice_id.not.is.null,lead_invoice_id.not.is.null')
      .limit(1),
    admin.from('invoices').select('id').eq('user_id', user.id).neq('status', 'draft').limit(1),
  ]);
  if (billedHours.error || sentInvoices.error) {
    throw new HttpError(500, 'Could not check the account billing history.');
  }
  if ((billedHours.data ?? []).length > 0 || (sentInvoices.data ?? []).length > 0) {
    throw new HttpError(409, BILLED_MEMBER_MESSAGE);
  }
  // FKs cascade: this removes only this member's own rows (and their team_members row).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(500, error.message || 'Could not delete the account.');
  return json({ ok: true });
}

// ---------- entry point ----------

export async function POST(request: Request): Promise<Response> {
  try {
    const token = bearerToken(request);
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, 'Invalid JSON body.');
    }
    if (!body || typeof body !== 'object') throw new HttpError(400, 'Invalid request.');

    const admin = adminClient();
    const caller = await requireAdmin(token, admin);

    switch (body.action as AdminRequest['action']) {
      case 'list':
        return await listUsers(admin, caller);
      case 'create':
        return await createMember(admin, caller, body);
      case 'rename':
        return await renameMember(admin, caller, body);
      case 'setPassword':
        return await setMemberPassword(admin, caller, body);
      case 'setRate':
        return await setMemberRate(admin, caller, body);
      case 'setActive':
        return await setMemberActive(admin, caller, body);
      case 'delete':
        return await deleteMember(admin, caller, body);
      default:
        throw new HttpError(400, 'Unknown action.');
    }
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error('api/admin unexpected error:', err instanceof Error ? err.message : err);
    return json({ error: 'Unexpected server error.' }, 500);
  }
}
