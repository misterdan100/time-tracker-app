export type Country = 'Colombia' | 'US';
export type WorkType = 'Blueprints' | '3D Modeling' | 'Site Visit' | 'Consulting' | 'Other';
export type ProjectStatus = 'Active' | 'Paused' | 'Completed';

export interface Client {
  id: string;
  companyName: string;
  ownerName: string;
  country: Country;
  email: string;
  defaultRate: number;
  currency: string;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  city: string;
  clientId: string;
  /** One or more work-type tags (a project can be Blueprints and 3D Modeling at once). */
  workTypes: WorkType[];
  status: ProjectStatus;
  color: string;
  createdAt?: string; // ISO, read-only (set by the database on insert)
}

export interface TimeEntry {
  id: string;
  projectId: string;
  date: string; // ISO format
  hours: number;
  invoiceId?: string | null; // set when the entry is billed in a finalized invoice
  /** Member hours only: set when the lead billed this hour to the client (locks it for the member). */
  leadInvoiceId?: string | null;
}

export type InvoiceStatus = 'draft' | 'finalized' | 'paid';

export interface InvoiceLineItem {
  projectId: string;
  projectName: string;
  /** Total hours billed on the line (own + team); the only figure the PDF shows. */
  hours: number;
  amount: number;
  /** Part of `hours` logged by the lead's team (in-app breakdown only; absent when none). */
  teamHours?: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  title: string;
  periodStart: string; // ISO
  periodEnd: string; // ISO
  hourlyRate: number;
  currency: string;
  status: InvoiceStatus;
  totalHours: number;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
  notes: string;
  createdAt?: string | null; // ISO, read-only (set by the database on insert)
  issuedAt?: string | null; // ISO, set on finalize
  paidAt?: string | null; // ISO, set when marked paid
  /** Set on invoices a team member sends to their lead (then clientId is the lead placeholder). */
  billToUserId?: string | null;
  /** Client invoices: also bill the hours the lead's team logged on the client's projects. */
  includeTeam?: boolean;
}

export type IdType = 'C.C.' | 'NIT' | 'ID';

/** The invoice issuer (studio/professional) details, one per user. */
export interface Profile {
  studioName: string;
  tagline: string;
  professionalName: string;
  address: string;
  city: string;
  country: string;
  email: string;
  bankAccount: string;
  bankName: string;
  idType: IdType;
  idNumber: string;
  phone: string;
}

/** A project the lead has opened to a team member (public.project_members). */
export interface ProjectAssignment {
  projectId: string;
  userId: string;
}

/** A member led by the signed-in admin (from public.team_members). */
export interface TeamMemberSummary {
  userId: string;
  displayName: string;
  active: boolean;
  hourlyRate: number;
  currency: string;
}

/** An invoice a team member sent to the signed-in admin. */
export interface TeamInvoice extends Invoice {
  userId: string;
}

/** A time entry logged by a team member, as seen by their lead (read-only). */
export interface TeamTimeEntry {
  id: string;
  userId: string;
  projectId: string;
  date: string;
  hours: number;
  /** The member's invoice to the lead that billed this hour. */
  invoiceId: string | null;
  /** The lead's client invoice that billed this hour. */
  leadInvoiceId: string | null;
}

export interface AppState {
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  cities: string[];
  invoices: Invoice[];
}
