import { DateTime } from 'luxon';

export function parseISOToDateParts(isoDate: string): { day: string; month: string; year: string } | undefined {
  const dt = DateTime.fromISO(isoDate);
  if (!dt.isValid) {
    return undefined;
  }
  return {
    day: String(dt.day),
    month: String(dt.month),
    year: String(dt.year),
  };
}

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
