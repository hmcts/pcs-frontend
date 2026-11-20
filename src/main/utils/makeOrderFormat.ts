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
/** A time as typed, as pcs-api is sent it (HH:mm), or undefined if it is blank or not a time. */
export function isoTime(raw: string): string | undefined {
  const time = parseTime(raw);
  return time && `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;
}

export function formatTime({ hours, minutes }: TimeOfDay): string {
  if (minutes === 0 && (hours === 0 || hours === 12)) {
    return hours === 0 ? 'midnight' : 'midday';
  }
  const hour = hours % 12 || 12;
  const suffix = hours < 12 ? 'am' : 'pm';
  return minutes ? `${hour}:${String(minutes).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}

const DISTRICT_REGISTRY = 'district registry';

/** A District Registry as the judge named it, without "District Registry" if they typed it after the name. */
export function registryName(typed: string): string {
  const name = typed.trim();
  return name.toLowerCase().endsWith(DISTRICT_REGISTRY) ? name.slice(0, -DISTRICT_REGISTRY.length).trim() : name;
}

/** A hearing's time estimate as HMC and List Assist give it: days, hours and minutes. */
export const TIME_ESTIMATE_PARTS = ['days', 'hours', 'minutes'] as const;
export type TimeEstimatePart = (typeof TIME_ESTIMATE_PARTS)[number];
export type TimeEstimate = Record<TimeEstimatePart, number>;

/**
 * The time estimate the three fields give, each blank or a whole number, and minutes under an hour; none when a
 * field is not one or every one is blank or nought.
 */
export function parseTimeEstimate(typed: Record<TimeEstimatePart, string>): TimeEstimate | undefined {
  const parts = {} as TimeEstimate;
  for (const part of TIME_ESTIMATE_PARTS) {
    const raw = typed[part].trim();
    if (raw && !/^\d{1,3}$/.test(raw)) {
      return undefined;
    }
    parts[part] = Number(raw || 0);
  }
  return parts.minutes < 60 && TIME_ESTIMATE_PARTS.some(part => parts[part] > 0) ? parts : undefined;
}

/** "3 days, 4 hours and 30 minutes", leaving out the parts that are nought. */
export function formatTimeEstimate(estimate: TimeEstimate): string {
  const named = TIME_ESTIMATE_PARTS.filter(part => estimate[part] > 0).map(part =>
    estimate[part] === 1 ? `1 ${part.slice(0, -1)}` : `${estimate[part]} ${part}`
  );
  return named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}` : named[0];
}

/** A date as an ISO day, "2026-12-25", from its local parts. */
function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * The date, or the first after it that is a working day: not a Saturday, Sunday or one of the bank holidays (ISO
 * days). A date to do something by that falls when the court office is closed runs to the next day it is open.
 */
export function workingDayOnOrAfter(date: Date, bankHolidays: readonly string[]): Date {
  const holidays = new Set(bankHolidays);
  const working = new Date(date);
  while (working.getDay() === 0 || working.getDay() === 6 || holidays.has(isoDay(working))) {
    working.setDate(working.getDate() + 1);
  }
  return working;
}
