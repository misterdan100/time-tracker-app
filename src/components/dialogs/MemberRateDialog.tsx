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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Callout } from '../ui/callout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { adminApi, errorMessage } from '../../lib/adminApi';
import { HOURLY_RATE_MAX, INVOICE_CURRENCIES, type AdminUser } from '../../../api/_contract';

interface MemberRateDialogProps {
  /** The member whose rate is edited; null closes the dialog. */
  target: AdminUser | null;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
}

/** Sets what a team member charges the admin per hour; their invoices always use it. */
const MemberRateDialog: React.FC<MemberRateDialogProps> = ({ target, onClose, onSaved }) => {
  const [rate, setRate] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    const m = target.membership;
    setRate(m?.hourlyRate ? String(m.hourlyRate) : '');
    setCurrency(m?.currency || 'COP');
    setError('');
    setSaving(false);
  }, [target]);

  const name = target?.membership?.displayName || target?.email || '';
  const parsed = Number(rate);
  const valid = rate.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed <= HOURLY_RATE_MAX;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || !valid) return;
    setError('');
    setSaving(true);
    try {
      const { user } = await adminApi.setRate(target.id, parsed, currency);
      onSaved(user);
      toast.success(`Rate updated for ${name}`);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Hourly rate for {name}</DialogTitle>
          <DialogDescription>
            What {name} charges you per hour. Their invoices to you always use this rate; changing it
            applies to invoices they send from now on.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="memberRate">Rate / hour</Label>
              <Input
                id="memberRate"
                type="number"
                step="0.01"
                min="0"
                max={HOURLY_RATE_MAX}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="Eg: 25000"
                disabled={saving}
                autoFocus
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="memberCurrency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency} disabled={saving}>
                <SelectTrigger id="memberCurrency">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <Callout tone="warning">{error}</Callout>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !valid}>
              {saving ? 'Saving…' : 'Save rate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MemberRateDialog;
