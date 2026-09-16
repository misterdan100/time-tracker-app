import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Callout } from '../ui/callout';
import TempPasswordField from './TempPasswordField';
import { adminApi, errorMessage } from '../../lib/adminApi';
import { generatePassword } from '../../lib/password';
import type { AdminUser } from '../../../api/_contract';

interface SetPasswordDialogProps {
  /** The member whose password is being reset; null closes the dialog. */
  target: AdminUser | null;
  onClose: () => void;
}

/** Replaces a member's password with a new temporary one chosen by the admin. */
const SetPasswordDialog: React.FC<SetPasswordDialogProps> = ({ target, onClose }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setPassword(generatePassword());
      setError('');
      setSaving(false);
    }
  }, [target]);

  const name = target?.membership?.displayName || target?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setError('');
    setSaving(true);
    try {
      await adminApi.setPassword(target.id, password);
      toast.success(`Password updated for ${name}`, {
        description: 'Copy it before closing if you have not already.',
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Set a new password</DialogTitle>
          <DialogDescription>
            {name} will need this password to sign in. Their current password stops working
            immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <TempPasswordField
            id="resetPassword"
            label="New password"
            value={password}
            onChange={setPassword}
            disabled={saving}
          />
          {error && <Callout tone="warning">{error}</Callout>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Set password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SetPasswordDialog;
