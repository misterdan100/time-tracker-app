import React, { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Callout } from '../ui/callout';
import TempPasswordField from './TempPasswordField';
import { adminApi, errorMessage } from '../../lib/adminApi';
import { copyToClipboard, generatePassword } from '../../lib/password';
import { DISPLAY_NAME_MAX_LENGTH } from '../../../api/_contract';
import type { AdminUser } from '../../../api/_contract';

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (user: AdminUser) => void;
}

/**
 * Creates a member account with a temporary password, then shows the credentials
 * once so the admin can share them. The password is not stored anywhere.
 */
const MemberDialog: React.FC<MemberDialogProps> = ({ open, onOpenChange, onCreated }) => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (open) {
      setEmail('');
      setDisplayName('');
      setPassword(generatePassword());
      setError('');
      setSaving(false);
      setCreated(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { user } = await adminApi.create(email, password, displayName);
      onCreated(user);
      setCreated({ email: user.email, password });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const credentials = created ? `Email: ${created.email}\nTemporary password: ${created.password}` : '';

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[440px]">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Account created</DialogTitle>
              <DialogDescription>
                Share these credentials with {displayName || 'your team member'}. The password is
                shown only now; they can change it from their Profile page.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 rounded-card border border-border bg-muted/40 p-4 font-mono text-sm">
              <div className="break-all">
                <span className="text-muted-foreground">Email: </span>
                {created.email}
              </div>
              <div className="break-all">
                <span className="text-muted-foreground">Password: </span>
                {created.password}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(credentials, 'Credentials copied')}
              >
                <Copy className="h-4 w-4" />
                Copy credentials
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
              <DialogDescription>
                Creates a login for someone who works for you. They will only see what you share
                with them.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="memberName">Name</Label>
                <Input
                  id="memberName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  placeholder="Eg: Laura Gomez"
                  disabled={saving}
                  autoFocus
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="memberEmail">Email</Label>
                <Input
                  id="memberEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="off"
                  disabled={saving}
                  required
                />
              </div>
              <TempPasswordField
                id="memberPassword"
                label="Temporary password"
                value={password}
                onChange={setPassword}
                disabled={saving}
              />
              {error && <Callout tone="warning">{error}</Callout>}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating…' : 'Create account'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MemberDialog;
