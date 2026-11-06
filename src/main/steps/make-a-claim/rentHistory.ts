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
 * Lays the statement out again for a changed rent or statement period, carrying every payment already entered
 * over by its date: to the latest period due on or before it was paid, or the first period for one paid earlier.
 * No payment is dropped, even one outside the new statement period.
 */
export function mergeRentPeriods(
  generated: RentTableRow[],
  existing: CcdCollectionItem<RentTableRow>[] | undefined
): CcdCollectionItem<RentTableRow>[] {
  const existingRows = existing ?? [];
  if (generated.length === 0) {
    return existingRows;
  }
  const payments = existingRows
    .filter(row => row.value.amountPaid)
    .map(row => ({ datePaid: row.value.datePaid, amountPaid: row.value.amountPaid as string }))
    .sort((a, b) => (a.datePaid ?? '').localeCompare(b.datePaid ?? ''));
  const periodFor = (datePaid: string | undefined): string => {
    const due = [...generated].reverse().find(period => datePaid && (period.dateDue ?? '') <= datePaid);
    return (due ?? generated[0]).periodStart as string;
  };
  return generated.flatMap(period => {
    const primary = existingRows.find(row => row.value.periodStart === period.periodStart && row.value.amountDue);
    const [first, ...others] = payments.filter(payment => periodFor(payment.datePaid) === period.periodStart);
    const paid = (payment: (typeof payments)[number]) => ({
      ...(payment.datePaid ? { datePaid: payment.datePaid } : {}),
      amountPaid: payment.amountPaid,
    });
    return [
      { ...(primary?.id ? { id: primary.id } : {}), value: { ...period, ...(first ? paid(first) : {}) } },
      ...others.map(payment => ({ value: { periodStart: period.periodStart, ...paid(payment) } })),
    ];
  });
}

export interface StatementRange {
  statementStart: string;
  statementEnd: string;
}

/**
 * The period a rent statement covers, read back from its rows when the dates the claimant gave are not to hand:
 * from the first period to the day before the period after the last one would have been due.
 */
export function statementRangeOf(
  rows: CcdCollectionItem<RentTableRow>[] | undefined,
  schedule: { rentFrequency?: RentFrequency; rentDueDay?: number }
): StatementRange | undefined {
  const starts = (rows ?? [])
    .map(row => row.value.periodStart ?? '')
    .filter(start => toDayNumber(start) !== undefined)
    .sort();
  if (starts.length === 0) {
    return undefined;
  }
  const last = starts[starts.length - 1];
  const lastDay = toDayNumber(last) as number;
  let nextDue: number;
  if (schedule.rentFrequency === 'MONTHLY') {
    const year = Number(last.slice(0, 4));
    const monthIndex = Number(last.slice(5, 7));
    nextDue = toDayNumber(monthlyDueDate(year, monthIndex, schedule.rentDueDay ?? Number(last.slice(8, 10)))) as number;
  } else if (schedule.rentFrequency === 'WEEKLY' || schedule.rentFrequency === 'FORTNIGHTLY') {
    nextDue = lastDay + (schedule.rentFrequency === 'WEEKLY' ? 7 : 14);
  } else {
    nextDue = lastDay + 1;
  }
  return { statementStart: starts[0], statementEnd: fromDayNumber(Math.max(lastDay, nextDue - 1)) };
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
  id?: string;
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
    .map((entry, entryIndex) => ({ entry: entry.value, entryIndex, id: entry.id ?? undefined }))
    .sort((a, b) => (a.entry.transactionDate ?? '').localeCompare(b.entry.transactionDate ?? ''))
    .map(({ entry, entryIndex, id }) => {
      const types = entry.transactionTypes ?? [];
      const amountCharged = types.includes('RENT_CHARGE') ? toPence(entry.amountCharged) : undefined;
      const amountPaid = types.includes('TENANT_PAYMENT') ? toPence(entry.amountPaid) : undefined;
      arrears += (amountCharged ?? 0) - (amountPaid ?? 0);
      return {
        entryIndex,
        ...(id ? { id } : {}),
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
