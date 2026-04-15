export function normalizeYesNoValue(value: unknown): 'YES' | 'NO' | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'YES') {
    return 'YES';
  }
  if (normalized === 'NO') {
    return 'NO';
  }

  return undefined;
}
