export type Country = 'Colombia' | 'US';
export type WorkType = 'Blueprints' | '3D Modeling' | 'Site Visit' | 'Consulting' | 'Other';
export type ProjectStatus = 'Active' | 'Paused' | 'Completed';

export interface Client {
  id: string;
  companyName: string;
  ownerName: string;
  country: Country;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  city: string;
  clientId: string;
  workType: WorkType;
  status: ProjectStatus;
  color: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  date: string; // ISO format
  hours: number;
}

export interface AppState {
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  cities: string[];
}
