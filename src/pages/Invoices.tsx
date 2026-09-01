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
  FileCheck,
  CheckCircle2,
  X,
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

type BulkAction = 'finalize' | 'paid' | 'download' | 'delete';

const Invoices: React.FC = () => {
  const { invoices, clients, profile, deleteInvoice, finalizeInvoice, markInvoicePaid } = useApp();
  const navigate = useNavigate();
  const profileComplete = isProfileComplete(profile);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [clientFilter, setClientFilter] = useState<string>(ALL_CLIENTS);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  // Bulk selection (ids); only the currently visible (filtered) rows count.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkConfirm, setBulkConfirm] = useState<null | 'finalize' | 'delete'>(null);
  const [bulkBusy, setBulkBusy] = useState<BulkAction | null>(null);

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

  // ----- bulk selection -----
  const visibleSelected = sorted.filter((i) => selected.has(i.id));
  const allVisibleSelected = sorted.length > 0 && visibleSelected.length === sorted.length;
  const someVisibleSelected = visibleSelected.length > 0 && !allVisibleSelected;
  const selectedDrafts = visibleSelected.filter((i) => i.status === 'draft');
  const selectedFinalized = visibleSelected.filter((i) => i.status === 'finalized');

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) sorted.forEach((i) => next.delete(i.id));
      else sorted.forEach((i) => next.add(i.id));
      return next;
    });
  const clearSelection = () => setSelected(new Set());

  const runBulk = async (
    action: BulkAction,
    targets: Invoice[],
    fn: (invoice: Invoice) => Promise<boolean>,
    label: { done: string; failed: string }
  ) => {
    if (targets.length === 0 || bulkBusy) return;
    setBulkBusy(action);
    let ok = 0;
    for (const inv of targets) {
      // Sequential on purpose: keeps DB writes ordered and avoids a burst of parallel downloads.
      if (await fn(inv)) ok += 1;
    }
    setBulkBusy(null);
    setBulkConfirm(null);
    const failed = targets.length - ok;
    if (ok > 0) toast.success(`${ok} ${ok === 1 ? 'invoice' : 'invoices'} ${label.done}`);
    if (failed > 0) toast.error(`${failed} ${failed === 1 ? 'invoice' : 'invoices'} ${label.failed}`);
    if (action !== 'download') clearSelection();
  };

  const bulkFinalize = () =>
    runBulk('finalize', selectedDrafts, (i) => finalizeInvoice(i.id, { silent: true }), {
      done: 'finalized',
      failed: 'could not be finalized',
    });
  const bulkMarkPaid = () =>
    runBulk('paid', selectedFinalized, (i) => markInvoicePaid(i.id, { silent: true }), {
      done: 'marked as paid',
      failed: 'could not be updated',
    });
  const bulkDelete = () =>
    runBulk('delete', visibleSelected, (i) => deleteInvoice(i.id, { silent: true }), {
      done: 'deleted',
      failed: 'could not be deleted',
    });
  const bulkDownload = () =>
    runBulk(
      'download',
      visibleSelected,
      async (i) => {
        try {
          await downloadInvoice(i, clients.find((c) => c.id === i.clientId), profile);
          return true;
        } catch (err) {
          console.error('Error generating PDF:', err);
          return false;
        }
      },
      { done: 'downloaded', failed: 'could not be downloaded' }
    );

  const selectedNonDraftCount = visibleSelected.filter((i) => i.status !== 'draft').length;

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

      {visibleSelected.length > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {visibleSelected.length} selected
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={!!bulkBusy}>
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkConfirm('finalize')}
              disabled={!!bulkBusy || selectedDrafts.length === 0}
              title={
                selectedDrafts.length === 0
                  ? 'Select at least one draft'
                  : `Finalize ${selectedDrafts.length} draft${selectedDrafts.length === 1 ? '' : 's'}`
              }
            >
              <FileCheck className="mr-1 h-4 w-4" />
              Finalize{selectedDrafts.length > 0 ? ` (${selectedDrafts.length})` : ''}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={bulkMarkPaid}
              disabled={!!bulkBusy || selectedFinalized.length === 0}
              title={
                selectedFinalized.length === 0
                  ? 'Select at least one finalized invoice'
                  : `Mark ${selectedFinalized.length} as paid`
              }
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {bulkBusy === 'paid' ? 'Updating…' : 'Mark paid'}
              {bulkBusy !== 'paid' && selectedFinalized.length > 0 ? ` (${selectedFinalized.length})` : ''}
            </Button>
            <Button variant="outline" size="sm" onClick={bulkDownload} disabled={!!bulkBusy}>
              <Download className="mr-1 h-4 w-4" />
              {bulkBusy === 'download' ? 'Generating…' : 'Download PDFs'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirm('delete')}
              disabled={!!bulkBusy}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pr-0">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  aria-label={allVisibleSelected ? 'Deselect all invoices' : 'Select all invoices'}
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={toggleAllVisible}
                  disabled={sorted.length === 0 || !!bulkBusy}
                />
              </TableHead>
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
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  {invoices.length === 0
                    ? 'No invoices yet. Create your first one.'
                    : 'No invoices match these filters.'}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((invoice) => (
                <TableRow key={invoice.id} data-state={selected.has(invoice.id) ? 'selected' : undefined}>
                  <TableCell className="w-10 pr-0">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      aria-label={`Select invoice #${formatInvoiceNumber(invoice.invoiceNumber)}`}
                      checked={selected.has(invoice.id)}
                      onChange={() => toggleOne(invoice.id)}
                      disabled={!!bulkBusy}
                    />
                  </TableCell>
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

      {/* Bulk confirm (finalize / delete) */}
      <Dialog open={!!bulkConfirm} onOpenChange={(open) => !open && !bulkBusy && setBulkConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkConfirm === 'finalize'
                ? `Finalize ${selectedDrafts.length} ${selectedDrafts.length === 1 ? 'draft' : 'drafts'}?`
                : `Delete ${visibleSelected.length} ${visibleSelected.length === 1 ? 'invoice' : 'invoices'}?`}
            </DialogTitle>
            <DialogDescription>
              {bulkConfirm === 'finalize'
                ? 'This locks the hours in each period so they cannot be billed on another invoice. Each draft is re-checked for hours already billed elsewhere before finalizing; drafts with nothing left to bill are skipped.'
                : `This will permanently delete the selected invoices.${
                    selectedNonDraftCount > 0
                      ? ` Hours from the ${selectedNonDraftCount} finalized or paid ${
                          selectedNonDraftCount === 1 ? 'invoice' : 'invoices'
                        } will be released back to uninvoiced.`
                      : ''
                  } This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirm(null)} disabled={!!bulkBusy}>
              Cancel
            </Button>
            {bulkConfirm === 'finalize' ? (
              <Button onClick={bulkFinalize} disabled={!!bulkBusy}>
                {bulkBusy === 'finalize' ? 'Finalizing…' : 'Finalize'}
              </Button>
            ) : (
              <Button variant="destructive" onClick={bulkDelete} disabled={!!bulkBusy}>
                {bulkBusy === 'delete' ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
