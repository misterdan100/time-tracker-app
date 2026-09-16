import { supabase } from './supabase';
import type {
  AdminListResponse,
  AdminOkResponse,
  AdminRequest,
  AdminUserResponse,
} from '../../api/_contract';

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** POST an action to the admin function with the current session's access token. */
async function call<T>(body: AdminRequest): Promise<T> {
  // getSession() refreshes an expired access token before handing it over.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AdminApiError('Your session has expired. Sign in again.', 401);

  let response: Response;
  try {
    response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AdminApiError('Could not reach the server. Check your connection.', 0);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed (${response.status}).`;
    throw new AdminApiError(message, response.status);
  }
  return payload as T;
}

export const adminApi = {
  list: () => call<AdminListResponse>({ action: 'list' }),
  create: (email: string, password: string, displayName: string) =>
    call<AdminUserResponse>({ action: 'create', email, password, displayName }),
  rename: (userId: string, displayName: string) =>
    call<AdminUserResponse>({ action: 'rename', userId, displayName }),
  setPassword: (userId: string, password: string) =>
    call<AdminOkResponse>({ action: 'setPassword', userId, password }),
  setRate: (userId: string, hourlyRate: number, currency: string) =>
    call<AdminUserResponse>({ action: 'setRate', userId, hourlyRate, currency }),
  setActive: (userId: string, active: boolean) =>
    call<AdminUserResponse>({ action: 'setActive', userId, active }),
  remove: (userId: string, confirmEmail: string) =>
    call<AdminOkResponse>({ action: 'delete', userId, confirmEmail }),
};

export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Something went wrong.';
