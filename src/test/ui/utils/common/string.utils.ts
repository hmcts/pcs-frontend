/** Truncate long strings in PFT / trigger debug output. */
export function truncateForLog(text: string, maxLen = 200): string {
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen)}…`;
}

/** Compact URL for logs (pathname + search, capped). */
export function shortUrl(url: string, maxLen = 120): string {
  try {
    const u = new URL(url);
    const compact = `${u.pathname}${u.search}`;
    return compact.length <= maxLen ? compact : `${compact.slice(0, maxLen)}…`;
  } catch {
    return url.length <= maxLen ? url : `${url.slice(0, maxLen)}…`;
  }
}

export function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getRelativeDate(daysOffset: number = 0): {
  day: string;
  month: string;
  year: string;
} {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  };
}

export function exactTextWithOptionalWhitespaceRegex(text: string): RegExp {
  return new RegExp(`^\\s*${escapeForRegex(text)}\\s*$`);
}

export function formatCurrency(value: number | string): string {
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Invalid currency value: ${value}`);
  }
  return `£${(Number(value) / 100).toFixed(2)}`;
}

export function formatTextToLowercaseSeparatedBySpace(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').trim();
}

export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
