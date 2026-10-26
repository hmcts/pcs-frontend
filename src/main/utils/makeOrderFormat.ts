/** Parsing and formatting of the money and date answers on the make order form (server and browser). */

/** The most any amount on an order can be. */
export const MAX_MONEY = 1_000_000_000;

/** An amount in pounds, with no more than two decimal places, whatever its size. */
function amountOf(raw: string): number | undefined {
  const amount = raw.trim().replace(/,/g, '');
  return /^\d+(\.\d{1,2})?$/.test(amount) ? Number(amount) : undefined;
}

export function parseMoney(raw: string): number | undefined {
  const amount = amountOf(raw);
  return amount !== undefined && amount <= MAX_MONEY ? amount : undefined;
}

export function exceedsMaxMoney(raw: string): boolean {
  return (amountOf(raw) ?? 0) > MAX_MONEY;
}

export interface TimeOfDay {
  hours: number;
  minutes: number;
}

/** A time of day on the 24 hour clock, such as 14:30, or the 12 hour clock, such as 10:30am or 2 p.m. */
export function parseTime(raw: string): TimeOfDay | undefined {
  const time = raw.trim();
  const twentyFourHour = /^(\d{1,2})[:.](\d{2})$/.exec(time);
  if (twentyFourHour) {
    const [hours, minutes] = [Number(twentyFourHour[1]), Number(twentyFourHour[2])];
    return hours <= 23 && minutes <= 59 ? { hours, minutes } : undefined;
  }
  const twelveHour = /^(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s*m\.?$/i.exec(time);
  if (twelveHour) {
    const [hour, minutes] = [Number(twelveHour[1]), Number(twelveHour[2] ?? 0)];
    const pm = twelveHour[3].toLowerCase() === 'p';
    return hour >= 1 && hour <= 12 && minutes <= 59 ? { hours: (hour % 12) + (pm ? 12 : 0), minutes } : undefined;
  }
  return undefined;
}

export function parseDate(day: string, month: string, year: string): Date | undefined {
  const [d, m, y] = [day, month, year].map(part => Number(part.trim()));
  const parsed = new Date(Date.UTC(y, m - 1, d));
  const valid =
    d > 0 &&
    m > 0 &&
    y > 0 &&
    parsed.getUTCDate() === d &&
    parsed.getUTCMonth() === m - 1 &&
    parsed.getUTCFullYear() === y;
  return valid ? parsed : undefined;
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    date
  );
}

/** A time as GOV.UK writes it: 10:30am, 2pm, midday or midnight. */
export function formatTime({ hours, minutes }: TimeOfDay): string {
  if (minutes === 0 && (hours === 0 || hours === 12)) {
    return hours === 0 ? 'midnight' : 'midday';
  }
  const hour = hours % 12 || 12;
  const suffix = hours < 12 ? 'am' : 'pm';
  return minutes ? `${hour}:${String(minutes).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}
