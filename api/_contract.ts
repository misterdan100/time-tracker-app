// Request/response types shared by api/admin.ts and src/lib/adminApi.ts.
// Types only: `src/` imports this with `import type`, so no server code reaches the bundle.
// The leading underscore keeps Vercel from deploying this file as a function.

export type TeamRole = 'admin' | 'member';

/** A row of public.team_members, camelCased. */
export interface Membership {
  role: TeamRole;
  active: boolean;
  leadId: string | null;
  displayName: string;
  /** What the member charges their lead per hour (set by the lead). */
  hourlyRate: number;
  currency: string;
}

export interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  membership: Membership | null;
  /** True for the admin making the request. */
  isSelf: boolean;
}

export type AdminRequest =
  | { action: 'list' }
  | { action: 'create'; email: string; password: string; displayName: string }
  | { action: 'rename'; userId: string; displayName: string }
  | { action: 'setPassword'; userId: string; password: string }
  | { action: 'setActive'; userId: string; active: boolean }
  | { action: 'setRate'; userId: string; hourlyRate: number; currency: string }
  | { action: 'delete'; userId: string; confirmEmail: string };

export interface AdminListResponse {
  users: AdminUser[];
}

export interface AdminUserResponse {
  user: AdminUser;
}

export interface AdminOkResponse {
  ok: true;
}

export interface AdminErrorBody {
  error: string;
}

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt ignores anything past 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72;
export const DISPLAY_NAME_MAX_LENGTH = 80;
/** Currencies an invoice (and a member rate) can use. */
export const INVOICE_CURRENCIES = ['COP', 'USD', 'EUR'] as const;
export const HOURLY_RATE_MAX = 100_000_000;
/** Why `delete` refuses (409) a member with billed hours or sent invoices. */
export const BILLED_MEMBER_MESSAGE =
  'This member has billed hours or invoices. Deactivate the account instead.';
