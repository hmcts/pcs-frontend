export function truncateForLog(text: string, maxLen = 200): string {
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
}

export function shortUrl(url: string, maxLen = 120): string {
  let s = url;
  try {
    const u = new URL(url);
    s = u.pathname + u.search;
  } catch {
    /* keep raw string when URL is relative or invalid */
  }
  return s.length <= maxLen ? s : `${s.slice(0, maxLen)}…`;
}

export function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// Converts supported values into a stable string form for storage and comparison.
export function normalizeValueData(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(val => String(val)).join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

// Removes a trailing "(optional)" suffix while keeping any ending question mark.
export function stripOptionalSuffix(question: string): string {
  return question.replace(/\s*\(optional\)(\?)?\s*$/i, '$1').trim();
}

// Removes bracketed helper text when it appears at the end of a label.
export function removeTrailingBracketedSuffix(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// Joins only the non-empty values into a comma-separated string.
export function joinNonEmptyValues(...values: unknown[]): string {
  return values
    .map(value => String(value ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

// Builds a full name without leaving extra spaces for missing parts.
export function buildFullName(firstName?: unknown, lastName?: unknown): string {
  return `${String(firstName ?? '').trim()} ${String(lastName ?? '').trim()}`.trim();
}

// Formats a numeric value as pounds with two decimal places.
export function formatPoundsValue(value: number | string): string {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }
  return `£${numericValue.toFixed(2)}`;
}

// Normalizes text for case-insensitive comparisons and display formatting.
export function normalizeLowercaseText(value: unknown): string {
  return String(value).trim().toLowerCase();
}

export function generateRandomString(length: string | number): string {
  if (typeof length !== 'number' || !Number.isInteger(length) || length <= 0) {
    return '';
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function stringToCamelCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .split(/\s+/)
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}
