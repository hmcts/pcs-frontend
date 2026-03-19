export function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function exactTextWithOptionalWhitespaceRegex(text: string): RegExp {
  return new RegExp(`^\\s*${escapeForRegex(text)}\\s*$`);
}

export function formatText(value: string | number | boolean | string[] | object): string {
  return typeof value === 'string' ? value.toLowerCase().replace(/_/g, ' ').trim() : String(value);
}
