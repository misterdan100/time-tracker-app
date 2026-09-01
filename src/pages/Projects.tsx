import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { SortableHead } from '../components/ui/sortable-head';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import ProjectDialog from '../components/dialogs/ProjectDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Project, ProjectStatus } from '../types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { dateSortValue, SortAccessors, useSort } from '../lib/sort';

type ProjectSortKey = 'name' | 'client' | 'city' | 'address' | 'workType' | 'status' | 'hours' | 'created';

const ALL_CLIENTS = 'all';

const Projects: React.FC = () => {
  const { clients, projects, addProject, updateProject, deleteProject, timeEntries, cities, addCity } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [clientFilter, setClientFilter] = useState<string>(ALL_CLIENTS);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.companyName || 'Unknown Client';
  };

  const hoursByProject = useMemo(() => {
    const map = new Map<string, number>();
    timeEntries.forEach((te) => map.set(te.projectId, (map.get(te.projectId) ?? 0) + te.hours));
    return map;
  }, [timeEntries]);
  const getProjectHours = (projectId: string) => hoursByProject.get(projectId) ?? 0;

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          (statusFilter === 'All' || p.status === statusFilter) &&
          (clientFilter === ALL_CLIENTS || p.clientId === clientFilter)
      ),
    [projects, statusFilter, clientFilter]
  );

  // Projects arrive oldest-first from the API, so the index stands in for created_at when missing.
  const indexById = useMemo(() => new Map(projects.map((p, i) => [p.id, i])), [projects]);
  const accessors = useMemo<SortAccessors<Project, ProjectSortKey>>(
    () => ({
      name: (p) => p.name,
      client: (p) => getClientName(p.clientId),
      city: (p) => p.city,
      address: (p) => p.address,
      workType: (p) => p.workType,
      status: (p) => p.status,
      hours: (p) => getProjectHours(p.id),
      created: (p) => dateSortValue(p.createdAt) ?? indexById.get(p.id) ?? 0,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clients, hoursByProject, indexById]
  );
  const { sort, toggle, sorted } = useSort(filteredProjects, accessors, {
    key: 'created',
    dir: 'desc',
  });

  const handleSave = (projectData: Omit<Project, 'id'>) => {
    if (editProject) {
      updateProject(editProject.id, projectData);
      setEditProject(null);
    } else {
      addProject(projectData);
    }
  };

  const handleEdit = (project: Project) => {
    setEditProject(project);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
  };

  const deleteEntryCount = deleteTarget
    ? timeEntries.filter((te) => te.projectId === deleteTarget.id).length
    : 0;

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditProject(null);
  };

  const statusOptions: Array<ProjectStatus | 'All'> = ['All', 'Active', 'Paused', 'Completed'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Projects</h1>
          <p className="text-muted-foreground">Manage your projects</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Project
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label className="text-sm font-medium">Filter by status:</label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label htmlFor="project-client-filter" className="text-sm font-medium">
            Client:
          </label>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger id="project-client-filter" className="w-full sm:w-56">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLIENTS}>All clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead sortKey="name" sort={sort} onSort={toggle}>
                Name
              </SortableHead>
              <SortableHead sortKey="client" sort={sort} onSort={toggle} className="hidden md:table-cell">
                Client
              </SortableHead>
              <SortableHead sortKey="city" sort={sort} onSort={toggle} className="hidden lg:table-cell">
                City
              </SortableHead>
              <SortableHead sortKey="address" sort={sort} onSort={toggle} className="hidden xl:table-cell">
                Address
              </SortableHead>
              <SortableHead sortKey="workType" sort={sort} onSort={toggle} className="hidden lg:table-cell">
                Work Type
              </SortableHead>
              <SortableHead sortKey="status" sort={sort} onSort={toggle} className="hidden sm:table-cell">
                Status
              </SortableHead>
              <SortableHead sortKey="hours" sort={sort} onSort={toggle}>
                Hours
              </SortableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {projects.length === 0 ? 'No projects registered' : 'No projects match these filters'}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/project/${project.id}`}
                      className="font-medium text-green-700 hover:text-green-800 hover:underline dark:text-green-400 dark:hover:text-green-300"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      to={`/client/${project.clientId}`}
                      className="font-medium text-green-700 hover:text-green-800 hover:underline dark:text-green-400 dark:hover:text-green-300"
                    >
                      {getClientName(project.clientId)}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{project.city || '-'}</TableCell>
                  <TableCell className="hidden xl:table-cell">{project.address || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{project.workType}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'Active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300'
                          : project.status === 'Paused'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300'
                      }`}
                    >
                      {project.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{getProjectHours(project.id).toFixed(2)}h</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(project)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(project)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSave}
        editProject={editProject}
        clients={clients}
        cities={cities}
        onAddCity={addCity}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>
              {deleteEntryCount > 0
                ? ` and its ${deleteEntryCount} time ${
                    deleteEntryCount === 1 ? 'entry' : 'entries'
                  }.`
                : '.'}{' '}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
