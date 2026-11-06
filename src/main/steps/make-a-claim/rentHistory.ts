import type { CcdCollectionItem } from '@services/ccdCase.interface';
import type {
  RentFrequency,
  RentLedgerEntry,
  RentTableRow,
  TransactionType,
} from '@services/citizenPossessionClaim.interface';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since the epoch for a yyyy-MM-dd date, so date arithmetic never depends on the server's time zone. */
function toDayNumber(isoDate: string): number | undefined {
  const match = ISO_DATE.exec(isoDate);
  if (!match) {
    return undefined;
  }
  const [, year, month, day] = match.map(Number);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }
  return time / 86_400_000;
}

function fromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * 86_400_000).toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function monthlyDueDate(year: number, monthIndex: number, dueDay: number): string {
  const normalisedYear = year + Math.floor(monthIndex / 12);
  const normalisedMonth = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(dueDay, daysInMonth(normalisedYear, normalisedMonth));
  return fromDayNumber(Date.UTC(normalisedYear, normalisedMonth, day) / 86_400_000);
}

export function toPence(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const pence = Number(value);
  return Number.isFinite(pence) ? pence : 0;
}

/** Frequencies the table design can lay out as regular periods. */
export const TABLE_FREQUENCIES: readonly RentFrequency[] = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'];

export const MAX_RENT_PERIODS = 260;

export interface RentPeriodsInput {
  rentAmount: string;
  rentFrequency: RentFrequency;
  rentDueDay?: number;
  statementStart: string;
  statementEnd: string;
}

/**
 * The rent due in each period between two dates (inclusive), one row per period. Weekly and fortnightly rent
 * is due every 7 or 14 days from the start date; monthly rent on the due day of each month, or that month's
 * last day when it is shorter.
 */
export function generateRentPeriods(input: RentPeriodsInput): RentTableRow[] {
  const start = toDayNumber(input.statementStart);
  const end = toDayNumber(input.statementEnd);
  if (start === undefined || end === undefined || end < start || !TABLE_FREQUENCIES.includes(input.rentFrequency)) {
    return [];
  }

  const dueDates: string[] = [];
  if (input.rentFrequency === 'MONTHLY') {
    const dueDay = input.rentDueDay ?? Number(input.statementStart.slice(8, 10));
    const startYear = Number(input.statementStart.slice(0, 4));
    let monthIndex = Number(input.statementStart.slice(5, 7)) - 1;
    let due = monthlyDueDate(startYear, monthIndex, dueDay);
    if ((toDayNumber(due) as number) < start) {
      monthIndex++;
      due = monthlyDueDate(startYear, monthIndex, dueDay);
    }
    while ((toDayNumber(due) as number) <= end && dueDates.length < MAX_RENT_PERIODS) {
      dueDates.push(due);
      monthIndex++;
      due = monthlyDueDate(startYear, monthIndex, dueDay);
    }
  } else {
    const step = input.rentFrequency === 'WEEKLY' ? 7 : 14;
    for (let day = start; day <= end && dueDates.length < MAX_RENT_PERIODS; day += step) {
      dueDates.push(fromDayNumber(day));
    }
  }

  return dueDates.map(dateDue => ({ periodStart: dateDue, dateDue, amountDue: input.rentAmount }));
}

/**
 * Regenerates the periods for a changed rent or statement period, keeping every payment already entered
 * against a period that still exists.
 */
export function mergeRentPeriods(
  generated: RentTableRow[],
  existing: CcdCollectionItem<RentTableRow>[] | undefined
): CcdCollectionItem<RentTableRow>[] {
  const existingRows = existing ?? [];
  return generated.flatMap(period => {
    const rowsForPeriod = existingRows.filter(row => row.value.periodStart === period.periodStart);
    const [primary, ...additional] = rowsForPeriod;
    const primaryRow: CcdCollectionItem<RentTableRow> = {
      ...(primary?.id ? { id: primary.id } : {}),
      value: {
        ...period,
        ...(primary?.value.datePaid ? { datePaid: primary.value.datePaid } : {}),
        ...(primary?.value.amountPaid ? { amountPaid: primary.value.amountPaid } : {}),
      },
    };
    return [primaryRow, ...additional];
  });
}

export interface RentTableLine {
  rowIndex: number;
  periodStart?: string;
  isAdditionalPayment: boolean;
  dateDue?: string;
  amountDue?: number;
  datePaid?: string;
  amountPaid?: number;
  arrears: number;
}

/** The rent statement in period order, each payment under its period, with the arrears after each line. */
export function rentTableWithArrears(rows: CcdCollectionItem<RentTableRow>[] | undefined): RentTableLine[] {
  const indexed = (rows ?? []).map((row, rowIndex) => ({ row: row.value, rowIndex }));
  const periods = [...new Set(indexed.map(({ row }) => row.periodStart ?? ''))].sort();
  let arrears = 0;
  return periods.flatMap(periodStart => {
    const inPeriod = indexed.filter(({ row }) => (row.periodStart ?? '') === periodStart);
    const primaryIndex = inPeriod.findIndex(({ row }) => row.amountDue !== undefined && row.amountDue !== '');
    const ordered =
      primaryIndex > 0 ? [inPeriod[primaryIndex], ...inPeriod.filter((_, i) => i !== primaryIndex)] : inPeriod;
    return ordered.map(({ row, rowIndex }, position) => {
      const amountDue = row.amountDue ? toPence(row.amountDue) : undefined;
      const amountPaid = row.amountPaid ? toPence(row.amountPaid) : undefined;
      arrears += (amountDue ?? 0) - (amountPaid ?? 0);
      return {
        rowIndex,
        periodStart: row.periodStart,
        isAdditionalPayment: position > 0,
        dateDue: position === 0 ? row.dateDue : undefined,
        amountDue,
        datePaid: row.datePaid,
        amountPaid,
        arrears,
      };
    });
  });
}

/** Records a payment against a period: on the period's own row when it has none yet, otherwise as another row. */
export function addRentTablePayment(
  rows: CcdCollectionItem<RentTableRow>[] | undefined,
  periodStart: string,
  payment: { datePaid: string; amountPaid: string }
): CcdCollectionItem<RentTableRow>[] {
  const updated = [...(rows ?? [])];
  const primaryIndex = updated.findIndex(row => row.value.periodStart === periodStart && !row.value.amountPaid);
  if (primaryIndex !== -1 && updated[primaryIndex].value.amountDue) {
    updated[primaryIndex] = { ...updated[primaryIndex], value: { ...updated[primaryIndex].value, ...payment } };
    return updated;
  }
  return [...updated, { value: { periodStart, ...payment } }];
}

export interface LedgerLine {
  entryIndex: number;
  transactionDate?: string;
  transactionTypes: TransactionType[];
  description?: string;
  amountCharged?: number;
  amountPaid?: number;
  arrears: number;
}

/** The ledger in date order (entries on the same date keep the order they were added in), with the arrears after each. */
export function ledgerWithArrears(entries: CcdCollectionItem<RentLedgerEntry>[] | undefined): LedgerLine[] {
  let arrears = 0;
  return (entries ?? [])
    .map((entry, entryIndex) => ({ entry: entry.value, entryIndex }))
    .sort((a, b) => (a.entry.transactionDate ?? '').localeCompare(b.entry.transactionDate ?? ''))
    .map(({ entry, entryIndex }) => {
      const types = entry.transactionTypes ?? [];
      const amountCharged = types.includes('RENT_CHARGE') ? toPence(entry.amountCharged) : undefined;
      const amountPaid = types.includes('TENANT_PAYMENT') ? toPence(entry.amountPaid) : undefined;
      arrears += (amountCharged ?? 0) - (amountPaid ?? 0);
      return {
        entryIndex,
        transactionDate: entry.transactionDate,
        transactionTypes: types,
        description: entry.description,
        amountCharged,
        amountPaid,
        arrears,
      };
    });
}

/** Formats pence as pounds for display, e.g. 123456 as £1,234.56. */
export function formatPence(pence: number | string | undefined): string {
  if (pence === undefined || pence === '') {
    return '';
  }
  const value = typeof pence === 'string' ? toPence(pence) : pence;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value / 100);
}
