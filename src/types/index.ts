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
}

export type InvoiceStatus = 'draft' | 'finalized' | 'paid';

export interface InvoiceLineItem {
  projectId: string;
  projectName: string;
  hours: number;
  amount: number;
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

export interface AppState {
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  cities: string[];
  invoices: Invoice[];
}
