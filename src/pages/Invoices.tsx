import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { SortableHead } from '../components/ui/sortable-head';
import { dateSortValue, SortAccessors, useSort } from '../lib/sort';
import StatCard from '../components/dashboard/StatCard';
import InvoiceStatusBadge from '../components/invoice/InvoiceStatusBadge';
import InvoiceDialog from '../components/dialogs/InvoiceDialog';
import { downloadInvoice } from '../lib/downloadInvoice';
import { formatCurrency, formatInvoiceNumber } from '../lib/invoiceUtils';
import { isProfileComplete } from '../lib/profileUtils';
import { Invoice, InvoiceStatus } from '../types';
import {
  FileText,
  Clock,
  FileEdit,
  Plus,
  Download,
  Trash2,
  Eye,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmt = (iso: string) => {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
};

type InvoiceSortKey = 'number' | 'client' | 'period' | 'hours' | 'amount' | 'status';

const ALL_CLIENTS = 'all';
const STATUS_RANK: Record<InvoiceStatus, number> = { draft: 0, finalized: 1, paid: 2 };

const Invoices: React.FC = () => {
  const { invoices, clients, profile, deleteInvoice } = useApp();
  const navigate = useNavigate();
  const profileComplete = isProfileComplete(profile);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [clientFilter, setClientFilter] = useState<string>(ALL_CLIENTS);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const openNew = () => {
    if (!profileComplete) {
      toast.error('Complete your studio profile to create invoices', {
        description: 'Add your studio and payment details first.',
      });
      navigate('/profile');
      return;
    }
    setEditTarget(null);
    setDialogOpen(true);
  };
  const openEdit = (invoice: Invoice) => {
    setEditTarget(invoice);
    setDialogOpen(true);
  };
  const handleDialogChange = (next: boolean) => {
    setDialogOpen(next);
    if (!next) setEditTarget(null);
  };

  const getClientName = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.companyName ?? 'Unknown client';

  const filtered = useMemo(
    () =>
      invoices.filter(
        (i) =>
          (statusFilter === 'All' || i.status === statusFilter) &&
          (clientFilter === ALL_CLIENTS || i.clientId === clientFilter)
      ),
    [invoices, statusFilter, clientFilter]
  );

  const accessors = useMemo<SortAccessors<Invoice, InvoiceSortKey>>(
    () => ({
      number: (i) => parseInt((i.invoiceNumber ?? '').replace(/\D/g, ''), 10) || 0,
      client: (i) => clients.find((c) => c.id === i.clientId)?.companyName ?? '',
      period: (i) => dateSortValue(i.periodEnd),
      hours: (i) => i.totalHours,
      amount: (i) => i.totalAmount,
      status: (i) => STATUS_RANK[i.status] ?? 0,
    }),
    [clients]
  );
  const { sort, toggle, sorted } = useSort(filtered, accessors, { key: 'period', dir: 'desc' });

  const draftCount = invoices.filter((i) => i.status === 'draft').length;
  const outstanding = invoices.filter((i) => i.status === 'finalized');

  // Sum outstanding amounts per currency (avoids mixing currencies in one total).
  const outstandingByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    outstanding.forEach((i) => map.set(i.currency, (map.get(i.currency) ?? 0) + i.totalAmount));
    return Array.from(map.entries());
  }, [outstanding]);

  const handleDownload = async (invoice: Invoice) => {
    try {
      await downloadInvoice(invoice, clients.find((c) => c.id === invoice.clientId), profile);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Could not generate the PDF');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteInvoice(deleteTarget.id);
    setDeleteTarget(null);
  };

  const statusOptions: Array<InvoiceStatus | 'All'> = ['All', 'draft', 'finalized', 'paid'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Invoices</h1>
          <p className="text-muted-foreground">Bill clients for hours worked</p>
        </div>
        <Button onClick={openNew} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {!profileComplete && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Complete your studio profile to start creating invoices.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => navigate('/profile')}
          >
            Go to profile
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total invoices" value={invoices.length} icon={FileText} tint="blue" />
        <StatCard
          label="Outstanding"
          value={outstanding.length}
          icon={Clock}
          tint="orange"
          hint={
            outstandingByCurrency.length > 0
              ? outstandingByCurrency
                  .map(([cur, amt]) => formatCurrency(amt, cur))
                  .join(' · ')
              : undefined
          }
        />
        <StatCard label="Drafts" value={draftCount} icon={FileEdit} tint="beige" />
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
                className="capitalize"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label htmlFor="invoice-client-filter" className="text-sm font-medium">
            Client:
          </label>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger id="invoice-client-filter" className="w-full sm:w-56">
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
              <SortableHead sortKey="number" sort={sort} onSort={toggle}>
                Number
              </SortableHead>
              <SortableHead sortKey="client" sort={sort} onSort={toggle} className="hidden md:table-cell">
                Client
              </SortableHead>
              <SortableHead sortKey="period" sort={sort} onSort={toggle} className="hidden lg:table-cell">
                Period
              </SortableHead>
              <SortableHead sortKey="hours" sort={sort} onSort={toggle} className="hidden sm:table-cell">
                Hours
              </SortableHead>
              <SortableHead sortKey="amount" sort={sort} onSort={toggle}>
                Amount
              </SortableHead>
              <SortableHead sortKey="status" sort={sort} onSort={toggle}>
                Status
              </SortableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {invoices.length === 0
                    ? 'No invoices yet. Create your first one.'
                    : 'No invoices match these filters.'}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/invoice/${invoice.id}`}
                      className="font-medium text-green-700 hover:text-green-800 hover:underline dark:text-green-400 dark:hover:text-green-300"
                    >
                      #{formatInvoiceNumber(invoice.invoiceNumber)}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link
                      to={`/client/${invoice.clientId}`}
                      className="font-medium text-green-700 hover:text-green-800 hover:underline dark:text-green-400 dark:hover:text-green-300"
                    >
                      {getClientName(invoice.clientId)}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap lg:table-cell">
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
                      {invoice.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => openEdit(invoice)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download PDF"
                        onClick={() => handleDownload(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => setDeleteTarget(invoice)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        editInvoice={editTarget}
        onCreated={(invoice) => navigate(`/invoice/${invoice.id}`)}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete invoice?</DialogTitle>
            <DialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold text-foreground">
                #{deleteTarget ? formatInvoiceNumber(deleteTarget.invoiceNumber) : ''}
              </span>
              .
              {deleteTarget && deleteTarget.status !== 'draft'
                ? ' Its hours will be released back to uninvoiced.'
                : ''}{' '}
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

export default Invoices;
