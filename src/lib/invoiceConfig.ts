// Business identity rendered in the "From" block of every invoice/PDF.
// Edit these with the architect's real details. This can later become a
// settings screen backed by the database; for now it's a single source of truth.

export interface BusinessProfile {
  name: string;
  tagline?: string;
  address?: string;
  email?: string;
  phone?: string;
  taxId?: string; // NIT / Tax ID
  website?: string;
}

export const businessProfile: BusinessProfile = {
  name: 'Your Studio Name',
  tagline: 'Architecture & Design',
  address: 'Your address, City, Country',
  email: 'you@example.com',
  phone: '',
  taxId: '',
  website: '',
};
