import React, { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { PasswordInput } from '../ui/password-input';
import { useAuth } from '../../context/AuthContext';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../api/_contract';

/** Lets any signed-in user (e.g. a member with a temporary password) set their own password. */
const ChangePasswordCard: React.FC = () => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      setError(`Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true);
    const { error: updateError } = await updatePassword(password);
    setSaving(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    setPassword('');
    setConfirm('');
    toast.success('Password updated');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          Change password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <PasswordInput
              id="newPassword"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <PasswordInput
              id="confirmNewPassword"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your new password"
              autoComplete="new-password"
              required
            />
          </div>
          {error && (
            <div className="rounded-control bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">
              {error}
            </div>
          )}
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" variant="outline" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
