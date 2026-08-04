import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { PasswordInput } from '../components/ui/password-input';
import AuthCard from '../components/auth/AuthCard';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Supabase reports a bad/expired recovery link with error params, in the hash
 * fragment or the query string depending on the flow. Read both.
 */
function readLinkError(): string | null {
  const params = new URLSearchParams(window.location.search);
  new URLSearchParams(window.location.hash.replace(/^#/, '')).forEach((value, key) => {
    params.set(key, value);
  });

  if (!params.get('error') && !params.get('error_code')) {
    return null;
  }
  if (params.get('error_code') === 'otp_expired') {
    return 'This reset link has expired. Request a new one below.';
  }
  return params.get('error_description') || 'This reset link is invalid or has already been used.';
}

const ResetPasswordPage: React.FC = () => {
  const { isAuthenticated, updatePassword } = useAuth();
  const navigate = useNavigate();
  // Captured once: the recovery session is already resolved by the time we render.
  const [linkError] = useState(readLinkError);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);

    if (updateError) {
      setError(updateError);
      return;
    }
    toast.success('Password updated');
    navigate('/', { replace: true });
  };

  // No valid recovery session — the link is missing, expired or already used.
  if (linkError || !isAuthenticated) {
    return (
      <AuthCard title="Arq Time" subtitle="Reset your password">
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{linkError ?? 'This reset link is invalid or has expired.'}</span>
          </div>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Arq Time" subtitle="Choose a new password for your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            autoComplete="new-password"
            autoFocus
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your new password"
            autoComplete="new-password"
            required
          />
        </div>
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </AuthCard>
  );
};

export default ResetPasswordPage;
