import { DateTime } from 'luxon';

export function formatDatePartsToISODate(day: string, month: string, year: string): string | undefined {
  const d = day?.trim();
  const m = month?.trim();
  const y = year?.trim();
  if (!d || !m || !y) {
    return undefined;
  }
  const dt = DateTime.fromObject({
    day: Number(d),
    month: Number(m),
    year: Number(y),
  });
  if (!dt.isValid) {
    return undefined;
  }
  return dt.toISODate() ?? undefined;
}
