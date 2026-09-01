import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { Client, Invoice, Profile } from '../../types';
import { formatCurrency, formatInvoiceNumber } from '../../lib/invoiceUtils';

// NOTE: react-pdf uses its own StyleSheet (not Tailwind). Keep the structure
// simple here — this is the "predetermined design" placeholder to refine later.
const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 44,
    paddingVertical: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
    lineHeight: 1.4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  // Grays are kept mid-dark (>= #6b7280) so they survive low-quality printers.
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827' },
  tagline: { fontSize: 9, color: '#4b5563', marginTop: 6 },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    textAlign: 'right',
  },
  invoiceNumber: { fontSize: 11, color: '#374151', textAlign: 'right', marginTop: 10 },
  statusBadge: {
    marginTop: 6,
    alignSelf: 'flex-end',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 },
  party: { width: '48%' },
  label: {
    fontSize: 8,
    color: '#6b7280',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  strong: { fontFamily: 'Helvetica-Bold', color: '#111827' },
  reportHeading: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 14 },
  table: { marginTop: 4 },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#111827',
    paddingBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  thProject: { width: '56%' },
  thNum: { width: '22%', textAlign: 'right' },
  headText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151' },
  totalsWrap: { marginTop: 18, alignItems: 'flex-end' },
  totalsBox: { width: '50%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1.5,
    borderTopColor: '#111827',
  },
  grandText: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827' },
  paymentBox: {
    marginTop: 26,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    backgroundColor: '#f9fafb',
  },
  paymentRow: { flexDirection: 'row', marginBottom: 2 },
  paymentKey: { width: 110, color: '#4b5563' },
  paymentVal: { color: '#111827' },
  notes: { marginTop: 20 },
  notesText: { color: '#374151' },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 44,
    right: 44,
    alignItems: 'center',
  },
  footerDate: { fontSize: 8, color: '#4b5563', marginBottom: 3 },
  footerText: { fontSize: 8, color: '#6b7280', textAlign: 'center' },
});

/**
 * The invoice's own date: when it was created (DB timestamp), falling back to
 * the issue date and finally to "now" for rows that predate the created_at mapping.
 */
export function invoiceDate(invoice: Invoice): Date {
  for (const iso of [invoice.createdAt, invoice.issuedAt]) {
    if (!iso) continue;
    const d = parseISO(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Strip characters that are illegal in file names; keep spaces and case. */
function safeFilePart(value: string, fallback: string): string {
  const cleaned = value.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

/** `[number]-[client]-[professional name]-[yyyy-MM-dd].pdf`, e.g. 011-EZpermitsTX-Daniel Caceres-2026-09-01.pdf */
export function invoiceFileName(
  invoice: Invoice,
  client?: Client | null,
  profile?: Profile | null
): string {
  const parts = [
    formatInvoiceNumber(invoice.invoiceNumber),
    safeFilePart(client?.companyName ?? '', 'client'),
    safeFilePart(profile?.professionalName ?? '', 'invoice'),
    format(invoiceDate(invoice), 'yyyy-MM-dd'),
  ];
  return `${parts.join('-')}.pdf`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

interface InvoicePdfProps {
  invoice: Invoice;
  client?: Client | null;
  profile?: Profile | null;
}

export const InvoicePdf = ({ invoice, client, profile }: InvoicePdfProps) => {
  const currency = invoice.currency;
  // Invoice number padded to 3 digits for display (e.g. "8" -> "008").
  const numLabel = formatInvoiceNumber(invoice.invoiceNumber);
  // Normalize issuer fields (profile is guaranteed complete by the create gate,
  // but stay null-safe in case the PDF is generated for an older invoice).
  const p = {
    studioName: profile?.studioName ?? '',
    tagline: profile?.tagline ?? '',
    professionalName: profile?.professionalName ?? '',
    address: profile?.address ?? '',
    city: profile?.city ?? '',
    country: profile?.country ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    bankName: profile?.bankName ?? '',
    bankAccount: profile?.bankAccount ?? '',
    idType: profile?.idType ?? '',
    idNumber: profile?.idNumber ?? '',
  };
  const cityCountry = [p.city, p.country].filter(Boolean).join(', ');
  const idLine = [p.idType, p.idNumber].filter(Boolean).join(' ');

  return (
    <Document title={numLabel}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandName}>{p.studioName || 'Invoice'}</Text>
            {p.tagline ? <Text style={styles.tagline}>{p.tagline}</Text> : null}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>Number #{numLabel}</Text>
            <Text style={styles.statusBadge}>{invoice.status}</Text>
          </View>
        </View>

        {/* From / Bill to */}
        <View style={styles.partiesRow}>
          <View style={styles.party}>
            <Text style={styles.label}>From</Text>
            {p.studioName ? <Text style={styles.strong}>{p.studioName}</Text> : null}
            {cityCountry ? <Text>{cityCountry}</Text> : null}
            {p.phone ? <Text>{p.phone}</Text> : null}
            {p.email ? <Text>{p.email}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.strong}>{client?.companyName ?? 'Client'}</Text>
            {client?.ownerName ? <Text>{client.ownerName}</Text> : null}
            {client?.email ? <Text>{client.email}</Text> : null}
            {client?.country ? <Text>{client.country}</Text> : null}
          </View>
        </View>

        {/* Report heading (always shown, uppercase) */}
        <Text style={styles.reportHeading}>HOURS REPORT #{numLabel}</Text>

        {/* Period */}
        <View style={{ marginBottom: 18 }}>
          <Text style={styles.label}>Period</Text>
          <Text style={styles.strong}>
            {fmtDate(invoice.periodStart)} — {fmtDate(invoice.periodEnd)}
          </Text>
        </View>

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thProject, styles.headText]}>Project</Text>
            <Text style={[styles.thNum, styles.headText]}>Hours</Text>
            <Text style={[styles.thNum, styles.headText]}>Amount</Text>
          </View>
          {invoice.lineItems.map((li) => (
            <View style={styles.tableRow} key={li.projectId} wrap={false}>
              <Text style={styles.thProject}>{li.projectName}</Text>
              <Text style={styles.thNum}>{li.hours.toFixed(2)}</Text>
              <Text style={styles.thNum}>{formatCurrency(li.amount, currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>Total hours</Text>
              <Text>{invoice.totalHours.toFixed(2)} h</Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandText}>Total</Text>
              <Text style={styles.grandText}>
                {formatCurrency(invoice.totalAmount, currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment details */}
        {p.bankName || p.bankAccount || idLine ? (
          <View style={styles.paymentBox}>
            <Text style={[styles.label, { marginBottom: 6 }]}>Payment details</Text>
            {p.bankName ? (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>Bank</Text>
                <Text style={styles.paymentVal}>{p.bankName}</Text>
              </View>
            ) : null}
            {p.bankAccount ? (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>Account no.</Text>
                <Text style={styles.paymentVal}>{p.bankAccount}</Text>
              </View>
            ) : null}
            {idLine ? (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentKey}>ID</Text>
                <Text style={styles.paymentVal}>{idLine}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.notes}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerDate}>Invoice date: {format(invoiceDate(invoice), 'MMM d, yyyy')}</Text>
          <Text style={styles.footerText}>
            {p.studioName ? `${p.studioName} · ` : ''}Thank you for your business.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

/** Render the invoice to a PDF blob and trigger a browser download. */
export async function downloadInvoicePdf(
  invoice: Invoice,
  client?: Client | null,
  profile?: Profile | null
): Promise<void> {
  const blob = await pdf(<InvoicePdf invoice={invoice} client={client} profile={profile} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = invoiceFileName(invoice, client, profile);
  link.click();
  URL.revokeObjectURL(url);
}
