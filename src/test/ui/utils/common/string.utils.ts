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
