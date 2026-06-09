import { endOfDay, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { Country, Invoice, InvoiceLineItem, InvoiceStatus, Project, TimeEntry } from '../types';

/** The slice of app state these helpers need. */
export interface DataSlice {
  projects: Project[];
  timeEntries: TimeEntry[];
}

export interface ProjectBreakdown {
  projectId: string;
  projectName: string;
  hours: number;
  entryIds: string[];
}

// ---------- currency ----------

const CURRENCY_LOCALE: Record<string, string> = {
  USD: 'en-US',
  COP: 'es-CO',
  EUR: 'de-DE',
};

export function defaultCurrencyForCountry(country: Country): string {
  switch (country) {
    case 'Colombia':
      return 'COP';
    case 'US':
      return 'USD';
    default:
      return 'COP';
  }
}

export function formatCurrency(amount: number, currency: string): string {
  const locale = CURRENCY_LOCALE[currency] ?? 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'COP' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

// ---------- entry selection ----------

export function getClientProjectIds(clientId: string, projects: Project[]): string[] {
  return projects.filter((p) => p.clientId === clientId).map((p) => p.id);
}

/**
 * Time entries for a client's projects within [start, end] (inclusive of both
 * full days). Optionally restrict to specific projects and/or unbilled entries.
 */
export function getClientEntriesInRange(
  clientId: string,
  startISO: string,
  endISO: string,
  data: DataSlice,
  opts: { onlyUnbilled?: boolean; projectIds?: string[] } = {}
): TimeEntry[] {
  const start = startOfDay(parseISO(startISO));
  const end = endOfDay(parseISO(endISO));
  if (start > end) return [];

  const allowed = new Set(opts.projectIds ?? getClientProjectIds(clientId, data.projects));

  return data.timeEntries.filter((e) => {
    if (!allowed.has(e.projectId)) return false;
    if (opts.onlyUnbilled && e.invoiceId) return false;
    return isWithinInterval(parseISO(e.date), { start, end });
  });
}

// ---------- grouping / line items ----------

export function groupByProject(entries: TimeEntry[], projects: Project[]): ProjectBreakdown[] {
  const nameById = new Map(projects.map((p) => [p.id, p.name]));
  const byProject = new Map<string, ProjectBreakdown>();

  for (const entry of entries) {
    const existing = byProject.get(entry.projectId);
    if (existing) {
      existing.hours += entry.hours;
      existing.entryIds.push(entry.id);
    } else {
      byProject.set(entry.projectId, {
        projectId: entry.projectId,
        projectName: nameById.get(entry.projectId) ?? 'Unknown project',
        hours: entry.hours,
        entryIds: [entry.id],
      });
    }
  }

  return Array.from(byProject.values()).sort((a, b) =>
    a.projectName.localeCompare(b.projectName)
  );
}

export interface BuiltLineItems {
  lineItems: InvoiceLineItem[];
  totalHours: number;
  totalAmount: number;
}

export function buildLineItems(grouped: ProjectBreakdown[], hourlyRate: number): BuiltLineItems {
  const lineItems: InvoiceLineItem[] = grouped.map((g) => ({
    projectId: g.projectId,
    projectName: g.projectName,
    hours: g.hours,
    amount: g.hours * hourlyRate,
  }));
  const totalHours = lineItems.reduce((sum, li) => sum + li.hours, 0);
  const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);
  return { lineItems, totalHours, totalAmount };
}

/** Per-project unbilled breakdown for a client in a range (used by the create dialog). */
export function clientProjectsBreakdown(
  clientId: string,
  startISO: string,
  endISO: string,
  data: DataSlice,
  opts: { onlyUnbilled?: boolean } = { onlyUnbilled: true }
): ProjectBreakdown[] {
  const entries = getClientEntriesInRange(clientId, startISO, endISO, data, {
    onlyUnbilled: opts.onlyUnbilled,
  });
  return groupByProject(entries, data.projects);
}

// ---------- billing status across all time ----------

export interface UnbilledSummary {
  hours: number;
  earliestDate: string | null; // ISO of oldest unbilled entry
  latestDate: string | null; // ISO of newest unbilled entry
}

/** All-time unbilled hours for a client (entries with no invoiceId). */
export function computeUnbilled(clientId: string, data: DataSlice): UnbilledSummary {
  const projectIds = new Set(getClientProjectIds(clientId, data.projects));
  const entries = data.timeEntries.filter(
    (e) => projectIds.has(e.projectId) && !e.invoiceId
  );

  let hours = 0;
  let earliest: number | null = null;
  let latest: number | null = null;
  for (const e of entries) {
    hours += e.hours;
    const t = parseISO(e.date).getTime();
    if (earliest === null || t < earliest) earliest = t;
    if (latest === null || t > latest) latest = t;
  }

  return {
    hours,
    earliestDate: earliest === null ? null : new Date(earliest).toISOString(),
    latestDate: latest === null ? null : new Date(latest).toISOString(),
  };
}

export function clientInvoices(clientId: string, invoices: Invoice[]): Invoice[] {
  // Preserves incoming order (fetchAll returns newest first).
  return invoices.filter((i) => i.clientId === clientId);
}

/** End of the most recent billed (finalized/paid) period for a client, or null. */
export function lastInvoicedPeriodEnd(clientId: string, invoices: Invoice[]): string | null {
  const billed = invoices.filter(
    (i) => i.clientId === clientId && (i.status === 'finalized' || i.status === 'paid')
  );
  if (billed.length === 0) return null;
  return billed.reduce(
    (latest, i) => (i.periodEnd > latest ? i.periodEnd : latest),
    billed[0].periodEnd
  );
}

/** Sum the amounts of invoices in the given statuses (for dashboards/summary cards). */
export function sumInvoiced(invoices: Invoice[], statuses: InvoiceStatus[]): number {
  const set = new Set(statuses);
  return invoices.filter((i) => set.has(i.status)).reduce((sum, i) => sum + i.totalAmount, 0);
}

// ---------- invoice numbering (per client) ----------

/** Extract the integer from a stored invoice number ("8", "INV-0008" → 8). NaN if none. */
export function parseInvoiceNumber(value: string): number {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : NaN;
}

/** The integer invoice numbers already used by a client (optionally excluding one invoice). */
export function clientInvoiceNumbers(
  clientId: string,
  invoices: Invoice[],
  excludeId?: string
): number[] {
  return invoices
    .filter((i) => i.clientId === clientId && i.id !== excludeId)
    .map((i) => parseInvoiceNumber(i.invoiceNumber))
    .filter((n) => !Number.isNaN(n));
}

/** Suggested next number for a client: max used + 1, or 1 if none yet. */
export function nextInvoiceNumberForClient(clientId: string, invoices: Invoice[]): number {
  const nums = clientInvoiceNumbers(clientId, invoices);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

/** Display form of an invoice number: zero-padded to 3 digits (8 -> "008"). */
export function formatInvoiceNumber(invoiceNumber: string | number): string {
  return String(invoiceNumber).padStart(3, '0');
}
