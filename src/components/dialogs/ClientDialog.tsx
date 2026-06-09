import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Client, Country } from '../../types';
import { defaultCurrencyForCountry } from '../../lib/invoiceUtils';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (client: Omit<Client, 'id'>) => void;
  editClient?: Client | null;
}

const CURRENCIES = ['COP', 'USD', 'EUR'];

const ClientDialog: React.FC<ClientDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  editClient,
}) => {
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    country: 'Colombia' as Country,
    email: '',
    defaultRate: '',
    currency: defaultCurrencyForCountry('Colombia'),
  });

  useEffect(() => {
    if (editClient) {
      setFormData({
        companyName: editClient.companyName,
        ownerName: editClient.ownerName,
        country: editClient.country,
        email: editClient.email,
        defaultRate: editClient.defaultRate ? String(editClient.defaultRate) : '',
        currency: editClient.currency || defaultCurrencyForCountry(editClient.country),
      });
    } else {
      setFormData({
        companyName: '',
        ownerName: '',
        country: 'Colombia',
        email: '',
        defaultRate: '',
        currency: defaultCurrencyForCountry('Colombia'),
      });
    }
  }, [editClient, open]);

  const handleCountryChange = (value: Country) => {
    // Auto-suggest the currency for the chosen country (user can still override).
    setFormData((prev) => ({
      ...prev,
      country: value,
      currency: defaultCurrencyForCountry(value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.companyName && formData.ownerName && formData.email) {
      onSave({
        companyName: formData.companyName,
        ownerName: formData.ownerName,
        country: formData.country,
        email: formData.email,
        defaultRate: parseFloat(formData.defaultRate) || 0,
        currency: formData.currency,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editClient ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ownerName">Owner Name</Label>
              <Input
                id="ownerName"
                value={formData.ownerName}
                onChange={(e) =>
                  setFormData({ ...formData, ownerName: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Select value={formData.country} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Colombia">Colombia</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="defaultRate">Default rate / hour</Label>
                <Input
                  id="defaultRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.defaultRate}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultRate: e.target.value })
                  }
                  placeholder="Eg: 50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Used to pre-fill invoices for this client. You can override the rate per invoice.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDialog;
