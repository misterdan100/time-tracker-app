import React, { useState } from 'react';
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

const Projects: React.FC = () => {
  const { clients, projects, addProject, updateProject, deleteProject, timeEntries, cities, addCity } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const filteredProjects = statusFilter === 'All'
    ? projects
    : projects.filter((p) => p.status === statusFilter);

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

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.companyName || 'Unknown Client';
  };

  const getProjectHours = (projectId: string) => {
    const projectEntries = timeEntries.filter((te) => te.projectId === projectId);
    return projectEntries.reduce((total, entry) => total + entry.hours, 0);
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

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Client</TableHead>
              <TableHead className="hidden lg:table-cell">City</TableHead>
              <TableHead className="hidden xl:table-cell">Address</TableHead>
              <TableHead className="hidden lg:table-cell">Work Type</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No projects registered
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
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
