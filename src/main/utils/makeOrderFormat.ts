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
