import { toast } from 'sonner';

// No look-alike characters (0/O, 1/l/I) so a temporary password can be read out or retyped.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Cryptographically random password, safe to share as a temporary credential. */
export function generatePassword(length = 14): string {
  const out: string[] = [];
  // Rejection sampling keeps every character equally likely (no modulo bias).
  const limit = 256 - (256 % ALPHABET.length);
  const bytes = new Uint8Array(length * 2);
  while (out.length < length) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < limit) out.push(ALPHABET[b % ALPHABET.length]);
      if (out.length === length) break;
    }
  }
  return out.join('');
}

export async function copyToClipboard(text: string, label = 'Copied'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error('Could not copy', { description: 'Select the text and copy it manually.' });
  }
}
