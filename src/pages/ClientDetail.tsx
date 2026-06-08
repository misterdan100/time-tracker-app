import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { ArrowLeft, Building2, MapPin, Pencil } from 'lucide-react';
import ClientDialog from '../components/dialogs/ClientDialog';

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, projects, timeEntries, updateClient } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);

  const client = clients.find((c) => c.id === id);
  const clientProjects = client
    ? projects.filter((p) => p.clientId === client.id)
    : [];

  const getProjectHours = (projectId: string) => {
    const projectEntries = timeEntries.filter((te) => te.projectId === projectId);
    return projectEntries.reduce((total, entry) => total + entry.hours, 0);
  };

  const handleEdit = () => {
    setDialogOpen(true);
  };

  const handleSave = (clientData: any) => {
    if (client) {
      updateClient(client.id, clientData);
      setDialogOpen(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  if (!client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Client not found</h1>
        </div>
        <p className="text-muted-foreground">The client you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/clients')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate sm:text-3xl">{client.companyName}</h1>
            <p className="text-muted-foreground">Client Details</p>
          </div>
        </div>
        <Button onClick={handleEdit} className="gap-2 w-full sm:w-auto">
          <Pencil className="w-4 h-4" />
          Edit Client
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.ownerName}</div>
            <p className="text-xs text-muted-foreground">Owner</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientProjects.length}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Country</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.country}</div>
            <p className="text-xs text-muted-foreground">Location</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Company Name</p>
              <p className="text-base">{client.companyName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Owner Name</p>
              <p className="text-base">{client.ownerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{client.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Country</p>
              <p className="text-base">{client.country}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {clientProjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              This client has no registered projects
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">City</TableHead>
                  <TableHead className="hidden lg:table-cell">Address</TableHead>
                  <TableHead className="hidden sm:table-cell">Work Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/project/${project.id}`}
                        className="hover:underline text-primary"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{project.city || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{project.address || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{project.workType}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : project.status === 'Paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {project.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{getProjectHours(project.id).toFixed(2)}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSave}
        editClient={client}
      />
    </div>
  );
};

export default ClientDetail;
