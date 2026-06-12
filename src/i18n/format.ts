const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Convert a number to Arabic-Indic numeral string (e.g., 80 → ٨٠). */
export function toArabicNumeral(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_DIGITS[parseInt(d)]);
}
