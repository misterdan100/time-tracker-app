import { InvoiceStatus } from '../../types';
import { Badge, type BadgeTone } from '../ui/badge';

const TONES: Record<InvoiceStatus, BadgeTone> = {
  draft: 'neutral',
  finalized: 'info',
  paid: 'success',
};

const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => (
  <Badge tone={TONES[status]} className="capitalize">
    {status}
  </Badge>
);

export default InvoiceStatusBadge;
