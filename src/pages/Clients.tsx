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
import { SortableHead } from '../components/ui/sortable-head';
import ClientDialog from '../components/dialogs/ClientDialog';
import { Client } from '../types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { SortAccessors, useSort } from '../lib/sort';

type ClientSortKey = 'company' | 'owner' | 'country' | 'email';

const clientAccessors: SortAccessors<Client, ClientSortKey> = {
  company: (c) => c.companyName,
  owner: (c) => c.ownerName,
  country: (c) => c.country,
  email: (c) => c.email,
};

const Clients: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, projects } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const { sort, toggle, sorted } = useSort(clients, clientAccessors, { key: 'company', dir: 'asc' });

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Clients</h1>
          <p className="text-muted-foreground">Manage your clients</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead sortKey="company" sort={sort} onSort={toggle}>
                Company
              </SortableHead>
              <SortableHead sortKey="owner" sort={sort} onSort={toggle} className="hidden sm:table-cell">
                Owner
              </SortableHead>
              <SortableHead sortKey="country" sort={sort} onSort={toggle} className="hidden md:table-cell">
                Country
              </SortableHead>
              <SortableHead sortKey="email" sort={sort} onSort={toggle} className="hidden md:table-cell">
                Email
              </SortableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No clients registered
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/client/${client.id}`}
                      className="font-medium text-green-700 hover:text-green-800 hover:underline dark:text-green-400 dark:hover:text-green-300"
                    >
                      {client.companyName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{client.ownerName}</TableCell>
                  <TableCell className="hidden md:table-cell">{client.country}</TableCell>
                  <TableCell className="hidden md:table-cell">{client.email}</TableCell>
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
