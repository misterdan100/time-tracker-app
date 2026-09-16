import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
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
import PageHeader from '../components/layout/PageHeader';
import { Callout } from '../components/ui/callout';
import ProjectTeamCard from '../components/team/ProjectTeamCard';

type EntrySortKey = 'date' | 'loggedBy' | 'hours';

/** A row of the hours table: the viewer's own entry (editable) or a team member's (read-only). */
interface EntryRow {
  id: string;
  date: string;
  hours: number;
  loggedBy: string;
  own: TimeEntry | null;
}

const entryAccessors: SortAccessors<EntryRow, EntrySortKey> = {
  date: (e) => dateSortValue(e.date),
  loggedBy: (e) => e.loggedBy,
  hours: (e) => e.hours,
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    projects,
    loggableProjects,
    clients,
    timeEntries,
    deleteTimeEntry,
    updateProject,
    updateTimeEntry,
    cities,
    addCity,
    adminView,
    readOnly,
    teamEntries,
    teamMembers,
  } = useApp();
  const { membership } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [timeEntryDialogOpen, setTimeEntryDialogOpen] = useState(false);
  const [editTimeEntry, setEditTimeEntry] = useState<TimeEntry | undefined>(undefined);

  const project = projects.find((p) => p.id === id);
  const client = project ? clients.find((c) => c.id === project.clientId) : null;
  const projectTimeEntries = useMemo(
    () => (project ? timeEntries.filter((te) => te.projectId === project.id) : []),
    [project, timeEntries]
  );
  // The admin sees everyone's hours on their project, each tagged with who logged it.
  // Members (and "View as") only ever have their own entries.
  const entryRows = useMemo<EntryRow[]>(() => {
    const ownName = membership?.displayName ? `${membership.displayName} (you)` : 'You';
    const rows: EntryRow[] = projectTimeEntries.map((e) => ({
      id: e.id,
      date: e.date,
      hours: e.hours,
      loggedBy: ownName,
      own: e,
    }));
    if (!adminView || !project) return rows;
    const names = new Map(teamMembers.map((m) => [m.userId, m.displayName || 'Team member']));
    for (const e of teamEntries) {
      if (e.projectId !== project.id) continue;
      rows.push({
        id: e.id,
        date: e.date,
        hours: e.hours,
        loggedBy: names.get(e.userId) ?? 'Team member',
        own: null,
      });
    }
    return rows;
  }, [projectTimeEntries, teamEntries, teamMembers, adminView, project, membership]);

  const {
    sort: entrySort,
    toggle: toggleEntrySort,
    sorted: sortedEntries,
  } = useSort(entryRows, entryAccessors, { key: 'date', dir: 'desc' });

  const ownHours = projectTimeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalHours = entryRows.reduce((sum, entry) => sum + entry.hours, 0);
  const teamHours = totalHours - ownHours;
  const showLoggedBy = entryRows.some((row) => !row.own);
  // Members can only change hours on projects they're still assigned to.
  const canEditEntries = !readOnly && loggableProjects.some((p) => p.id === id);

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
      <PageHeader
        title={project.name}
        subtitle="Project Details"
        onBack={() => navigate('/projects')}
        actions={
          adminView ? (
            <Button onClick={handleEdit} className="gap-2 w-full sm:w-auto">
              <Pencil className="w-4 h-4" />
              Edit Project
            </Button>
          ) : undefined
        }
      />

      {!adminView && !readOnly && !canEditEntries && (
        <Callout tone="info">
          You are no longer assigned to this project. Your hours here are kept but can't be changed.
        </Callout>
      )}

      <div className={`grid gap-6 ${adminView ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {adminView && (
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
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">
              {showLoggedBy
                ? `You ${ownHours.toFixed(2)}h · Team ${teamHours.toFixed(2)}h`
                : `${entryRows.length} entries`}
            </p>
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
            {adminView && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Client Email</p>
                  <p className="text-base">{client?.email || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Country</p>
                  <p className="text-base">{client?.country || 'N/A'}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {adminView && <ProjectTeamCard projectId={project.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entryRows.length === 0 ? (
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
                  {showLoggedBy && (
                    <SortableHead sortKey="loggedBy" sort={entrySort} onSort={toggleEntrySort}>
                      Logged by
                    </SortableHead>
                  )}
                  <SortableHead sortKey="hours" sort={entrySort} onSort={toggleEntrySort}>
                    Hours
                  </SortableHead>
                  {canEditEntries && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.date), 'dd/MM/yyyy', { locale: enUS })}
                      </TableCell>
                      {showLoggedBy && (
                        <TableCell className={entry.own ? 'text-muted-foreground' : 'font-medium'}>
                          {entry.loggedBy}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{entry.hours.toFixed(2)}h</TableCell>
                      {canEditEntries && (
                        <TableCell className="text-right">
                          {/* Team members' hours are read-only for the admin; billed hours are locked for members. */}
                          {entry.own && (adminView || !entry.own.invoiceId) && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditEntry(entry.own!)}
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
                          )}
                        </TableCell>
                      )}
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
        projects={loggableProjects}
        editEntry={editTimeEntry}
      />
    </div>
  );
};

export default ProjectDetail;
