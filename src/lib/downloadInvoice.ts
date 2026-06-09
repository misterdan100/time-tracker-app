import { Client, Invoice } from '../types';

/**
 * Download an invoice as PDF. The PDF engine (@react-pdf/renderer) is heavy, so
 * it's loaded on demand via dynamic import — this keeps it out of the main
 * bundle and only fetches it the first time a user actually downloads.
 */
export async function downloadInvoice(invoice: Invoice, client?: Client | null): Promise<void> {
  const { downloadInvoicePdf } = await import('../components/invoice/InvoicePdf');
  await downloadInvoicePdf(invoice, client);
}
