import { Client, Country, Profile } from '../types';

/**
 * In a member's account their lead plays the role of the only "client": member invoices
 * point to it in the UI, and are stored with client_id = null and bill_to_user_id = lead.
 * Reusing the client-shaped invoice flow keeps numbering, periods and PDFs identical.
 */
export const LEAD_CLIENT_ID = 'lead';

/** What a member bills their lead (from their team_members row). */
export interface MemberBilling {
  leadId: string;
  hourlyRate: number;
  currency: string;
}

/** The lead as a client-shaped record, built from the lead's studio profile. */
export function leadAsClient(
  leadProfile: Profile | null,
  billing: Pick<MemberBilling, 'hourlyRate' | 'currency'>
): Client {
  return {
    id: LEAD_CLIENT_ID,
    companyName: leadProfile?.studioName || leadProfile?.professionalName || 'Team lead',
    ownerName: leadProfile?.professionalName ?? '',
    // Free-text country from the profile; only printed on the PDF.
    country: (leadProfile?.country || 'Colombia') as Country,
    email: leadProfile?.email ?? '',
    defaultRate: billing.hourlyRate,
    currency: billing.currency,
  };
}
