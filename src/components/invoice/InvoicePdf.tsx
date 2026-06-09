import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { Client, Invoice } from '../../types';
import { businessProfile } from '../../lib/invoiceConfig';
import { formatCurrency } from '../../lib/invoiceUtils';

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
  brandName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111827' },
  tagline: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#22C55E',
    textAlign: 'right',
  },
  invoiceNumber: { fontSize: 11, color: '#374151', textAlign: 'right', marginTop: 4 },
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
    color: '#9ca3af',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  strong: { fontFamily: 'Helvetica-Bold', color: '#111827' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  metaItem: { width: '32%' },
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
  thProject: { width: '46%' },
  thNum: { width: '18%', textAlign: 'right' },
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
  notes: { marginTop: 30 },
  notesText: { color: '#4b5563' },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 44,
    right: 44,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
});

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
}

export const InvoicePdf = ({ invoice, client }: InvoicePdfProps) => {
  const currency = invoice.currency;
  return (
    <Document title={`${invoice.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandName}>{businessProfile.name}</Text>
            {businessProfile.tagline ? (
              <Text style={styles.tagline}>{businessProfile.tagline}</Text>
            ) : null}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
            <Text style={styles.statusBadge}>{invoice.status}</Text>
          </View>
        </View>

        {/* From / Bill to */}
        <View style={styles.partiesRow}>
          <View style={styles.party}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.strong}>{businessProfile.name}</Text>
            {businessProfile.address ? <Text>{businessProfile.address}</Text> : null}
            {businessProfile.email ? <Text>{businessProfile.email}</Text> : null}
            {businessProfile.phone ? <Text>{businessProfile.phone}</Text> : null}
            {businessProfile.taxId ? <Text>Tax ID: {businessProfile.taxId}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.strong}>{client?.companyName ?? 'Client'}</Text>
            {client?.ownerName ? <Text>{client.ownerName}</Text> : null}
            {client?.email ? <Text>{client.email}</Text> : null}
            {client?.country ? <Text>{client.country}</Text> : null}
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Period</Text>
            <Text>
              {fmtDate(invoice.periodStart)} — {fmtDate(invoice.periodEnd)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Issued</Text>
            <Text>{fmtDate(invoice.issuedAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Rate</Text>
            <Text>{formatCurrency(invoice.hourlyRate, currency)} / h</Text>
          </View>
        </View>

        {invoice.title ? (
          <Text style={[styles.strong, { marginBottom: 10 }]}>{invoice.title}</Text>
        ) : null}

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.thProject, styles.headText]}>Project</Text>
            <Text style={[styles.thNum, styles.headText]}>Hours</Text>
            <Text style={[styles.thNum, styles.headText]}>Rate</Text>
            <Text style={[styles.thNum, styles.headText]}>Amount</Text>
          </View>
          {invoice.lineItems.map((li) => (
            <View style={styles.tableRow} key={li.projectId} wrap={false}>
              <Text style={styles.thProject}>{li.projectName}</Text>
              <Text style={styles.thNum}>{li.hours.toFixed(2)}</Text>
              <Text style={styles.thNum}>{formatCurrency(invoice.hourlyRate, currency)}</Text>
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

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.notes}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          {businessProfile.name}
          {businessProfile.website ? ` · ${businessProfile.website}` : ''} · Thank you for your
          business.
        </Text>
      </Page>
    </Document>
  );
};

/** Render the invoice to a PDF blob and trigger a browser download. */
export async function downloadInvoicePdf(invoice: Invoice, client?: Client | null): Promise<void> {
  const blob = await pdf(<InvoicePdf invoice={invoice} client={client} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeClient = (client?.companyName ?? 'client').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  link.download = `${invoice.invoiceNumber}-${safeClient}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
