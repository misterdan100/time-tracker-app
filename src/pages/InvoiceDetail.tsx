import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import StatCard from '../components/dashboard/StatCard';
import InvoiceStatusBadge from '../components/invoice/InvoiceStatusBadge';
import InvoiceDialog from '../components/dialogs/InvoiceDialog';
import { downloadInvoice } from '../lib/downloadInvoice';
import { formatCurrency, formatInvoiceNumber } from '../lib/invoiceUtils';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Download,
  FileCheck,
  CheckCircle2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { SortableHead } from '../components/ui/sortable-head';
import PageHeader from '../components/layout/PageHeader';
import { SortAccessors, useSort } from '../lib/sort';
import { InvoiceLineItem } from '../types';

type LineSortKey = 'project' | 'hours' | 'amount';

const lineAccessors: SortAccessors<InvoiceLineItem, LineSortKey> = {
  project: (li) => li.projectName,
  hours: (li) => li.hours,
  amount: (li) => li.amount,
};

const NO_LINES: InvoiceLineItem[] = [];

const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return '—';
  }
};

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, clients, profile, finalizeInvoice, markInvoicePaid, deleteInvoice } = useApp();
  const [confirm, setConfirm] = useState<null | 'finalize' | 'delete'>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const invoice = invoices.find((i) => i.id === id);
  const client = invoice ? clients.find((c) => c.id === invoice.clientId) : undefined;

  // Hooks stay above the early return below.
  const lineItems = useMemo(() => invoice?.lineItems ?? NO_LINES, [invoice]);
  const {
    sort: lineSort,
    toggle: toggleLineSort,
    sorted: sortedLines,
  } = useSort(lineItems, lineAccessors, { key: 'project', dir: 'asc' });

  if (!invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Invoice not found</h1>
        </div>
        <p className="text-muted-foreground">The invoice you are looking for does not exist.</p>
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      await downloadInvoice(invoice, client, profile);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Could not generate the PDF');
    }
  };

  const doFinalize = async () => {
    setBusy(true);
    await finalizeInvoice(invoice.id);
    setBusy(false);
    setConfirm(null);
  };

  const doMarkPaid = async () => {
    setBusy(true);
    await markInvoicePaid(invoice.id);
    setBusy(false);
  };

  const doDelete = async () => {
    setBusy(true);
    await deleteInvoice(invoice.id);
    setBusy(false);
    setConfirm(null);
    navigate('/invoices');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`#${formatInvoiceNumber(invoice.invoiceNumber)}`}
        titleAddon={<InvoiceStatusBadge status={invoice.status} />}
        onBack={() => navigate('/invoices')}
        subtitle={
          <>
            {client ? (
              <Link to={`/client/${client.id}`} className="hover:underline">
                {client.companyName}
              </Link>
            ) : (
              'Unknown client'
            )}
            {invoice.title ? ` · ${invoice.title}` : ''}
          </>
        }
        actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          {invoice.status === 'draft' && (
            <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {invoice.status === 'draft' && (
            <Button className="gap-2" onClick={() => setConfirm('finalize')}>
              <FileCheck className="h-4 w-4" />
              Finalize
            </Button>
          )}
          {invoice.status === 'finalized' && (
            <Button className="gap-2" onClick={doMarkPaid} disabled={busy}>
              <CheckCircle2 className="h-4 w-4" />
              Mark paid
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Delete"
            onClick={() => setConfirm('delete')}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        }
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total hours" value={`${invoice.totalHours.toFixed(2)}h`} icon={Clock} tint="blue" />
        <StatCard
          label="Total amount"
          value={formatCurrency(invoice.totalAmount, invoice.currency)}
          icon={DollarSign}
          tint="green"
        />
        <StatCard
          label="Rate / hour"
          value={formatCurrency(invoice.hourlyRate, invoice.currency)}
          icon={DollarSign}
          tint="beige"
        />
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Period</p>
              <p className="text-base">
                {fmt(invoice.periodStart)} – {fmt(invoice.periodEnd)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Issued</p>
              <p className="text-base">{fmt(invoice.issuedAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Paid</p>
              <p className="text-base">{fmt(invoice.paidAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Currency</p>
              <p className="text-base">{invoice.currency}</p>
            </div>
          </div>
          {invoice.notes ? (
            <div className="mt-4 border-t border-border/60 pt-4">
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-base">{invoice.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.lineItems.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No line items.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead sortKey="project" sort={lineSort} onSort={toggleLineSort}>
                    Project
                  </SortableHead>
                  <SortableHead sortKey="hours" sort={lineSort} onSort={toggleLineSort} align="right">
                    Hours
                  </SortableHead>
                  <TableHead className="hidden text-right sm:table-cell">Rate</TableHead>
                  <SortableHead sortKey="amount" sort={lineSort} onSort={toggleLineSort} align="right">
                    Amount
                  </SortableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLines.map((li) => (
                  <TableRow key={li.projectId}>
                    <TableCell className="font-medium">{li.projectName}</TableCell>
                    <TableCell className="text-right">{li.hours.toFixed(2)}h</TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      {formatCurrency(invoice.hourlyRate, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(li.amount, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">
                    {invoice.totalHours.toFixed(2)}h
                  </TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(invoice.totalAmount, invoice.currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog (finalize / delete) */}
      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === 'finalize' ? 'Finalize invoice?' : 'Delete invoice?'}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'finalize'
                ? 'This locks the hours in this period so they cannot be billed on another invoice. It re-checks for any hours already billed elsewhere before finalizing.'
                : `This will permanently delete #${formatInvoiceNumber(invoice.invoiceNumber)}.${
                    invoice.status !== 'draft'
                      ? ' Its hours will be released back to uninvoiced.'
                      : ''
                  } This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            {confirm === 'finalize' ? (
              <Button onClick={doFinalize} disabled={busy}>
                {busy ? 'Finalizing…' : 'Finalize'}
              </Button>
            ) : (
              <Button variant="destructive" onClick={doDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceDialog open={editOpen} onOpenChange={setEditOpen} editInvoice={invoice} />
    </div>
  );
};

export default InvoiceDetail;
