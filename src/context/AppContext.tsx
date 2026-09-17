import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  AppState,
  Client,
  Invoice,
  Profile,
  Project,
  ProjectAssignment,
  TeamInvoice,
  TeamMemberSummary,
  TeamTimeEntry,
  TimeEntry,
} from '../types';
import { supabase } from '../lib/supabase';
import {
  buildLineItems,
  formatInvoiceNumber,
  getClientEntriesInRange,
  getClientTeamEntriesInRange,
  groupByProject,
} from '../lib/invoiceUtils';
import { normalizeProfile } from '../lib/profileUtils';
import { LEAD_CLIENT_ID, leadAsClient, type MemberBilling } from '../lib/teamBilling';
import { normalizeWorkTypes } from '../lib/workTypes';
import { useAuth } from './AuthContext';

export interface MutationOpts {
  silent?: boolean;
}

/** The team member whose data the admin is currently viewing (read-only). */
export interface ViewAsTarget {
  userId: string;
  name: string;
}

interface AppContextType {
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  profile: Profile | null;
  cities: string[];
  loading: boolean;
  /**
   * Project assignments visible to the data owner: for the admin, every assignment on their
   * projects; for a member, their own assignments.
   */
  assignments: ProjectAssignment[];
  /** Admin only: the members they lead. */
  teamMembers: TeamMemberSummary[];
  /** Admin only: hours logged by their members (read-only, not part of the admin's own totals). */
  teamEntries: TeamTimeEntry[];
  /** Projects the signed-in user can log hours on (members: assigned ones only). */
  loggableProjects: Project[];
  /** Member data only: who they bill and at what rate (set by the lead). */
  memberBilling: MemberBilling | null;
  /** Admin only: invoices members sent them (finalized or paid). */
  teamInvoices: TeamInvoice[];
  /** Admin only: members' studio profiles by user id (the "From" block of their PDFs). */
  teamProfiles: Record<string, Profile>;
  /** Admin: mark a received invoice as paid. */
  markTeamInvoicePaid: (id: string) => Promise<boolean>;
  /** Admin: send a received invoice back to the member as a draft (releases its hours). */
  returnTeamInvoice: (id: string) => Promise<boolean>;
  /** Set while the admin is viewing a member's account. */
  viewAs: ViewAsTarget | null;
  /** True while viewing another account: every mutation is blocked. */
  readOnly: boolean;
  /**
   * The admin working in their own account. Gates admin-only navigation and controls; while
   * viewing a member the UI shows exactly what that member sees (read-only).
   */
  adminView: boolean;
  startViewAs: (target: ViewAsTarget) => void;
  stopViewAs: () => void;
  /** Re-load everything for the current data owner (e.g. after team changes). */
  refreshData: () => Promise<void>;
  assignProject: (projectId: string, userId: string) => Promise<boolean>;
  unassignProject: (projectId: string, userId: string) => Promise<boolean>;
  /** Replace a member's assignments with exactly `projectIds` (Team page). */
  setMemberProjects: (userId: string, projectIds: string[]) => Promise<boolean>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<void>;
  updateTimeEntry: (id: string, entry: Partial<TimeEntry>) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<Invoice | null>;
  /** Resolve to true on success. `silent` skips the per-invoice success toast (bulk actions). */
  finalizeInvoice: (id: string, opts?: MutationOpts) => Promise<boolean>;
  markInvoicePaid: (id: string, opts?: MutationOpts) => Promise<boolean>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string, opts?: MutationOpts) => Promise<boolean>;
  saveProfile: (profile: Profile) => Promise<void>;
  addCity: (city: string) => void;
  exportData: () => void;
  importData: (data: AppState) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const generateRandomColor = (): string => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// ---------- row <-> domain mappers ----------

const rowToClient = (r: any): Client => ({
  id: r.id,
  companyName: r.company_name,
  ownerName: r.owner_name,
  country: r.country,
  email: r.email,
  defaultRate: Number(r.default_rate ?? 0),
  currency: r.currency ?? 'USD',
});

const clientToRow = (c: Partial<Client>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.companyName !== undefined) row.company_name = c.companyName;
  if (c.ownerName !== undefined) row.owner_name = c.ownerName;
  if (c.country !== undefined) row.country = c.country;
  if (c.email !== undefined) row.email = c.email;
  if (c.defaultRate !== undefined) row.default_rate = c.defaultRate;
  if (c.currency !== undefined) row.currency = c.currency;
  return row;
};

const rowToProject = (r: any): Project => ({
  id: r.id,
  name: r.name,
  address: r.address,
  city: r.city,
  clientId: r.client_id,
  // Prefer the tag array; fall back to the legacy single work_type column.
  workTypes: normalizeWorkTypes(
    Array.isArray(r.work_types) && r.work_types.length > 0 ? r.work_types : r.work_type
  ),
  status: r.status,
  color: r.color,
  createdAt: r.created_at ?? undefined,
});

const projectToRow = (p: Partial<Project>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.address !== undefined) row.address = p.address;
  if (p.city !== undefined) row.city = p.city;
  if (p.clientId !== undefined) row.client_id = p.clientId;
  if (p.workTypes !== undefined) {
    const tags = normalizeWorkTypes(p.workTypes);
    row.work_types = tags;
    // Keep the legacy column populated (first tag) so older readers still see a value.
    row.work_type = tags[0] ?? 'Other';
  }
  if (p.status !== undefined) row.status = p.status;
  if (p.color !== undefined) row.color = p.color;
  return row;
};

const rowToTimeEntry = (r: any): TimeEntry => ({
  id: r.id,
  projectId: r.project_id,
  date: r.date,
  hours: Number(r.hours),
  invoiceId: r.invoice_id ?? null,
  leadInvoiceId: r.lead_invoice_id ?? null,
});

// lead_invoice_id is never written from here: only finalize_invoice sets it.
const timeEntryToRow = (e: Partial<TimeEntry>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (e.projectId !== undefined) row.project_id = e.projectId;
  if (e.date !== undefined) row.date = e.date;
  if (e.hours !== undefined) row.hours = e.hours;
  if (e.invoiceId !== undefined) row.invoice_id = e.invoiceId;
  return row;
};

const rowToInvoice = (r: any): Invoice => ({
  id: r.id,
  // Invoices billed to a lead have no client; the UI treats the lead as the client.
  clientId: r.client_id ?? LEAD_CLIENT_ID,
  billToUserId: r.bill_to_user_id ?? null,
  invoiceNumber: r.invoice_number,
  title: r.title ?? '',
  periodStart: r.period_start,
  periodEnd: r.period_end,
  hourlyRate: Number(r.hourly_rate),
  currency: r.currency ?? 'USD',
  status: r.status,
  totalHours: Number(r.total_hours),
  totalAmount: Number(r.total_amount),
  lineItems: Array.isArray(r.line_items) ? r.line_items : [],
  notes: r.notes ?? '',
  createdAt: r.created_at ?? null,
  issuedAt: r.issued_at ?? null,
  paidAt: r.paid_at ?? null,
  includeTeam: !!r.include_team,
});

const invoiceToRow = (i: Partial<Invoice>, leadId?: string | null): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (i.clientId !== undefined) {
    if (i.clientId === LEAD_CLIENT_ID) {
      row.client_id = null;
      row.bill_to_user_id = leadId ?? null;
    } else {
      row.client_id = i.clientId;
    }
  }
  if (i.invoiceNumber !== undefined) row.invoice_number = i.invoiceNumber;
  if (i.title !== undefined) row.title = i.title;
  if (i.periodStart !== undefined) row.period_start = i.periodStart;
  if (i.periodEnd !== undefined) row.period_end = i.periodEnd;
  if (i.hourlyRate !== undefined) row.hourly_rate = i.hourlyRate;
  if (i.currency !== undefined) row.currency = i.currency;
  if (i.status !== undefined) row.status = i.status;
  if (i.totalHours !== undefined) row.total_hours = i.totalHours;
  if (i.totalAmount !== undefined) row.total_amount = i.totalAmount;
  if (i.lineItems !== undefined) row.line_items = i.lineItems;
  if (i.notes !== undefined) row.notes = i.notes;
  if (i.issuedAt !== undefined) row.issued_at = i.issuedAt;
  if (i.paidAt !== undefined) row.paid_at = i.paidAt;
  if (i.includeTeam !== undefined) row.include_team = i.includeTeam;
  return row;
};

const rowToProfile = (r: any): Profile => ({
  studioName: r.studio_name ?? '',
  tagline: r.tagline ?? '',
  professionalName: r.professional_name ?? '',
  address: r.address ?? '',
  city: r.city ?? '',
  country: r.country ?? '',
  email: r.email ?? '',
  bankAccount: r.bank_account ?? '',
  bankName: r.bank_name ?? '',
  idType: (r.id_type ?? 'C.C.') as Profile['idType'],
  idNumber: r.id_number ?? '',
  phone: r.phone ?? '',
});

const profileToRow = (p: Profile): Record<string, unknown> => ({
  studio_name: p.studioName,
  tagline: p.tagline,
  professional_name: p.professionalName,
  address: p.address,
  city: p.city,
  country: p.country,
  email: p.email,
  bank_account: p.bankAccount,
  bank_name: p.bankName,
  id_type: p.idType,
  id_number: p.idNumber,
  phone: p.phone,
});

const rowToAssignment = (r: any): ProjectAssignment => ({
  projectId: r.project_id,
  userId: r.user_id,
});

const rowToTeamEntry = (r: any): TeamTimeEntry => ({
  id: r.id,
  userId: r.user_id,
  projectId: r.project_id,
  date: r.date,
  hours: Number(r.hours),
  invoiceId: r.invoice_id ?? null,
  leadInvoiceId: r.lead_invoice_id ?? null,
});

/** Stand-ins for queries we skip, so Promise.all keeps one shape. */
const EMPTY = Promise.resolve({ data: [] as any[], error: null });
const EMPTY_ONE = Promise.resolve({ data: null as any, error: null });

const citiesFromProjects = (projects: Project[]): string[] =>
  Array.from(new Set(projects.map((p) => p.city).filter(Boolean)));

const READ_ONLY_MESSAGE = 'Read-only while viewing another account';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, userId, isAdmin, isMember, membershipLoading } = useAuth();
  // Not persisted: a reload or logout always returns the admin to their own data.
  const [viewAs, setViewAs] = useState<ViewAsTarget | null>(null);
  const effectiveViewAs = isAdmin && viewAs && viewAs.userId !== userId ? viewAs : null;
  const dataOwnerId = effectiveViewAs?.userId ?? userId;
  const readOnly = effectiveViewAs !== null;
  const adminView = isAdmin && !readOnly;
  // Whose-data shape to load: members (and the admin viewing one) get assignment-based projects.
  const ownerIsMember = readOnly || isMember;
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [teamEntries, setTeamEntries] = useState<TeamTimeEntry[]>([]);
  const [memberBilling, setMemberBilling] = useState<MemberBilling | null>(null);
  const [teamInvoices, setTeamInvoices] = useState<TeamInvoice[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);

  // What finalizeInvoice bills from. Bulk actions call it several times from one render's
  // closure, so it reads (and patches) this ref to see hours the previous call just billed.
  const billingData = useRef({ invoices, projects, timeEntries, teamEntries });
  billingData.current = { invoices, projects, timeEntries, teamEntries };

  // Guards against a slow earlier response overwriting a newer one (e.g. switching accounts).
  const fetchSeq = useRef(0);

  // Always filter by owner explicitly: a lead can also READ their members' rows via RLS,
  // so relying on RLS alone would mix accounts (and break the single-profile query).
  const fetchAll = useCallback(async (ownerId: string, asMember: boolean) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    const [
      clientsRes,
      ownProjectsRes,
      entriesRes,
      invoicesRes,
      profileRes,
      myAssignmentsRes,
      membersRes,
      ownerMemberRes,
    ] = await Promise.all([
        // Members have no clients or projects of their own.
        asMember
          ? EMPTY
          : supabase.from('clients').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        asMember
          ? EMPTY
          : supabase.from('projects').select('*').eq('user_id', ownerId).order('created_at', { ascending: true }),
        supabase.from('time_entries').select('*').eq('user_id', ownerId).order('date', { ascending: false }),
        supabase.from('invoices').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('user_id', ownerId).maybeSingle(),
        asMember ? supabase.from('project_members').select('*').eq('user_id', ownerId) : EMPTY,
        asMember
          ? EMPTY
          : supabase
              .from('team_members')
              .select('user_id, display_name, active, hourly_rate, currency')
              .eq('lead_id', ownerId),
        // A member's own row: who their lead is and the rate they bill.
        asMember
          ? supabase
              .from('team_members')
              .select('lead_id, hourly_rate, currency')
              .eq('user_id', ownerId)
              .maybeSingle()
          : EMPTY_ONE,
      ]);
    if (seq !== fetchSeq.current) return;

    if (clientsRes.error) console.error('Error loading clients:', clientsRes.error.message);
    if (ownProjectsRes.error) console.error('Error loading projects:', ownProjectsRes.error.message);
    if (entriesRes.error) console.error('Error loading time entries:', entriesRes.error.message);
    if (invoicesRes.error) console.error('Error loading invoices:', invoicesRes.error.message);
    if (profileRes.error) console.error('Error loading profile:', profileRes.error.message);
    if (myAssignmentsRes.error) console.error('Error loading assignments:', myAssignmentsRes.error.message);
    if (membersRes.error) console.error('Error loading team:', membersRes.error.message);
    if (ownerMemberRes.error) console.error('Error loading billing:', ownerMemberRes.error.message);

    const loadedEntries = (entriesRes.data ?? []).map(rowToTimeEntry);
    let loadedProjects = (ownProjectsRes.data ?? []).map(rowToProject);
    let loadedClients: Client[] = (clientsRes.data ?? []).map(rowToClient);
    let loadedBilling: MemberBilling | null = null;
    let loadedTeamInvoices: TeamInvoice[] = [];
    const loadedTeamProfiles: Record<string, Profile> = {};
    let loadedAssignments: ProjectAssignment[] = (myAssignmentsRes.data ?? []).map(rowToAssignment);
    const loadedMembers: TeamMemberSummary[] = (membersRes.data ?? []).map((r: any) => ({
      userId: r.user_id,
      displayName: r.display_name ?? '',
      active: !!r.active,
      hourlyRate: Number(r.hourly_rate ?? 0),
      currency: r.currency ?? 'COP',
    }));
    let loadedTeamEntries: TeamTimeEntry[] = [];

    if (asMember) {
      // Assigned projects, plus ones they logged hours on before being unassigned (read-only).
      const ids = Array.from(
        new Set([...loadedAssignments.map((a) => a.projectId), ...loadedEntries.map((e) => e.projectId)])
      );
      const leadId: string | null = ownerMemberRes.data?.lead_id ?? null;
      const [res, leadProfileRes] = await Promise.all([
        ids.length > 0
          ? supabase.from('projects').select('*').in('id', ids).order('created_at', { ascending: true })
          : EMPTY,
        leadId ? supabase.from('profiles').select('*').eq('user_id', leadId).maybeSingle() : EMPTY_ONE,
      ]);
      if (res.error) console.error('Error loading assigned projects:', res.error.message);
      if (leadProfileRes.error) console.error('Error loading lead profile:', leadProfileRes.error.message);
      // Members never see clients: every project belongs to the "lead" they bill.
      loadedProjects = (res.data ?? []).map((r: any) => ({ ...rowToProject(r), clientId: LEAD_CLIENT_ID }));
      if (leadId) {
        loadedBilling = {
          leadId,
          hourlyRate: Number(ownerMemberRes.data?.hourly_rate ?? 0),
          currency: ownerMemberRes.data?.currency ?? 'COP',
        };
        const leadProfile = leadProfileRes.data ? rowToProfile(leadProfileRes.data) : null;
        loadedClients = [leadAsClient(leadProfile, loadedBilling)];
      }
    } else {
      const projectIds = loadedProjects.map((p) => p.id);
      const memberIds = loadedMembers.map((m) => m.userId);
      const [assignRes, teamEntriesRes, teamInvoicesRes, teamProfilesRes] = await Promise.all([
        projectIds.length > 0
          ? supabase.from('project_members').select('*').in('project_id', projectIds)
          : EMPTY,
        memberIds.length > 0
          ? supabase
              .from('time_entries')
              .select('id, user_id, project_id, date, hours, invoice_id, lead_invoice_id')
              .in('user_id', memberIds)
              .order('date', { ascending: false })
          : EMPTY,
        // Drafts stay private to the member until they send them.
        memberIds.length > 0
          ? supabase
              .from('invoices')
              .select('*')
              .in('user_id', memberIds)
              .neq('status', 'draft')
              .order('created_at', { ascending: false })
          : EMPTY,
        memberIds.length > 0 ? supabase.from('profiles').select('*').in('user_id', memberIds) : EMPTY,
      ]);
      if (teamInvoicesRes.error) console.error('Error loading team invoices:', teamInvoicesRes.error.message);
      if (teamProfilesRes.error) console.error('Error loading team profiles:', teamProfilesRes.error.message);
      loadedTeamInvoices = (teamInvoicesRes.data ?? []).map((r: any) => ({
        ...rowToInvoice(r),
        userId: r.user_id,
      }));
      for (const r of teamProfilesRes.data ?? []) loadedTeamProfiles[r.user_id] = rowToProfile(r);
      if (assignRes.error) console.error('Error loading assignments:', assignRes.error.message);
      if (teamEntriesRes.error) console.error('Error loading team hours:', teamEntriesRes.error.message);
      loadedAssignments = (assignRes.data ?? []).map(rowToAssignment);
      loadedTeamEntries = (teamEntriesRes.data ?? []).map(rowToTeamEntry);
    }
    if (seq !== fetchSeq.current) return;

    setClients(loadedClients);
    setProjects(loadedProjects);
    setTimeEntries(loadedEntries);
    setInvoices((invoicesRes.data ?? []).map(rowToInvoice));
    setProfile(profileRes.data ? rowToProfile(profileRes.data) : null);
    setCities(citiesFromProjects(loadedProjects));
    setAssignments(loadedAssignments);
    setTeamMembers(loadedMembers);
    setTeamEntries(loadedTeamEntries);
    setMemberBilling(loadedBilling);
    setTeamInvoices(loadedTeamInvoices);
    setTeamProfiles(loadedTeamProfiles);
    setLoading(false);
  }, []);

  // Leaving an account (logout, user switch) always drops any "View as".
  useEffect(() => {
    setViewAs(null);
  }, [userId]);

  useEffect(() => {
    // Clear first so one account's data never shows under another's name.
    setClients([]);
    setProjects([]);
    setTimeEntries([]);
    setInvoices([]);
    setProfile(null);
    setCities([]);
    setAssignments([]);
    setTeamMembers([]);
    setTeamEntries([]);
    setMemberBilling(null);
    setTeamInvoices([]);
    setTeamProfiles({});
    // Wait for the role: it decides which shape of data to load.
    if (isAuthenticated && dataOwnerId && !membershipLoading) {
      fetchAll(dataOwnerId, ownerIsMember);
    } else {
      fetchSeq.current++;
      setLoading(false);
    }
  }, [isAuthenticated, dataOwnerId, ownerIsMember, membershipLoading, fetchAll]);

  const refreshData = useCallback(async () => {
    if (isAuthenticated && dataOwnerId) await fetchAll(dataOwnerId, ownerIsMember);
  }, [isAuthenticated, dataOwnerId, ownerIsMember, fetchAll]);

  const startViewAs = useCallback(
    (target: ViewAsTarget) => {
      if (!isAdmin || target.userId === userId) return;
      setViewAs(target);
    },
    [isAdmin, userId]
  );
  const stopViewAs = useCallback(() => setViewAs(null), []);

  /** Call first in every mutation: blocks writes while viewing someone else's account. */
  const blockedWhileViewing = () => {
    if (!readOnly) return false;
    toast.error(READ_ONLY_MESSAGE);
    return true;
  };

  // ---------- clients ----------

  const addClient = async (client: Omit<Client, 'id'>) => {
    if (blockedWhileViewing()) return;
    const { data, error } = await supabase
      .from('clients')
      .insert(clientToRow(client))
      .select()
      .single();
    if (error) {
      console.error('Error adding client:', error.message);
      toast.error('Could not save client', { description: error.message });
      return;
    }
    setClients((prev) => [...prev, rowToClient(data)]);
    toast.success('Client saved');
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    if (blockedWhileViewing()) return;
    const { data, error } = await supabase
      .from('clients')
      .update(clientToRow(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating client:', error.message);
      toast.error('Could not update client', { description: error.message });
      return;
    }
    setClients((prev) => prev.map((c) => (c.id === id ? rowToClient(data) : c)));
    toast.success('Client updated');
  };

  const deleteClient = async (id: string) => {
    if (blockedWhileViewing()) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      console.error('Error deleting client:', error.message);
      toast.error('Could not delete client', { description: error.message });
      return;
    }
    // DB cascades projects + time entries; mirror that in local state.
    const projectIds = projects.filter((p) => p.clientId === id).map((p) => p.id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    setProjects((prev) => prev.filter((p) => p.clientId !== id));
    setTimeEntries((prev) => prev.filter((te) => !projectIds.includes(te.projectId)));
    setAssignments((prev) => prev.filter((a) => !projectIds.includes(a.projectId)));
    setTeamEntries((prev) => prev.filter((te) => !projectIds.includes(te.projectId)));
    toast.success('Client deleted');
  };

  // ---------- projects ----------

  const addProject = async (project: Omit<Project, 'id'>) => {
    if (blockedWhileViewing()) return;
    const row = projectToRow(project);
    row.color = project.color || generateRandomColor();
    const { data, error } = await supabase
      .from('projects')
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error('Error adding project:', error.message);
      toast.error('Could not save project', { description: error.message });
      return;
    }
    const newProject = rowToProject(data);
    setProjects((prev) => [...prev, newProject]);
    if (newProject.city && !cities.includes(newProject.city)) {
      setCities((prev) => [...prev, newProject.city]);
    }
    toast.success('Project saved');
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    if (blockedWhileViewing()) return;
    const { data, error } = await supabase
      .from('projects')
      .update(projectToRow(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating project:', error.message);
      toast.error('Could not update project', { description: error.message });
      return;
    }
    const updated = rowToProject(data);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    if (updated.city && !cities.includes(updated.city)) {
      setCities((prev) => [...prev, updated.city]);
    }
    toast.success('Project updated');
  };

  const deleteProject = async (id: string) => {
    if (blockedWhileViewing()) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting project:', error.message);
      toast.error('Could not delete project', { description: error.message });
      return;
    }
    const projectName = projects.find((p) => p.id === id)?.name ?? 'Project';
    const removedEntries = timeEntries.filter((te) => te.projectId === id).length;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTimeEntries((prev) => prev.filter((te) => te.projectId !== id));
    // The DB cascade also removes assignments and team hours on this project.
    setAssignments((prev) => prev.filter((a) => a.projectId !== id));
    setTeamEntries((prev) => prev.filter((te) => te.projectId !== id));
    toast.success(`"${projectName}" deleted`, {
      description:
        removedEntries > 0
          ? `${removedEntries} time ${removedEntries === 1 ? 'entry' : 'entries'} also removed`
          : 'No time entries to remove',
    });
  };

  // ---------- time entries ----------

  const addTimeEntry = async (entry: Omit<TimeEntry, 'id'>) => {
    if (blockedWhileViewing()) return;
    const { data, error } = await supabase
      .from('time_entries')
      .insert(timeEntryToRow(entry))
      .select()
      .single();
    if (error) {
      console.error('Error adding time entry:', error.message);
      toast.error('Could not save time entry', { description: error.message });
      return;
    }
    setTimeEntries((prev) => [rowToTimeEntry(data), ...prev]);
    toast.success('Time entry saved');
  };

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
    if (blockedWhileViewing()) return;
    const { data, error } = await supabase
      .from('time_entries')
      .update(timeEntryToRow(updates))
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating time entry:', error.message);
      toast.error('Could not update time entry', { description: error.message });
      return;
    }
    setTimeEntries((prev) => prev.map((te) => (te.id === id ? rowToTimeEntry(data) : te)));
    toast.success('Time entry updated');
  };

  const deleteTimeEntry = async (id: string) => {
    if (blockedWhileViewing()) return;
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) {
      console.error('Error deleting time entry:', error.message);
      toast.error('Could not delete time entry', { description: error.message });
      return;
    }
    setTimeEntries((prev) => prev.filter((te) => te.id !== id));
    toast.success('Time entry deleted');
  };

  // ---------- invoices ----------

  const addInvoice = async (invoice: Omit<Invoice, 'id'>): Promise<Invoice | null> => {
    if (blockedWhileViewing()) return null;
    const { data, error } = await supabase
      .from('invoices')
      .insert(invoiceToRow(invoice, memberBilling?.leadId))
      .select()
      .single();
    if (error) {
      console.error('Error adding invoice:', error.message);
      toast.error('Could not save invoice', { description: error.message });
      return null;
    }
    const created = rowToInvoice(data);
    setInvoices((prev) => [created, ...prev]);
    toast.success('Invoice saved');
    return created;
  };

  const finalizeInvoice = async (id: string, opts: MutationOpts = {}): Promise<boolean> => {
    if (blockedWhileViewing()) return false;
    const data = billingData.current;
    const invoice = data.invoices.find((i) => i.id === id);
    if (!invoice || invoice.status !== 'draft') return false;

    // Re-resolve the still-unbilled entries for this client/period/projects so two
    // overlapping drafts never bill the same hours twice.
    const projectIds = invoice.lineItems.map((li) => li.projectId);
    const entries = getClientEntriesInRange(
      invoice.clientId,
      invoice.periodStart,
      invoice.periodEnd,
      data,
      { onlyUnbilled: true, projectIds }
    );
    // Only the admin bills team hours, on client invoices that include them.
    const billsTeam =
      adminView && !memberBilling && invoice.clientId !== LEAD_CLIENT_ID && !!invoice.includeTeam;
    const teamHours = billsTeam
      ? getClientTeamEntriesInRange(
          invoice.clientId,
          invoice.periodStart,
          invoice.periodEnd,
          data,
          { onlyUnbilled: true, projectIds }
        )
      : [];
    if (entries.length === 0 && teamHours.length === 0) {
      toast.error(`No unbilled hours left for #${formatInvoiceNumber(invoice.invoiceNumber)}`, {
        description: 'These hours may already be on another invoice.',
      });
      return false;
    }
    // Members always bill the lead's current rate for them, even if it changed after the draft.
    const hourlyRate = memberBilling ? memberBilling.hourlyRate : invoice.hourlyRate;
    const currency = memberBilling ? memberBilling.currency : invoice.currency;
    if (memberBilling && hourlyRate <= 0) {
      toast.error('Your hourly rate is not set yet', {
        description: 'Ask your team lead to set it before sending invoices.',
      });
      return false;
    }
    const grouped = groupByProject(entries, data.projects, teamHours);
    const { lineItems, totalHours, totalAmount } = buildLineItems(grouped, hourlyRate);
    const ownIds = entries.map((e) => e.id);
    const teamIds = teamHours.map((e) => e.id);

    // One transaction: the invoice is finalized and its hours locked together, or nothing changes.
    const { data: row, error } = await supabase.rpc('finalize_invoice', {
      p_invoice: id,
      p_line_items: lineItems,
      p_total_hours: totalHours,
      p_total_amount: totalAmount,
      p_hourly_rate: hourlyRate,
      p_currency: currency,
      p_own_entries: ownIds,
      p_team_entries: teamIds,
    });
    if (error || !row) {
      const message = error?.message ?? 'No response from the server.';
      console.error('Error finalizing invoice:', message);
      toast.error('Could not finalize invoice', { description: message });
      return false;
    }

    const finalized = rowToInvoice(row);
    const ownSet = new Set(ownIds);
    const teamSet = new Set(teamIds);
    const markOwn = (list: TimeEntry[]) =>
      list.map((te) => (ownSet.has(te.id) ? { ...te, invoiceId: id } : te));
    const markTeam = (list: TeamTimeEntry[]) =>
      list.map((te) => (teamSet.has(te.id) ? { ...te, leadInvoiceId: id } : te));
    const markInvoice = (list: Invoice[]) => list.map((i) => (i.id === id ? finalized : i));
    // Patch the ref right away for a bulk finalize that continues before the next render.
    billingData.current = {
      ...data,
      invoices: markInvoice(data.invoices),
      timeEntries: markOwn(data.timeEntries),
      teamEntries: markTeam(data.teamEntries),
    };
    setInvoices(markInvoice);
    setTimeEntries(markOwn);
    setTeamEntries(markTeam);
    if (!opts.silent) toast.success('Invoice finalized');
    return true;
  };

  const markInvoicePaid = async (id: string, opts: MutationOpts = {}): Promise<boolean> => {
    if (blockedWhileViewing()) return false;
    if (memberBilling) {
      toast.error('Only your team lead can mark an invoice as paid');
      return false;
    }
    const paidAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('invoices')
      .update(invoiceToRow({ status: 'paid', paidAt }))
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error marking invoice paid:', error.message);
      toast.error('Could not update invoice', { description: error.message });
      return false;
    }
    setInvoices((prev) => prev.map((i) => (i.id === id ? rowToInvoice(data) : i)));
    if (!opts.silent) toast.success('Invoice marked as paid');
    return true;
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    if (blockedWhileViewing()) return;
    const { data, error } = await supabase
      .from('invoices')
      .update(invoiceToRow(updates, memberBilling?.leadId))
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating invoice:', error.message);
      toast.error('Could not update invoice', { description: error.message });
      return;
    }
    setInvoices((prev) => prev.map((i) => (i.id === id ? rowToInvoice(data) : i)));
    toast.success('Invoice updated');
  };

  const deleteInvoice = async (id: string, opts: MutationOpts = {}): Promise<boolean> => {
    if (blockedWhileViewing()) return false;
    if (memberBilling && invoices.find((i) => i.id === id)?.status !== 'draft') {
      toast.error('Sent invoices can only be returned to draft by your team lead');
      return false;
    }
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      console.error('Error deleting invoice:', error.message);
      toast.error('Could not delete invoice', { description: error.message });
      return false;
    }
    // DB sets time_entries.invoice_id / lead_invoice_id to null (on delete set null); mirror locally.
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    setTimeEntries((prev) =>
      prev.map((te) => (te.invoiceId === id ? { ...te, invoiceId: null } : te))
    );
    setTeamEntries((prev) =>
      prev.map((te) => (te.leadInvoiceId === id ? { ...te, leadInvoiceId: null } : te))
    );
    if (!opts.silent) toast.success('Invoice deleted');
    return true;
  };

  // ---------- profile ----------

  const saveProfile = async (next: Profile) => {
    if (blockedWhileViewing()) return;
    if (!userId) return;
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        ...profileToRow(normalizeProfile(next)),
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      console.error('Error saving profile:', error.message);
      toast.error('Could not save profile', { description: error.message });
      return;
    }
    setProfile(rowToProfile(data));
    toast.success('Profile saved');
  };

  // ---------- project assignments (admin) ----------

  const assignProject = async (projectId: string, memberId: string): Promise<boolean> => {
    if (blockedWhileViewing()) return false;
    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: memberId });
    if (error) {
      console.error('Error assigning project:', error.message);
      toast.error('Could not assign the project', { description: error.message });
      return false;
    }
    setAssignments((prev) => [...prev, { projectId, userId: memberId }]);
    toast.success('Project assigned');
    return true;
  };

  const unassignProject = async (projectId: string, memberId: string): Promise<boolean> => {
    if (blockedWhileViewing()) return false;
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', memberId);
    if (error) {
      console.error('Error removing assignment:', error.message);
      toast.error('Could not remove the assignment', { description: error.message });
      return false;
    }
    setAssignments((prev) =>
      prev.filter((a) => !(a.projectId === projectId && a.userId === memberId))
    );
    toast.success('Removed from project');
    return true;
  };

  const setMemberProjects = async (memberId: string, projectIds: string[]): Promise<boolean> => {
    if (blockedWhileViewing()) return false;
    const current = new Set(assignments.filter((a) => a.userId === memberId).map((a) => a.projectId));
    const wanted = new Set(projectIds);
    const toAdd = projectIds.filter((id) => !current.has(id));
    const toRemove = Array.from(current).filter((id) => !wanted.has(id));

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('project_members')
        .insert(toAdd.map((id) => ({ project_id: id, user_id: memberId })));
      if (error) {
        console.error('Error assigning projects:', error.message);
        toast.error('Could not update projects', { description: error.message });
        return false;
      }
    }
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('user_id', memberId)
        .in('project_id', toRemove);
      if (error) {
        console.error('Error removing assignments:', error.message);
        toast.error('Could not update projects', { description: error.message });
        // Keep local state honest about the inserts that did succeed.
        setAssignments((prev) => [...prev, ...toAdd.map((id) => ({ projectId: id, userId: memberId }))]);
        return false;
      }
    }
    setAssignments((prev) => [
      ...prev.filter((a) => !(a.userId === memberId && toRemove.includes(a.projectId))),
      ...toAdd.map((id) => ({ projectId: id, userId: memberId })),
    ]);
    toast.success('Projects updated');
    return true;
  };

  // ---------- invoices received from the team (admin) ----------

  const markTeamInvoicePaid = async (id: string): Promise<boolean> => {
    if (blockedWhileViewing()) return false;
    const { error } = await supabase.rpc('mark_team_invoice_paid', { p_invoice: id });
    if (error) {
      console.error('Error marking team invoice paid:', error.message);
      toast.error('Could not mark the invoice as paid', { description: error.message });
      return false;
    }
    const paidAt = new Date().toISOString();
    setTeamInvoices((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'paid', paidAt } : i))
    );
    toast.success('Invoice marked as paid');
    return true;
  };

  const returnTeamInvoice = async (id: string): Promise<boolean> => {
    if (blockedWhileViewing()) return false;
    const { error } = await supabase.rpc('return_team_invoice', { p_invoice: id });
    if (error) {
      console.error('Error returning team invoice:', error.message);
      toast.error('Could not return the invoice', { description: error.message });
      return false;
    }
    // It is a draft again, which the admin doesn't list.
    setTeamInvoices((prev) => prev.filter((i) => i.id !== id));
    setTeamEntries((prev) =>
      prev.map((te) => (te.invoiceId === id ? { ...te, invoiceId: null } : te))
    );
    toast.success('Invoice returned to draft', {
      description: 'Its hours are unlocked so the team member can fix and resend it.',
    });
    return true;
  };

  // Members log hours only on currently assigned projects; the admin on their own.
  const loggableProjects = ownerIsMember
    ? projects.filter((p) => assignments.some((a) => a.projectId === p.id && a.userId === dataOwnerId))
    : projects;

  // ---------- cities (local autocomplete helper) ----------

  const addCity = (city: string) => {
    if (city && !cities.includes(city)) {
      setCities((prev) => [...prev, city]);
    }
  };

  // ---------- export / import ----------

  const exportData = () => {
    const exportedAt = new Date();
    const state: AppState = {
      version: 2,
      exportedAt: exportedAt.toISOString(),
      clients,
      projects,
      timeEntries,
      cities,
      invoices,
      profile,
      // The team's data is only readable here, so the admin's backup is its only copy outside the
      // database. Kept for reference: importData never writes it back.
      team: adminView
        ? {
            members: teamMembers,
            assignments,
            timeEntries: teamEntries,
            invoices: teamInvoices,
            profiles: teamProfiles,
          }
        : undefined,
    };
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    // Local date and time (to the second), so several backups on the same day don't collide.
    link.download = `time-tracker-backup-${format(exportedAt, 'yyyy-MM-dd_HH-mm-ss')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (data: AppState) => {
    if (blockedWhileViewing()) return;
    if (!data) return;
    try {
      if (data.clients?.length) {
        const rows = data.clients.map((c) => ({ id: c.id, ...clientToRow(c) }));
        const { error } = await supabase.from('clients').upsert(rows);
        if (error) throw error;
      }
      if (data.projects?.length) {
        const rows = data.projects.map((p) => {
          // Older backups carry a single `workType` string instead of `workTypes`.
          const legacy = (p as unknown as { workType?: unknown }).workType;
          const workTypes = normalizeWorkTypes(p.workTypes ?? legacy);
          return {
            id: p.id,
            ...projectToRow({ ...p, workTypes }),
            color: p.color || generateRandomColor(),
          };
        });
        const { error } = await supabase.from('projects').upsert(rows);
        if (error) throw error;
      }
      // Invoices before time entries: time_entries.invoice_id references invoices.
      if (data.invoices?.length) {
        const rows = data.invoices.map((i) => ({ id: i.id, ...invoiceToRow(i) }));
        const { error } = await supabase.from('invoices').upsert(rows);
        if (error) throw error;
      }
      if (data.timeEntries?.length) {
        const rows = data.timeEntries.map((e) => ({ id: e.id, ...timeEntryToRow(e) }));
        const { error } = await supabase.from('time_entries').upsert(rows);
        if (error) throw error;
      }
      if (data.profile && userId) {
        const { error } = await supabase.from('profiles').upsert({
          ...profileToRow(normalizeProfile(data.profile)),
          user_id: userId,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      if (dataOwnerId) await fetchAll(dataOwnerId, ownerIsMember);
      // Team data belongs to the members' accounts: it is never written from a backup.
      toast.success('Data imported', {
        description: data.team
          ? "Your team's data in this backup is kept for reference only and was not imported."
          : undefined,
      });
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Could not import data', {
        description: error instanceof Error ? error.message : 'Check the file and try again.',
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        clients,
        projects,
        timeEntries,
        invoices,
        profile,
        cities,
        loading,
        assignments,
        teamMembers,
        teamEntries,
        loggableProjects,
        memberBilling,
        teamInvoices,
        teamProfiles,
        markTeamInvoicePaid,
        returnTeamInvoice,
        viewAs: effectiveViewAs,
        readOnly,
        adminView,
        startViewAs,
        stopViewAs,
        refreshData,
        assignProject,
        unassignProject,
        setMemberProjects,
        addClient,
        updateClient,
        deleteClient,
        addProject,
        updateProject,
        deleteProject,
        addTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
        addInvoice,
        finalizeInvoice,
        markInvoicePaid,
        updateInvoice,
        deleteInvoice,
        saveProfile,
        addCity,
        exportData,
        importData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
