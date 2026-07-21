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

/**
 * Parses and formats a date string safely to DD/MM/YYYY format without UTC timezone offsets.
 * Preserves the exact day specified in the string (e.g. "2025-11-01" becomes "01/11/2025").
 */
export function formatLocalDate(dateStr: string | undefined | null): string {
  if (!dateStr || dateStr.trim() === '' || dateStr === 'S/D' || dateStr === 'Sin registros') {
    return 'S/D';
  }
  
  const cleanStr = dateStr.trim();
  
  // If already in DD/MM/YYYY or D/M/YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(cleanStr)) {
    const parts = cleanStr.split(/[\/\-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].substring(0, 4);
    return `${day}/${month}/${year}`;
  }
  
  // Parse YYYY-MM-DD or YYYY/MM/DD
  const match = cleanStr.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
  if (match) {
    const [_, year, month, day] = match;
    const d = day.padStart(2, '0');
    const m = month.padStart(2, '0');
    return `${d}/${m}/${year}`;
  }
  
  try {
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
      // Add timezone offset to avoid previous day bug
      const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      const day = String(localDate.getDate()).padStart(2, '0');
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const year = localDate.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {}
  
  return dateStr;
}
