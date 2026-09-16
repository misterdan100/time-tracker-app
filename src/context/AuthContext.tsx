import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Membership } from '../../api/_contract';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  userId: string | null;
  userEmail: string | null;
  /** The signed-in user's row in team_members (null = account not enabled). */
  membership: Membership | null;
  membershipLoading: boolean;
  membershipError: string | null;
  /** Active admin (team lead). */
  isAdmin: boolean;
  /** Active member (works for the lead). */
  isMember: boolean;
  reloadMembership: () => void;
  /** `code` is Supabase's error code, e.g. "user_banned" for a deactivated account. */
  login: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; code?: string }>;
  logout: () => Promise<void>;
  /** Sends the "reset your password" email with a link back to /reset-password. */
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  /** Sets a new password for the current session (recovery link or logged-in user). */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Where recovery links must land: always the deployed app, even when the reset
 * is requested from a dev server, so the emailed link works from any device.
 * Override with VITE_SITE_URL (e.g. http://localhost:5173 to test locally).
 */
const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://time-tracker-app-sandy.vercel.app'
).replace(/\/$/, '');

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  // Which user the membership/error above belongs to. Anything else = still loading,
  // so a fresh sign-in never flashes the "account not enabled" screen.
  const [membershipFor, setMembershipFor] = useState<string | null>(null);
  const [membershipVersion, setMembershipVersion] = useState(0);

  const uid = session?.user.id ?? null;

  useEffect(() => {
    // Restore any existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Keep session in sync (login/logout/refresh, including other tabs).
    // Don't await Supabase calls in here (supabase-js can deadlock); membership loads below.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Load the team role whenever the signed-in user changes.
  useEffect(() => {
    if (!uid) {
      setMembership(null);
      setMembershipError(null);
      setMembershipFor(null);
      return;
    }
    let cancelled = false;
    setMembershipFor(null);
    supabase
      .from('team_members')
      .select('role, active, lead_id, display_name')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error loading team membership:', error.message);
          setMembership(null);
          setMembershipError(error.message);
        } else {
          setMembershipError(null);
          setMembership(
            data
              ? {
                  role: data.role,
                  active: data.active,
                  leadId: data.lead_id ?? null,
                  displayName: data.display_name ?? '',
                }
              : null
          );
        }
        setMembershipFor(uid);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, membershipVersion]);

  const reloadMembership = useCallback(() => setMembershipVersion((v) => v + 1), []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ error: string | null; code?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message, code: error.code };
    }
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const updatePassword = async (password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const membershipLoaded = !!uid && membershipFor === uid;
  const current = membershipLoaded ? membership : null;
  const active = !!current?.active;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!session,
        loading,
        userId: uid,
        userEmail: session?.user.email ?? null,
        membership: current,
        membershipLoading: !!uid && !membershipLoaded,
        membershipError: membershipLoaded ? membershipError : null,
        isAdmin: active && current?.role === 'admin',
        isMember: active && current?.role === 'member',
        reloadMembership,
        login,
        logout,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
