export function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function exactTextWithOptionalWhitespaceRegex(text: string): RegExp {
  return new RegExp(`^\\s*${escapeForRegex(text)}\\s*$`);
}

export function formatTextToLowercaseSeparatedBySpace(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').trim();
}

export function truncate(s: string, max: number, trim?: boolean): string {
  const t = trim ? s.trim() : s;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function shortUrl(u: string, max = 88): string {
  return truncate(u, max);
}

export function truncateForLog(s: string, max = 800): string {
  return truncate(s, max, true);
}
