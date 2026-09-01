import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Clock, Calendar, Building2, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import ProjectDialog from '../components/dialogs/ProjectDialog';
import TimeEntryDialog from '../components/dialogs/TimeEntryDialog';
import { TimeEntry } from '../types';
import { SortableHead } from '../components/ui/sortable-head';
import { dateSortValue, SortAccessors, useSort } from '../lib/sort';
import WorkTypeTags from '../components/project/WorkTypeTags';

type EntrySortKey = 'date' | 'hours';

const entryAccessors: SortAccessors<TimeEntry, EntrySortKey> = {
  date: (e) => dateSortValue(e.date),
  hours: (e) => e.hours,
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, clients, timeEntries, deleteTimeEntry, updateProject, updateTimeEntry, cities, addCity } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [timeEntryDialogOpen, setTimeEntryDialogOpen] = useState(false);
  const [editTimeEntry, setEditTimeEntry] = useState<TimeEntry | undefined>(undefined);

  const project = projects.find((p) => p.id === id);
  const client = project ? clients.find((c) => c.id === project.clientId) : null;
  const projectTimeEntries = useMemo(
    () => (project ? timeEntries.filter((te) => te.projectId === project.id) : []),
    [project, timeEntries]
  );
  const {
    sort: entrySort,
    toggle: toggleEntrySort,
    sorted: sortedEntries,
  } = useSort(projectTimeEntries, entryAccessors, { key: 'date', dir: 'desc' });

  const totalHours = projectTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);

  const handleDeleteEntry = (entryId: string) => {
    if (confirm('Are you sure you want to delete this time entry?')) {
      deleteTimeEntry(entryId);
    }
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditTimeEntry(entry);
    setTimeEntryDialogOpen(true);
  };

  const handleSaveTimeEntry = (_entry: Omit<TimeEntry, 'id'>) => {
    // No se usa aquí, solo para crear nuevos
  };

  const handleUpdateTimeEntry = (id: string, entry: Partial<TimeEntry>) => {
    updateTimeEntry(id, entry);
    setTimeEntryDialogOpen(false);
    setEditTimeEntry(undefined);
  };

  const handleEdit = () => {
    setDialogOpen(true);
  };

  const handleSave = (projectData: any) => {
    if (project) {
      updateProject(project.id, projectData);
      setDialogOpen(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleTimeEntryDialogClose = () => {
    setTimeEntryDialogOpen(false);
    setEditTimeEntry(undefined);
  };

  if (!project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Project not found</h1>
        </div>
        <p className="text-muted-foreground">The project you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate sm:text-3xl">{project.name}</h1>
            <p className="text-muted-foreground">Project Details</p>
          </div>
        </div>
        <Button onClick={handleEdit} className="gap-2 w-full sm:w-auto">
          <Pencil className="w-4 h-4" />
          Edit Project
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client?.companyName || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{client?.ownerName || ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">{projectTimeEntries.length} entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.status}</div>
            <WorkTypeTags types={project.workTypes} className="mt-1" />

          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">City</p>
              <p className="text-base">{project.city || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p className="text-base">{project.address || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Work Types</p>
              <WorkTypeTags types={project.workTypes} className="mt-1" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client Email</p>
              <p className="text-base">{client?.email || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Country</p>
              <p className="text-base">{client?.country || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {projectTimeEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No time entries for this project
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead sortKey="date" sort={entrySort} onSort={toggleEntrySort}>
                    Date
                  </SortableHead>
                  <SortableHead sortKey="hours" sort={entrySort} onSort={toggleEntrySort}>
                    Hours
                  </SortableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.date), 'dd/MM/yyyy', { locale: enUS })}
                      </TableCell>
                      <TableCell className="font-medium">{entry.hours.toFixed(2)}h</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEntry(entry)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSave}
        editProject={project}
        clients={clients}
        cities={cities}
        onAddCity={addCity}
      />

      <TimeEntryDialog
        open={timeEntryDialogOpen}
        onOpenChange={handleTimeEntryDialogClose}
        onSave={handleSaveTimeEntry}
        onUpdate={handleUpdateTimeEntry}
        projects={projects}
        editEntry={editTimeEntry}
      />
    </div>
  );
};

export default ProjectDetail;
