/**
 * Formats a number to Argentinian currency format without thousands separators
 * Example: 2735.28 -> $2735,28
 */
export function formatPrice(val: number): string {
  if (val === undefined || val === null || isNaN(val)) {
    return "$0,00";
  }
  return `$${val.toFixed(2).replace('.', ',')}`;
}
