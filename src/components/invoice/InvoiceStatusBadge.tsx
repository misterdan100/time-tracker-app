import { InvoiceStatus } from '../../types';

const STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
  finalized: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
};

const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => (
  <span
    className={`inline-block rounded-full px-2 py-1 text-xs font-medium capitalize ${STYLES[status]}`}
  >
    {status}
  </span>
);

export default InvoiceStatusBadge;
