import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import {
  buildLineItems,
  clientInvoiceNumbers,
  clientProjectsBreakdown,
  defaultCurrencyForCountry,
  formatCurrency,
  formatInvoiceNumber,
  nextInvoiceNumberForClient,
  parseInvoiceNumber,
  suggestInvoicePeriod,
} from '../../lib/invoiceUtils';

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When launched from a client page, lock the invoice to that client. */
  lockedClientId?: string;
  /** When provided, the dialog edits this (draft) invoice instead of creating one. */
  editInvoice?: Invoice | null;
  /** Called with the created draft invoice (e.g. to navigate to its detail). */
  onCreated?: (invoice: Invoice) => void;
}

const CURRENCIES = ['COP', 'USD', 'EUR'];

const InvoiceDialog: React.FC<InvoiceDialogProps> = ({
  open,
  onOpenChange,
  lockedClientId,
  editInvoice,
  onCreated,
}) => {
  const { clients, projects, timeEntries, invoices, addInvoice, updateInvoice } = useApp();
  // Read latest invoices inside the open-effect without making it a dependency.
  const invoicesRef = useRef(invoices);
  invoicesRef.current = invoices;
  // Same trick for the data the period suggestion needs.
  const dataRef = useRef({ projects, timeEntries, invoices });
  dataRef.current = { projects, timeEntries, invoices };

  const isEditing = !!editInvoice;
  const clientLocked = !!lockedClientId || isEditing;

  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [periodStart, setPeriodStart] = useState(() => startOfMonth(new Date()).toISOString());
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString());
  // null = "all available projects in range" (create default); a Set = explicit choice.
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [hourlyRate, setHourlyRate] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill the period so it covers the client's not-yet-invoiced hours through today.
  const applySuggestedPeriod = (cid: string) => {
    const s = suggestInvoicePeriod(cid, dataRef.current);
    setPeriodStart(s.start);
    setPeriodEnd(s.end);
    setSelection(null);
  };

  // Initialize when (re)opened.
  useEffect(() => {
    if (!open) return;
    if (editInvoice) {
      setClientId(editInvoice.clientId);
      setPeriodStart(editInvoice.periodStart);
      setPeriodEnd(editInvoice.periodEnd);
      setHourlyRate(editInvoice.hourlyRate ? String(editInvoice.hourlyRate) : '');
      setCurrency(editInvoice.currency);
      setTitle(editInvoice.title);
      setNotes(editInvoice.notes);
      setSelection(new Set(editInvoice.lineItems.map((li) => li.projectId)));
      const n = parseInvoiceNumber(editInvoice.invoiceNumber);
      setInvoiceNumber(Number.isNaN(n) ? '' : String(n));
    } else {
      const cid = lockedClientId ?? '';
      setClientId(cid);
      if (cid) {
        applySuggestedPeriod(cid);
      } else {
        setPeriodStart(startOfMonth(new Date()).toISOString());
        setPeriodEnd(new Date().toISOString());
      }
      setHourlyRate('');
      setCurrency('COP');
      setTitle('');
      setNotes('');
      setSelection(null);
      setInvoiceNumber(cid ? String(nextInvoiceNumberForClient(cid, invoicesRef.current)) : '');
    }
    setSaving(false);
  }, [open, editInvoice, lockedClientId]);

  // Pre-fill rate + currency from the client (create mode only — edit keeps saved values).
  useEffect(() => {
    if (isEditing) return;
    const c = clients.find((cl) => cl.id === clientId);
    if (c) {
      setHourlyRate(c.defaultRate ? String(c.defaultRate) : '');
      setCurrency(c.currency || defaultCurrencyForCountry(c.country));
    }
  }, [clientId, clients, isEditing]);

  // Projects (of the client) that have unbilled hours in the chosen range.
  const breakdown = useMemo(
    () =>
      clientId
        ? clientProjectsBreakdown(
            clientId,
            periodStart,
            periodEnd,
            { projects, timeEntries },
            { onlyUnbilled: true }
          )
        : [],
    [clientId, periodStart, periodEnd, projects, timeEntries]
  );

  // Selection is reset to "all" only on user-driven client/period changes (below),
  // never on the programmatic init above — so an edited draft keeps its saved choice.
  const isSelected = (id: string) => (selection === null ? true : selection.has(id));
  const toggleProject = (id: string) => {
    setSelection((prev) => {
      const base = prev ?? new Set(breakdown.map((b) => b.projectId));
      const next = new Set(base);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClientChange = (v: string) => {
    setClientId(v);
    setSelection(null);
    setInvoiceNumber(v ? String(nextInvoiceNumberForClient(v, invoices)) : '');
    if (v) applySuggestedPeriod(v);
  };
  const handleStart = (date: Date) => {
    setPeriodStart(date.toISOString());
    setSelection(null);
    setStartOpen(false);
  };
  const handleEnd = (date: Date) => {
    setPeriodEnd(date.toISOString());
    setSelection(null);
    setEndOpen(false);
  };
  const setThisMonth = () => {
    setPeriodStart(startOfMonth(new Date()).toISOString());
    setPeriodEnd(new Date().toISOString());
    setSelection(null);
  };
  const setLastMonth = () => {
    const ref = subMonths(new Date(), 1);
    setPeriodStart(startOfMonth(ref).toISOString());
    setPeriodEnd(endOfMonth(ref).toISOString());
    setSelection(null);
  };

  // Explain where the suggested range comes from (create mode only).
  const suggested = useMemo(
    () => (clientId ? suggestInvoicePeriod(clientId, { projects, timeEntries, invoices }) : null),
    [clientId, projects, timeEntries, invoices]
  );
  const fmtDate = (iso: string) => format(new Date(iso), 'dd/MM/yyyy', { locale: enUS });
  const suggestionHint = (() => {
    if (isEditing || !suggested) return null;
    if (suggested.basis === 'after-last-invoice' && suggested.lastPeriodEnd) {
      return `Last invoice covered through ${fmtDate(suggested.lastPeriodEnd)}. Suggested range starts the next day.`;
    }
    if (suggested.basis === 'earlier-unbilled') {
      return suggested.lastPeriodEnd
        ? `Unbilled hours exist before the last invoice (${fmtDate(suggested.lastPeriodEnd)}); suggested range extends back to include them.`
        : 'No invoices yet — suggested range starts at the oldest unbilled entry.';
    }
    return null;
  })();

  const rate = parseFloat(hourlyRate) || 0;
  const selectedBreakdown = breakdown.filter((b) => isSelected(b.projectId));
  const { lineItems, totalHours, totalAmount } = buildLineItems(selectedBreakdown, rate);

  // ----- per-client invoice number validation -----
  const existingNumbers = useMemo(
    () => new Set(clientInvoiceNumbers(clientId, invoices, editInvoice?.id)),
    [clientId, invoices, editInvoice]
  );
  const maxExisting = existingNumbers.size ? Math.max(...existingNumbers) : 0;
  const enteredNum = invoiceNumber.trim() === '' ? NaN : Math.floor(Number(invoiceNumber));
  const numberInvalid = Number.isNaN(enteredNum) || enteredNum < 1;
  const numberDuplicate = !numberInvalid && existingNumbers.has(enteredNum);
  const numberGap =
    !numberInvalid && !numberDuplicate && maxExisting > 0 && enteredNum > maxExisting + 1;
  const numberBlocks = numberInvalid || numberDuplicate; // prevents saving

  const canSave = !!clientId && lineItems.length > 0 && !saving && !numberBlocks;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const payload = {
      clientId,
      invoiceNumber: String(enteredNum),
      title: title.trim(),
      periodStart,
      periodEnd,
      hourlyRate: rate,
      currency,
      totalHours,
      totalAmount,
      lineItems,
      notes: notes.trim(),
    };
    if (editInvoice) {
      await updateInvoice(editInvoice.id, payload);
      setSaving(false);
      onOpenChange(false);
    } else {
      const invoice = await addInvoice({
        ...payload,
        status: 'draft',
        issuedAt: null,
        paidAt: null,
      });
      setSaving(false);
      if (invoice) {
        onOpenChange(false);
        onCreated?.(invoice);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Invoice' : 'New Invoice'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this draft. Saving recalculates its hours and total from the current range and selection.'
              : 'Bill a client for hours worked on selected projects over a date range. Saved as a draft — finalize it later to lock those hours.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-2">
            {/* Client + number */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="client">Client</Label>
                <Select value={clientId} onValueChange={handleClientChange} disabled={clientLocked}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No clients yet</div>
                    ) : (
                      clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoiceNumber">Invoice number</Label>
                <Input
                  id="invoiceNumber"
                  type="number"
                  min="1"
                  step="1"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder={
                    clientId ? `Suggested ${formatInvoiceNumber(maxExisting + 1)}` : 'Select a client first'
                  }
                  disabled={!clientId}
                  aria-invalid={numberBlocks || undefined}
                  className={
                    numberBlocks ? 'border-destructive focus-visible:ring-destructive' : undefined
                  }
                />
              </div>
            </div>
            {/* Number feedback (full width) */}
            {numberDuplicate ? (
              <p className="-mt-2 text-xs font-medium text-destructive">
                #{formatInvoiceNumber(enteredNum)} already exists for this client. Pick a different
                number.
              </p>
            ) : numberInvalid && invoiceNumber.trim() !== '' ? (
              <p className="-mt-2 text-xs font-medium text-destructive">
                Enter a whole number (1 or higher).
              </p>
            ) : numberGap ? (
              <p className="-mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                Skipping ahead — the last invoice for this client was{' '}
                #{formatInvoiceNumber(maxExisting)}. You can still use #{formatInvoiceNumber(enteredNum)}.
              </p>
            ) : clientId ? (
              <p className="-mt-2 text-xs text-muted-foreground">
                Per-client numbering. Suggested next: #{formatInvoiceNumber(maxExisting + 1)}.
              </p>
            ) : null}

            {/* Date range */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Period</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => applySuggestedPeriod(clientId)}
                    disabled={!clientId}
                    title="Range covering hours not yet in any invoice, through today"
                  >
                    Unbilled
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={setThisMonth}>
                    This month
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={setLastMonth}>
                    Last month
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(periodStart), 'dd/MM/yyyy', { locale: enUS })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(periodStart)}
                      onSelect={(date) => date && handleStart(date)}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(periodEnd), 'dd/MM/yyyy', { locale: enUS })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(periodEnd)}
                      onSelect={(date) => date && handleEnd(date)}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {suggestionHint ? (
                <p className="text-xs text-muted-foreground">{suggestionHint}</p>
              ) : null}
            </div>

            {/* Projects */}
            <div className="grid gap-2">
              <Label>Projects (unbilled hours in range)</Label>
              {!clientId ? (
                <p className="rounded-xl border border-border/60 px-3 py-4 text-sm text-muted-foreground">
                  Select a client to see its projects.
                </p>
              ) : breakdown.length === 0 ? (
                <p className="rounded-xl border border-border/60 px-3 py-4 text-sm text-muted-foreground">
                  No unbilled hours for this client in this range.
                </p>
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
                  {breakdown.map((b) => (
                    <label
                      key={b.projectId}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-accent"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={isSelected(b.projectId)}
                          onChange={() => toggleProject(b.projectId)}
                        />
                        <span className="text-sm font-medium">{b.projectName}</span>
                      </span>
                      <span className="text-sm text-muted-foreground">{b.hours.toFixed(2)}h</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Rate + currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="rate">Rate / hour</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="Eg: 50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title + notes */}
            <div className="grid gap-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Eg: Design services — June 2026"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, thank-you note, etc."
              />
            </div>

            {/* Live preview */}
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </div>
              {lineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Select at least one project with hours to preview the invoice.
                </p>
              ) : (
                <div className="space-y-1">
                  {lineItems.map((li) => (
                    <div key={li.projectId} className="flex justify-between text-sm">
                      <span className="text-foreground">
                        {li.projectName}{' '}
                        <span className="text-muted-foreground">({li.hours.toFixed(2)}h)</span>
                      </span>
                      <span className="font-medium">{formatCurrency(li.amount, currency)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-border/60 pt-2 text-sm font-semibold">
                    <span>{totalHours.toFixed(2)}h total</span>
                    <span>{formatCurrency(totalAmount, currency)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
