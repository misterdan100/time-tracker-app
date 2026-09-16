import { addDays, endOfDay, isWithinInterval, parseISO, startOfDay, startOfMonth } from 'date-fns';
import {
  Country,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  Project,
  TeamTimeEntry,
  TimeEntry,
} from '../types';

/** The slice of app state these helpers need. */
export interface DataSlice {
  projects: Project[];
  timeEntries: TimeEntry[];
  /** Admin only: hours logged by their team. Omit (or leave empty) to ignore team hours. */
  teamEntries?: TeamTimeEntry[];
}

/** What grouping needs from an hour, own or team. */
type HourEntry = Pick<TimeEntry, 'id' | 'projectId' | 'hours'>;

export interface ProjectBreakdown {
  projectId: string;
  projectName: string;
  /** Own + team hours. */
  hours: number;
  entryIds: string[];
  /** Part of `hours` logged by the team (0 when team hours are not included). */
  teamHours: number;
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

interface RangeOpts {
  onlyUnbilled?: boolean;
  projectIds?: string[];
}

function entriesInRange<T extends { projectId: string; date: string }>(
  entries: T[],
  isBilled: (entry: T) => boolean,
  clientId: string,
  startISO: string,
  endISO: string,
  projects: Project[],
  opts: RangeOpts
): T[] {
  const start = startOfDay(parseISO(startISO));
  const end = endOfDay(parseISO(endISO));
  if (start > end) return [];

  const allowed = new Set(opts.projectIds ?? getClientProjectIds(clientId, projects));

  return entries.filter((e) => {
    if (!allowed.has(e.projectId)) return false;
    if (opts.onlyUnbilled && isBilled(e)) return false;
    return isWithinInterval(parseISO(e.date), { start, end });
  });
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
  opts: RangeOpts = {}
): TimeEntry[] {
  return entriesInRange(
    data.timeEntries,
    (e) => !!e.invoiceId,
    clientId,
    startISO,
    endISO,
    data.projects,
    opts
  );
}

/**
 * The team's hours on a client's projects within [start, end]. "Unbilled" means not yet billed
 * to the CLIENT (no leadInvoiceId), whether or not the member already invoiced the lead.
 */
export function getClientTeamEntriesInRange(
  clientId: string,
  startISO: string,
  endISO: string,
  data: DataSlice,
  opts: RangeOpts = {}
): TeamTimeEntry[] {
  return entriesInRange(
    data.teamEntries ?? [],
    (e) => !!e.leadInvoiceId,
    clientId,
    startISO,
    endISO,
    data.projects,
    opts
  );
}

// ---------- grouping / line items ----------

/** Group own hours (and optionally the team's) into one row per project. */
export function groupByProject(
  entries: HourEntry[],
  projects: Project[],
  teamEntries: HourEntry[] = []
): ProjectBreakdown[] {
  const nameById = new Map(projects.map((p) => [p.id, p.name]));
  const byProject = new Map<string, ProjectBreakdown>();

  const rowFor = (projectId: string) => {
    let row = byProject.get(projectId);
    if (!row) {
      row = {
        projectId,
        projectName: nameById.get(projectId) ?? 'Unknown project',
        hours: 0,
        entryIds: [],
        teamHours: 0,
      };
      byProject.set(projectId, row);
    }
    return row;
  };

  for (const entry of entries) {
    const row = rowFor(entry.projectId);
    row.hours += entry.hours;
    row.entryIds.push(entry.id);
  }
  for (const entry of teamEntries) {
    const row = rowFor(entry.projectId);
    row.hours += entry.hours;
    row.teamHours += entry.hours;
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
    // Only stored when there are team hours, so invoices without them keep today's shape.
    ...(g.teamHours > 0 ? { teamHours: g.teamHours } : {}),
  }));
  const totalHours = lineItems.reduce((sum, li) => sum + li.hours, 0);
  const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);
  return { lineItems, totalHours, totalAmount };
}

/** Sum of the team's part across an invoice's lines. */
export function invoiceTeamHours(lineItems: InvoiceLineItem[]): number {
  return lineItems.reduce((sum, li) => sum + (li.teamHours ?? 0), 0);
}

/**
 * Per-project unbilled breakdown for a client in a range (used by the create dialog).
 * `includeTeam` adds the team's hours not yet billed to the client.
 */
export function clientProjectsBreakdown(
  clientId: string,
  startISO: string,
  endISO: string,
  data: DataSlice,
  opts: { onlyUnbilled?: boolean; includeTeam?: boolean } = { onlyUnbilled: true }
): ProjectBreakdown[] {
  const entries = getClientEntriesInRange(clientId, startISO, endISO, data, {
    onlyUnbilled: opts.onlyUnbilled,
  });
  const teamEntries = opts.includeTeam
    ? getClientTeamEntriesInRange(clientId, startISO, endISO, data, {
        onlyUnbilled: opts.onlyUnbilled,
      })
    : [];
  return groupByProject(entries, data.projects, teamEntries);
}

// ---------- billing status across all time ----------

export interface UnbilledSummary {
  /** Own + team hours. */
  hours: number;
  /** Part of `hours` logged by the team (0 without `data.teamEntries`). */
  teamHours: number;
  earliestDate: string | null; // ISO of oldest unbilled entry
  latestDate: string | null; // ISO of newest unbilled entry
}

/**
 * All-time unbilled hours for a client: own entries with no invoiceId plus, when
 * `data.teamEntries` is given, team entries not yet billed to the client.
 */
export function computeUnbilled(clientId: string, data: DataSlice): UnbilledSummary {
  const projectIds = new Set(getClientProjectIds(clientId, data.projects));
  const own = data.timeEntries.filter((e) => projectIds.has(e.projectId) && !e.invoiceId);
  const team = (data.teamEntries ?? []).filter(
    (e) => projectIds.has(e.projectId) && !e.leadInvoiceId
  );

  let hours = 0;
  let teamHours = 0;
  let earliest: number | null = null;
  let latest: number | null = null;
  for (const e of [...own, ...team]) {
    hours += e.hours;
    const t = parseISO(e.date).getTime();
    if (earliest === null || t < earliest) earliest = t;
    if (latest === null || t > latest) latest = t;
  }
  for (const e of team) teamHours += e.hours;

  return {
    hours,
    teamHours,
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

// ---------- suggested billing period ----------

export interface SuggestedPeriod {
  start: string; // ISO
  end: string; // ISO (today)
  /** Latest period end across the client's invoices (any status), or null. */
  lastPeriodEnd: string | null;
  basis: 'after-last-invoice' | 'earlier-unbilled' | 'default';
}

/**
 * Suggest the period for a new invoice so it covers hours not yet inside any
 * invoice: from the day after the latest invoice period end (drafts included),
 * pulled back to the oldest unbilled entry that no draft already covers,
 * through today. Falls back to the current month when there is nothing to go on.
 * Team hours not yet billed to the client count too when `data.teamEntries` is given.
 */
export function suggestInvoicePeriod(
  clientId: string,
  data: DataSlice & { invoices: Invoice[] },
  now: Date = new Date()
): SuggestedPeriod {
  const mine = data.invoices.filter((i) => i.clientId === clientId);

  // Latest period end across all of the client's invoices (compare as dates, not strings).
  let lastEnd: Date | null = null;
  for (const inv of mine) {
    const end = parseISO(inv.periodEnd);
    if (Number.isNaN(end.getTime())) continue;
    if (lastEnd === null || end > lastEnd) lastEnd = end;
  }

  // Drafts link no entries yet, so treat their period as "covered".
  const draftRanges = mine
    .filter((i) => i.status === 'draft')
    .map((i) => ({ start: startOfDay(parseISO(i.periodStart)), end: endOfDay(parseISO(i.periodEnd)) }))
    .filter((r) => !Number.isNaN(r.start.getTime()) && !Number.isNaN(r.end.getTime()) && r.start <= r.end);

  const projectIds = new Set(getClientProjectIds(clientId, data.projects));
  let earliestUncovered: Date | null = null;
  const unbilled = [
    ...data.timeEntries.filter((e) => !e.invoiceId),
    ...(data.teamEntries ?? []).filter((e) => !e.leadInvoiceId),
  ];
  for (const e of unbilled) {
    if (!projectIds.has(e.projectId)) continue;
    const d = parseISO(e.date);
    if (Number.isNaN(d.getTime())) continue;
    if (draftRanges.some((r) => isWithinInterval(d, r))) continue;
    if (earliestUncovered === null || d < earliestUncovered) earliestUncovered = d;
  }

  const dayAfterLast = lastEnd ? startOfDay(addDays(lastEnd, 1)) : null;
  const earliest = earliestUncovered ? startOfDay(earliestUncovered) : null;

  let start: Date;
  let basis: SuggestedPeriod['basis'];
  if (dayAfterLast === null && earliest === null) {
    start = startOfMonth(now);
    basis = 'default';
  } else if (dayAfterLast === null) {
    start = earliest as Date;
    basis = 'earlier-unbilled';
  } else if (earliest !== null && earliest < dayAfterLast) {
    start = earliest;
    basis = 'earlier-unbilled';
  } else {
    start = dayAfterLast;
    basis = 'after-last-invoice';
  }

  const end = now;
  if (start > end) start = startOfDay(end);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    lastPeriodEnd: lastEnd ? lastEnd.toISOString() : null,
    basis,
  };
}
