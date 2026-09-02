import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { IdType, Profile as ProfileType } from '../types';
import { emptyProfile, isProfileComplete, missingProfileFields } from '../lib/profileUtils';
import { stripAccents } from '../lib/text';
import { UserCircle } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { Callout } from '../components/ui/callout';

const ID_TYPES: IdType[] = ['C.C.', 'NIT', 'ID'];

/** Stable text field (module scope so it doesn't remount on each keystroke). */
function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

const Profile: React.FC = () => {
  const { profile, saveProfile } = useApp();
  const { userEmail } = useAuth();
  const [form, setForm] = useState<ProfileType>(emptyProfile);
  const [saving, setSaving] = useState(false);

  // Sync form whenever the saved profile (or login email) changes.
  useEffect(() => {
    setForm({
      ...emptyProfile,
      ...(profile ?? {}),
      email: profile?.email || userEmail || '',
    });
  }, [profile, userEmail]);

  const update = (patch: Partial<ProfileType>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveProfile(form);
    setSaving(false);
  };

  const complete = isProfileComplete(profile);
  const missing = missingProfileFields(profile);

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Your studio details used on every invoice"
        leading={<UserCircle className="h-7 w-7 shrink-0 text-muted-foreground" />}
        actions={
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        }
      />

      {/* Completeness banner (reflects the SAVED profile, which gates invoicing) */}
      {complete ? (
        <Callout tone="success" className="font-medium">
          Profile complete — you can create invoices.
        </Callout>
      ) : (
        <Callout tone="warning">
          <span className="font-medium">Complete your profile to create invoices.</span> Missing:{' '}
          {missing.join(', ')}. {profile ? 'Remember to save your changes.' : ''}
        </Callout>
      )}

      {/* Studio */}
      <Card>
        <CardHeader>
          <CardTitle>Studio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="studioName"
            label="Studio / profile name"
            value={form.studioName}
            onChange={(v) => update({ studioName: stripAccents(v) })}
            placeholder="Eg: Daniel Arq"
          />
          <TextField
            id="tagline"
            label="Slogan"
            value={form.tagline}
            onChange={(v) => update({ tagline: stripAccents(v) })}
            placeholder="Eg: Architecture & Design"
          />
        </CardContent>
      </Card>

      {/* Professional & identity */}
      <Card>
        <CardHeader>
          <CardTitle>Professional &amp; identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="professionalName"
            label="Professional name"
            value={form.professionalName}
            onChange={(v) => update({ professionalName: stripAccents(v) })}
            placeholder="Eg: Daniel Merchan Caceres"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="idType">ID type</Label>
              <Select value={form.idType} onValueChange={(v) => update({ idType: v as IdType })}>
                <SelectTrigger id="idType">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TextField
              id="idNumber"
              label="ID number"
              value={form.idNumber}
              onChange={(v) => update({ idNumber: v })}
              placeholder="Eg: 1214726872"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => update({ email: v })}
            placeholder="you@example.com"
          />
          <TextField
            id="phone"
            label="Phone"
            value={form.phone}
            onChange={(v) => update({ phone: v })}
            placeholder="Eg: +57 310 780 2775"
          />
          <TextField
            id="address"
            label="Address"
            value={form.address}
            onChange={(v) => update({ address: stripAccents(v) })}
            placeholder="Eg: Carrera 51 #51-17"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="city"
              label="City"
              value={form.city}
              onChange={(v) => update({ city: stripAccents(v) })}
              placeholder="Eg: Medellin"
            />
            <TextField
              id="country"
              label="Country"
              value={form.country}
              onChange={(v) => update({ country: stripAccents(v) })}
              placeholder="Eg: Colombia"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="bankName"
            label="Bank name"
            value={form.bankName}
            onChange={(v) => update({ bankName: stripAccents(v) })}
            placeholder="Eg: Bancolombia"
          />
          <TextField
            id="bankAccount"
            label="Account number"
            value={form.bankAccount}
            onChange={(v) => update({ bankAccount: v })}
            placeholder="Eg: 34785968869"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  );
};

export default Profile;
