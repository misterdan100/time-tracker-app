import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Clock, Download, FileText, Undo2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { SortableHead } from '../ui/sortable-head';
import StatCard from '../dashboard/StatCard';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import { useApp } from '../../context/AppContext';
import { downloadInvoice } from '../../lib/downloadInvoice';
import { formatCurrency, formatInvoiceNumber } from '../../lib/invoiceUtils';
import { leadAsClient } from '../../lib/teamBilling';
import { dateSortValue, SortAccessors, useSort } from '../../lib/sort';
import { TeamInvoice } from '../../types';

type Filter = 'outstanding' | 'paid' | 'all';
type SortKey = 'number' | 'member' | 'period' | 'hours' | 'amount' | 'status';

const fmt = (iso: string) => {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
};

/**
 * Admin view of invoices their team members sent them: download the PDF, mark as paid,
 * or return a finalized one to the member as a draft.
 */
const TeamInvoicesPanel: React.FC = () => {
  const { teamInvoices, teamMembers, teamProfiles, profile, markTeamInvoicePaid, returnTeamInvoice } =
    useApp();
  const [filter, setFilter] = useState<Filter>('outstanding');
  const [confirm, setConfirm] = useState<{ kind: 'paid' | 'return'; invoice: TeamInvoice } | null>(null);
  const [busy, setBusy] = useState(false);

  const memberName = (userId: string) =>
    teamMembers.find((m) => m.userId === userId)?.displayName || 'Team member';

  const filtered = useMemo(
    () =>
      teamInvoices.filter((i) =>
        filter === 'all' ? true : filter === 'paid' ? i.status === 'paid' : i.status === 'finalized'
      ),
    [teamInvoices, filter]
  );

  const accessors = useMemo<SortAccessors<TeamInvoice, SortKey>>(
    () => ({
      number: (i) => parseInt((i.invoiceNumber ?? '').replace(/\D/g, ''), 10) || 0,
      member: (i) => teamMembers.find((m) => m.userId === i.userId)?.displayName ?? '',
      period: (i) => dateSortValue(i.periodEnd),
      hours: (i) => i.totalHours,
      amount: (i) => i.totalAmount,
      status: (i) => (i.status === 'finalized' ? 0 : 1),
    }),
    [teamMembers]
  );
  const { sort, toggle, sorted } = useSort(filtered, accessors, { key: 'period', dir: 'desc' });

  const outstanding = teamInvoices.filter((i) => i.status === 'finalized');
  const outstandingByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    outstanding.forEach((i) => map.set(i.currency, (map.get(i.currency) ?? 0) + i.totalAmount));
    return Array.from(map.entries());
  }, [outstanding]);
  const paidCount = teamInvoices.length - outstanding.length;

  const handleDownload = async (invoice: TeamInvoice) => {
    try {
      // From: the member's studio profile. Bill to: you.
      await downloadInvoice(
        invoice,
        leadAsClient(profile, { hourlyRate: invoice.hourlyRate, currency: invoice.currency }),
        teamProfiles[invoice.userId] ?? null
      );
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Could not generate the PDF');
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    const ok =
      confirm.kind === 'paid'
        ? await markTeamInvoicePaid(confirm.invoice.id)
        : await returnTeamInvoice(confirm.invoice.id);
    setBusy(false);
    if (ok) setConfirm(null);
  };

  const filters: Array<{ key: Filter; label: string }> = [
    { key: 'outstanding', label: 'Awaiting payment' },
    { key: 'paid', label: 'Paid' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Received" value={teamInvoices.length} icon={FileText} tint="blue" />
        <StatCard
          label="Awaiting payment"
          value={outstanding.length}
          icon={Clock}
          tint="orange"
          hint={
            outstandingByCurrency.length > 0
              ? outstandingByCurrency.map(([cur, amt]) => formatCurrency(amt, cur)).join(' · ')
              : undefined
          }
        />
        <StatCard label="Paid" value={paidCount} icon={CheckCircle2} tint="green" />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead sortKey="number" sort={sort} onSort={toggle}>
                Number
              </SortableHead>
              <SortableHead sortKey="member" sort={sort} onSort={toggle}>
                From
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
              <SortableHead sortKey="status" sort={sort} onSort={toggle} className="hidden md:table-cell">
                Status
              </SortableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {teamInvoices.length === 0
                    ? 'No invoices from your team yet. They appear here once a member finalizes one.'
                    : 'No invoices match this filter.'}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    #{formatInvoiceNumber(invoice.invoiceNumber)}
                  </TableCell>
                  <TableCell>{memberName(invoice.userId)}</TableCell>
                  <TableCell className="hidden whitespace-nowrap lg:table-cell">
                    {fmt(invoice.periodStart)} – {fmt(invoice.periodEnd)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {invoice.totalHours.toFixed(2)}h
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.totalAmount, invoice.currency)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download PDF"
                        aria-label={`Download invoice #${formatInvoiceNumber(invoice.invoiceNumber)}`}
                        onClick={() => handleDownload(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {invoice.status === 'finalized' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Return to draft"
                            aria-label={`Return invoice #${formatInvoiceNumber(invoice.invoiceNumber)} to draft`}
                            onClick={() => setConfirm({ kind: 'return', invoice })}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setConfirm({ kind: 'paid', invoice })}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark paid
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirm} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === 'paid' ? 'Mark invoice as paid?' : 'Return invoice to draft?'}
            </DialogTitle>
            <DialogDescription>
              {confirm && (
                <>
                  <span className="font-semibold text-foreground">
                    #{formatInvoiceNumber(confirm.invoice.invoiceNumber)}
                  </span>{' '}
                  from{' '}
                  <span className="font-semibold text-foreground">
                    {memberName(confirm.invoice.userId)}
                  </span>{' '}
                  for {formatCurrency(confirm.invoice.totalAmount, confirm.invoice.currency)}.{' '}
                  {confirm.kind === 'paid'
                    ? 'Do this once you have paid it. It cannot be undone.'
                    : 'They will be able to edit it again and its hours are released. It disappears from this list until they send it again.'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={runConfirm} disabled={busy}>
              {busy ? 'Saving…' : confirm?.kind === 'paid' ? 'Mark paid' : 'Return to draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamInvoicesPanel;
