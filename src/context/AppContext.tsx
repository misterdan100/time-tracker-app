import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { AppState, Client, Project, TimeEntry } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AppContextType {
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  cities: string[];
  loading: boolean;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<void>;
  updateTimeEntry: (id: string, entry: Partial<TimeEntry>) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;
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
});

const clientToRow = (c: Partial<Client>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (c.companyName !== undefined) row.company_name = c.companyName;
  if (c.ownerName !== undefined) row.owner_name = c.ownerName;
  if (c.country !== undefined) row.country = c.country;
  if (c.email !== undefined) row.email = c.email;
  return row;
};

const rowToProject = (r: any): Project => ({
  id: r.id,
  name: r.name,
  address: r.address,
  city: r.city,
  clientId: r.client_id,
  workType: r.work_type,
  status: r.status,
  color: r.color,
});

const projectToRow = (p: Partial<Project>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.address !== undefined) row.address = p.address;
  if (p.city !== undefined) row.city = p.city;
  if (p.clientId !== undefined) row.client_id = p.clientId;
  if (p.workType !== undefined) row.work_type = p.workType;
  if (p.status !== undefined) row.status = p.status;
  if (p.color !== undefined) row.color = p.color;
  return row;
};

const rowToTimeEntry = (r: any): TimeEntry => ({
  id: r.id,
  projectId: r.project_id,
  date: r.date,
  hours: Number(r.hours),
});

const timeEntryToRow = (e: Partial<TimeEntry>): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (e.projectId !== undefined) row.project_id = e.projectId;
  if (e.date !== undefined) row.date = e.date;
  if (e.hours !== undefined) row.hours = e.hours;
  return row;
};

const citiesFromProjects = (projects: Project[]): string[] =>
  Array.from(new Set(projects.map((p) => p.city).filter(Boolean)));

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [clientsRes, projectsRes, entriesRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: true }),
      supabase.from('projects').select('*').order('created_at', { ascending: true }),
      supabase.from('time_entries').select('*').order('date', { ascending: false }),
    ]);

    if (clientsRes.error) console.error('Error loading clients:', clientsRes.error.message);
    if (projectsRes.error) console.error('Error loading projects:', projectsRes.error.message);
    if (entriesRes.error) console.error('Error loading time entries:', entriesRes.error.message);

    const loadedProjects = (projectsRes.data ?? []).map(rowToProject);
    setClients((clientsRes.data ?? []).map(rowToClient));
    setProjects(loadedProjects);
    setTimeEntries((entriesRes.data ?? []).map(rowToTimeEntry));
    setCities(citiesFromProjects(loadedProjects));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAll();
    } else {
      setClients([]);
      setProjects([]);
      setTimeEntries([]);
      setCities([]);
    }
  }, [isAuthenticated, fetchAll]);

  // ---------- clients ----------

  const addClient = async (client: Omit<Client, 'id'>) => {
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
    toast.success('Client deleted');
  };

  // ---------- projects ----------

  const addProject = async (project: Omit<Project, 'id'>) => {
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
    toast.success(`"${projectName}" deleted`, {
      description:
        removedEntries > 0
          ? `${removedEntries} time ${removedEntries === 1 ? 'entry' : 'entries'} also removed`
          : 'No time entries to remove',
    });
  };

  // ---------- time entries ----------

  const addTimeEntry = async (entry: Omit<TimeEntry, 'id'>) => {
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
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) {
      console.error('Error deleting time entry:', error.message);
      toast.error('Could not delete time entry', { description: error.message });
      return;
    }
    setTimeEntries((prev) => prev.filter((te) => te.id !== id));
    toast.success('Time entry deleted');
  };

  // ---------- cities (local autocomplete helper) ----------

  const addCity = (city: string) => {
    if (city && !cities.includes(city)) {
      setCities((prev) => [...prev, city]);
    }
  };

  // ---------- export / import ----------

  const exportData = () => {
    const state: AppState = { clients, projects, timeEntries, cities };
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (data: AppState) => {
    if (!data) return;
    try {
      if (data.clients?.length) {
        const rows = data.clients.map((c) => ({ id: c.id, ...clientToRow(c) }));
        const { error } = await supabase.from('clients').upsert(rows);
        if (error) throw error;
      }
      if (data.projects?.length) {
        const rows = data.projects.map((p) => ({
          id: p.id,
          ...projectToRow(p),
          color: p.color || generateRandomColor(),
        }));
        const { error } = await supabase.from('projects').upsert(rows);
        if (error) throw error;
      }
      if (data.timeEntries?.length) {
        const rows = data.timeEntries.map((e) => ({ id: e.id, ...timeEntryToRow(e) }));
        const { error } = await supabase.from('time_entries').upsert(rows);
        if (error) throw error;
      }
      await fetchAll();
      toast.success('Data imported');
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
        cities,
        loading,
        addClient,
        updateClient,
        deleteClient,
        addProject,
        updateProject,
        deleteProject,
        addTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
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
