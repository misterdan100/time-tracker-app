import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
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
import StatCard from '../components/dashboard/StatCard';
import InvoiceStatusBadge from '../components/invoice/InvoiceStatusBadge';
import InvoiceDialog from '../components/dialogs/InvoiceDialog';
import ClientDialog from '../components/dialogs/ClientDialog';
import { downloadInvoice } from '../lib/downloadInvoice';
import {
  clientInvoices,
  computeUnbilled,
  formatCurrency,
  formatInvoiceNumber,
  lastInvoicedPeriodEnd,
} from '../lib/invoiceUtils';
import { isProfileComplete } from '../lib/profileUtils';
import { Invoice, InvoiceStatus, Project } from '../types';
import { SortableHead } from '../components/ui/sortable-head';
import { dateSortValue, SortAccessors, useSort } from '../lib/sort';
import {
  ArrowLeft,
  Building2,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Plus,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return '—';
  }
};

type InvoiceSortKey = 'number' | 'period' | 'hours' | 'amount' | 'status';
type ProjectSortKey = 'name' | 'city' | 'address' | 'workType' | 'status' | 'hours';

const STATUS_RANK: Record<InvoiceStatus, number> = { draft: 0, finalized: 1, paid: 2 };

const invoiceAccessors: SortAccessors<Invoice, InvoiceSortKey> = {
  number: (i) => parseInt((i.invoiceNumber ?? '').replace(/\D/g, ''), 10) || 0,
  period: (i) => dateSortValue(i.periodEnd),
  hours: (i) => i.totalHours,
  amount: (i) => i.totalAmount,
  status: (i) => STATUS_RANK[i.status] ?? 0,
};

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, projects, timeEntries, invoices, profile, updateClient } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const client = clients.find((c) => c.id === id);
  const clientProjects = useMemo(
    () => (client ? projects.filter((p) => p.clientId === client.id) : []),
    [client, projects]
  );
  const myInvoices = useMemo(
    () => (client ? clientInvoices(client.id, invoices) : []),
    [client, invoices]
  );

  const hoursByProject = useMemo(() => {
    const map = new Map<string, number>();
    timeEntries.forEach((te) => map.set(te.projectId, (map.get(te.projectId) ?? 0) + te.hours));
    return map;
  }, [timeEntries]);
  const getProjectHours = (projectId: string) => hoursByProject.get(projectId) ?? 0;

  const projectAccessors = useMemo<SortAccessors<Project, ProjectSortKey>>(
    () => ({
      name: (p) => p.name,
      city: (p) => p.city,
      address: (p) => p.address,
      workType: (p) => p.workType,
      status: (p) => p.status,
      hours: (p) => hoursByProject.get(p.id) ?? 0,
    }),
    [hoursByProject]
  );

  const {
    sort: invoiceSort,
    toggle: toggleInvoiceSort,
    sorted: sortedInvoices,
  } = useSort(myInvoices, invoiceAccessors, { key: 'period', dir: 'desc' });
  const {
    sort: projectSort,
    toggle: toggleProjectSort,
    sorted: sortedProjects,
  } = useSort(clientProjects, projectAccessors, { key: 'name', dir: 'asc' });

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

  const handleDownload = async (invoice: Invoice) => {
    try {
      await downloadInvoice(invoice, client, profile);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Could not generate the PDF');
    }
  };

  const handleNewInvoice = () => {
    if (!isProfileComplete(profile)) {
      toast.error('Complete your studio profile to create invoices', {
        description: 'Add your studio and payment details first.',
      });
      navigate('/profile');
      return;
    }
    setInvoiceDialogOpen(true);
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

  const unbilled = computeUnbilled(client.id, { projects, timeEntries });
  const unbilledAmount = unbilled.hours * (client.defaultRate || 0);
  const lastEnd = lastInvoicedPeriodEnd(client.id, invoices);

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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button onClick={handleNewInvoice} className="w-full gap-2 sm:w-auto">
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
          <Button variant="outline" onClick={handleEdit} className="w-full gap-2 sm:w-auto">
            <Pencil className="w-4 h-4" />
            Edit Client
          </Button>
        </div>
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

      {/* Billing overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Unbilled hours"
          value={`${unbilled.hours.toFixed(2)}h`}
          icon={Clock}
          tint="orange"
          hint={
            unbilled.earliestDate
              ? `${fmt(unbilled.earliestDate)} – ${fmt(unbilled.latestDate)}`
              : undefined
          }
        />
        <StatCard
          label="Uninvoiced amount"
          value={client.defaultRate ? formatCurrency(unbilledAmount, client.currency) : '—'}
          icon={DollarSign}
          tint="beige"
          hint={
            client.defaultRate
              ? `@ ${formatCurrency(client.defaultRate, client.currency)}/h`
              : 'Set a default rate'
          }
        />
        <StatCard
          label="Last invoice"
          value={lastEnd ? fmt(lastEnd) : '—'}
          icon={FileText}
          tint="blue"
          hint={lastEnd ? 'period end' : 'none yet'}
        />
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
            <div>
              <p className="text-sm font-medium text-muted-foreground">Default rate</p>
              <p className="text-base">
                {client.defaultRate
                  ? `${formatCurrency(client.defaultRate, client.currency)} / h`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Currency</p>
              <p className="text-base">{client.currency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {myInvoices.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No invoices generated for this client yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead sortKey="number" sort={invoiceSort} onSort={toggleInvoiceSort}>
                    Number
                  </SortableHead>
                  <SortableHead
                    sortKey="period"
                    sort={invoiceSort}
                    onSort={toggleInvoiceSort}
                    className="hidden md:table-cell"
                  >
                    Period
                  </SortableHead>
                  <SortableHead
                    sortKey="hours"
                    sort={invoiceSort}
                    onSort={toggleInvoiceSort}
                    className="hidden sm:table-cell"
                  >
                    Hours
                  </SortableHead>
                  <SortableHead sortKey="amount" sort={invoiceSort} onSort={toggleInvoiceSort}>
                    Amount
                  </SortableHead>
                  <SortableHead sortKey="status" sort={invoiceSort} onSort={toggleInvoiceSort}>
                    Status
                  </SortableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/invoice/${invoice.id}`}
                        className="font-medium text-green-700 hover:text-green-800 hover:underline dark:text-green-400 dark:hover:text-green-300"
                      >
                        #{formatInvoiceNumber(invoice.invoiceNumber)}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap md:table-cell">
                      {fmt(invoice.periodStart)} – {fmt(invoice.periodEnd)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {invoice.totalHours.toFixed(2)}h
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.totalAmount, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View"
                          onClick={() => navigate(`/invoice/${invoice.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download PDF"
                          onClick={() => handleDownload(invoice)}
                        >
                          <Download className="h-4 w-4" />
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
                  <SortableHead sortKey="name" sort={projectSort} onSort={toggleProjectSort}>
                    Name
                  </SortableHead>
                  <SortableHead
                    sortKey="city"
                    sort={projectSort}
                    onSort={toggleProjectSort}
                    className="hidden md:table-cell"
                  >
                    City
                  </SortableHead>
                  <SortableHead
                    sortKey="address"
                    sort={projectSort}
                    onSort={toggleProjectSort}
                    className="hidden lg:table-cell"
                  >
                    Address
                  </SortableHead>
                  <SortableHead
                    sortKey="workType"
                    sort={projectSort}
                    onSort={toggleProjectSort}
                    className="hidden sm:table-cell"
                  >
                    Work Type
                  </SortableHead>
                  <SortableHead sortKey="status" sort={projectSort} onSort={toggleProjectSort}>
                    Status
                  </SortableHead>
                  <SortableHead sortKey="hours" sort={projectSort} onSort={toggleProjectSort}>
                    Hours
                  </SortableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/project/${project.id}`}
                        className="font-medium text-green-700 hover:text-green-800 hover:underline dark:text-green-400 dark:hover:text-green-300"
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

      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        lockedClientId={client.id}
        onCreated={(invoice) => navigate(`/invoice/${invoice.id}`)}
      />
    </div>
  );
};

export default ClientDetail;
