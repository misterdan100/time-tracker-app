import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, Client, Project, TimeEntry } from '../types';

interface AppContextType {
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  cities: string[];
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => void;
  updateTimeEntry: (id: string, entry: Partial<TimeEntry>) => void;
  deleteTimeEntry: (id: string) => void;
  addCity: (city: string) => void;
  exportData: () => void;
  importData: (data: AppState) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'time-tracker-data';

const generateId = (): string => {
  return crypto.randomUUID();
};

const generateRandomColor = (): string => {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Migrate projects without color
        const migratedProjects = data.projects.map((p: Project) => ({
          ...p,
          color: p.color || generateRandomColor(),
          city: p.city || '',
        }));
        // Extract unique cities from projects
        const cities = Array.from(
          new Set(migratedProjects.map((p: Project) => p.city).filter(Boolean))
        );
        return {
          ...data,
          projects: migratedProjects,
          cities: data.cities || cities,
        };
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
        return {
          clients: [],
          projects: [],
          timeEntries: [],
          cities: [],
        };
      }
    }
    return {
      clients: [],
      projects: [],
      timeEntries: [],
      cities: [],
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addClient = (client: Omit<Client, 'id'>) => {
    setState(prev => ({
      ...prev,
      clients: [...prev.clients, { ...client, id: generateId() }],
    }));
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setState(prev => ({
      ...prev,
      clients: prev.clients.map(c => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const deleteClient = (id: string) => {
    setState(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c.id !== id),
    }));
  };

  const addProject = (project: Omit<Project, 'id'>) => {
    setState(prev => ({
      ...prev,
      projects: [...prev.projects, { ...project, id: generateId(), color: generateRandomColor() }],
    }));
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(p => (p.id === id ? { ...p, ...updates } : p)),
    }));
  };

  const deleteProject = (id: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
      timeEntries: prev.timeEntries.filter(te => te.projectId !== id),
    }));
  };

  const addTimeEntry = (entry: Omit<TimeEntry, 'id'>) => {
    setState(prev => ({
      ...prev,
      timeEntries: [...prev.timeEntries, { ...entry, id: generateId() }],
    }));
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setState(prev => ({
      ...prev,
      timeEntries: prev.timeEntries.map(te => (te.id === id ? { ...te, ...updates } : te)),
    }));
  };

  const deleteTimeEntry = (id: string) => {
    setState(prev => ({
      ...prev,
      timeEntries: prev.timeEntries.filter(te => te.id !== id),
    }));
  };

  const addCity = (city: string) => {
    if (city && !state.cities.includes(city)) {
      setState(prev => ({
        ...prev,
        cities: [...prev.cities, city],
      }));
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (data: AppState) => {
    setState(data);
  };

  return (
    <AppContext.Provider
      value={{
        clients: state.clients,
        projects: state.projects,
        timeEntries: state.timeEntries,
        cities: state.cities,
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
