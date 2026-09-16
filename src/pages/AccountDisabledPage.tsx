import React from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import AuthCard from '../components/auth/AuthCard';
import { Callout } from '../components/ui/callout';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

/**
 * Shown to a signed-in user without an active team account (never enabled or
 * deactivated), or when their role could not be loaded.
 */
const AccountDisabledPage: React.FC = () => {
  const { userEmail, membership, membershipError, reloadMembership, logout } = useAuth();

  const message = membershipError
    ? 'We could not load your account. Check your connection and try again.'
    : membership && !membership.active
      ? 'Your account has been deactivated. Contact your administrator.'
      : 'Your account is not enabled yet. Contact your administrator.';

  return (
    <AuthCard title="Arq Time" subtitle={userEmail ?? 'Account access'}>
      <div className="space-y-4">
        <Callout tone="warning">{message}</Callout>
        {membershipError ? (
          <Button className="w-full" onClick={reloadMembership}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        ) : null}
        <Button variant="ghost" className="w-full" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </AuthCard>
  );
};

export default AccountDisabledPage;
