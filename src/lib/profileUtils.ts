import { Profile } from '../types';
import { stripAccents } from './text';

/** A blank profile, used to seed the form when the user has none yet. */
export const emptyProfile: Profile = {
  studioName: '',
  tagline: '',
  professionalName: '',
  address: '',
  city: '',
  country: 'Colombia',
  email: '',
  bankAccount: '',
  bankName: '',
  idType: 'C.C.',
  idNumber: '',
  phone: '',
};

/** Fields that must be filled before the user can create invoices (in display order). */
export const REQUIRED_PROFILE_FIELDS: Array<{ key: keyof Profile; label: string }> = [
  { key: 'studioName', label: 'Studio name' },
  { key: 'tagline', label: 'Slogan' },
  { key: 'professionalName', label: 'Professional name' },
  { key: 'idType', label: 'ID type' },
  { key: 'idNumber', label: 'ID number' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'bankName', label: 'Bank name' },
  { key: 'bankAccount', label: 'Bank account' },
];

/** Labels of the required fields still empty (all of them if the profile is null). */
export function missingProfileFields(profile: Profile | null): string[] {
  if (!profile) return REQUIRED_PROFILE_FIELDS.map((f) => f.label);
  return REQUIRED_PROFILE_FIELDS.filter((f) => !String(profile[f.key] ?? '').trim()).map(
    (f) => f.label
  );
}

export function isProfileComplete(profile: Profile | null): boolean {
  return missingProfileFields(profile).length === 0;
}

/**
 * Strip vowel accents (keeping ñ) from the free-text fields. Structured fields
 * (email, phone, numbers, idType) are left untouched.
 */
export function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    studioName: stripAccents(profile.studioName),
    tagline: stripAccents(profile.tagline),
    professionalName: stripAccents(profile.professionalName),
    address: stripAccents(profile.address),
    city: stripAccents(profile.city),
    country: stripAccents(profile.country),
    bankName: stripAccents(profile.bankName),
  };
}
