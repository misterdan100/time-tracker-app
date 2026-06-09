/**
 * Replace vowel accents / diacritics with their base letter, while preserving
 * the Spanish letter ñ/Ñ (a distinct letter, not an accented n).
 *
 *   "Medellín" -> "Medellin"
 *   "José"     -> "Jose"
 *   "Bogotá"   -> "Bogota"
 *   "Camargüe" -> "Camargue"
 *   "Peña"     -> "Peña"   (ñ kept)
 */
const ACCENT_MAP: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ç: 'c',
  Á: 'A', À: 'A', Ä: 'A', Â: 'A', Ã: 'A',
  É: 'E', È: 'E', Ë: 'E', Ê: 'E',
  Í: 'I', Ì: 'I', Ï: 'I', Î: 'I',
  Ó: 'O', Ò: 'O', Ö: 'O', Ô: 'O', Õ: 'O',
  Ú: 'U', Ù: 'U', Ü: 'U', Û: 'U',
  Ç: 'C',
};

export function stripAccents(value: string): string {
  // NFC first so pasted/decomposed text (base letter + combining mark) becomes
  // precomposed (á, ñ…) and is handled consistently.
  let out = '';
  for (const ch of value.normalize('NFC')) {
    out += ACCENT_MAP[ch] ?? ch;
  }
  return out;
}
