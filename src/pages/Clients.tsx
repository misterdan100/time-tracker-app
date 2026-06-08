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
import ClientDialog from '../components/dialogs/ClientDialog';
import { Client } from '../types';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const Clients: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, projects } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const handleSave = (clientData: Omit<Client, 'id'>) => {
    if (editClient) {
      updateClient(editClient.id, clientData);
      setEditClient(null);
    } else {
      addClient(clientData);
    }
  };

  const handleEdit = (client: Client) => {
    setEditClient(client);
    setDialogOpen(true);
  };

  const handleDelete = (clientId: string) => {
    const hasProjects = projects.some((p) => p.clientId === clientId);
    if (hasProjects) {
      alert('You cannot delete this client because it has associated projects.');
      return;
    }
    if (confirm('Are you sure you want to delete this client?')) {
      deleteClient(clientId);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditClient(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">Manage your clients</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No clients registered
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/client/${client.id}`}
                      className="hover:underline text-primary"
                    >
                      {client.companyName}
                    </Link>
                  </TableCell>
                  <TableCell>{client.ownerName}</TableCell>
                  <TableCell>{client.country}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(client)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(client.id)}
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

      <ClientDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSave}
        editClient={editClient}
      />
    </div>
  );
};

export default Clients;
