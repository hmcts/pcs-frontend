export function asHeaderString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value) && value.length > 0) {
    const firstValue = String(value[0]).trim();
    return firstValue || undefined;
  }
  return undefined;
}
