export function normalizeYesNoNotSureValue(value: unknown): 'yes' | 'no' | 'imNotSure' | undefined {
  if (value === 'yes' || value === 'no' || value === 'imNotSure') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'YES') {
    return 'yes';
  }
  if (normalized === 'NO') {
    return 'no';
  }
  if (normalized === 'NOT_SURE') {
    return 'imNotSure';
  }

  return undefined;
}
