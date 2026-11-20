import { strictPoundsToPence } from '../utils/currencyConversion';
import { formatDatePartsToISODate, parseISOToDateParts } from '../utils/dateUtils';

import type { CcdCaseAddress } from '@services/ccdCase.interface';
import type { YesNo } from '@services/citizenPossessionClaim.interface';

export type FormBody = Record<string, unknown>;

export interface DateParts {
  day: string;
  month: string;
  year: string;
}

export function text(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function toYesNo(value: unknown): YesNo | undefined {
  if (value === 'yes') {
    return 'YES';
  }
  if (value === 'no') {
    return 'NO';
  }
  return undefined;
}

export function fromYesNo(value: YesNo | undefined): 'yes' | 'no' | undefined {
  if (value === 'YES') {
    return 'yes';
  }
  if (value === 'NO') {
    return 'no';
  }
  return undefined;
}

export function amountValidator(errorKey: string) {
  return (value: unknown): boolean | string => {
    if (text(value) === undefined) {
      return true;
    }
    return strictPoundsToPence(value) === undefined ? errorKey : true;
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks an email address's format, when one is given. */
export function emailValidator(errorKey: string) {
  return (value: unknown): boolean | string =>
    typeof value === 'string' && value.trim() && !EMAIL.test(value.trim()) ? errorKey : true;
}

/** A date field from the submitted body: top level fields arrive as {day, month, year}, nested ones as parts. */
export function dateFromBody(body: FormBody, name: string): string | undefined {
  const consolidated = body[name];
  if (consolidated && typeof consolidated === 'object' && !Array.isArray(consolidated)) {
    const { day = '', month = '', year = '' } = consolidated as Partial<DateParts>;
    return formatDatePartsToISODate(day, month, year);
  }
  return formatDatePartsToISODate(
    String(body[`${name}-day`] ?? ''),
    String(body[`${name}-month`] ?? ''),
    String(body[`${name}-year`] ?? '')
  );
}

export function toDateParts(isoDate: string | undefined): DateParts | undefined {
  return isoDate ? parseISOToDateParts(isoDate) : undefined;
}

export function checkedValues<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return values.filter((item): item is T => allowed.includes(item as T));
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find(item => item === value);
}

export const ADDRESS_PARTS = ['addressLine1', 'addressLine2', 'town', 'county', 'postcode'] as const;

export type AddressPart = (typeof ADDRESS_PARTS)[number];

export function addressFieldName(prefix: string, part: AddressPart): string {
  return `${prefix}-${part}`;
}

export function addressFromBody(body: FormBody, prefix: string): CcdCaseAddress | undefined {
  const part = (name: AddressPart) => text(body[addressFieldName(prefix, name)]);
  const address: CcdCaseAddress = {
    AddressLine1: part('addressLine1'),
    AddressLine2: part('addressLine2'),
    PostTown: part('town'),
    County: part('county'),
    PostCode: part('postcode')?.toUpperCase(),
  };
  const defined = Object.fromEntries(Object.entries(address).filter(([, value]) => value !== undefined));
  return Object.keys(defined).length > 0 ? (defined as CcdCaseAddress) : undefined;
}

export function addressToForm(address: CcdCaseAddress | undefined, prefix: string): FormBody {
  if (!address) {
    return {};
  }
  return {
    [addressFieldName(prefix, 'addressLine1')]: address.AddressLine1 ?? '',
    [addressFieldName(prefix, 'addressLine2')]: address.AddressLine2 ?? '',
    [addressFieldName(prefix, 'town')]: address.PostTown ?? '',
    [addressFieldName(prefix, 'county')]: address.County ?? '',
    [addressFieldName(prefix, 'postcode')]: address.PostCode ?? '',
  };
}

export function indexFromQuery(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || !/^\d{1,3}$/.test(raw)) {
    return undefined;
  }
  return Number(raw);
}

/**
 * Stands in for an answer that was given but could not be read, such as a date that does not exist or an
 * amount with letters in it. Before a save it becomes the answer saved before, so a Save for later (which skips
 * validation) never wipes out a good answer. An empty answer is a cleared one and is not marked.
 */
export const UNREADABLE = '\u0000unreadable';

export function isReadable<T>(value: T | typeof UNREADABLE | undefined): value is T {
  return value !== undefined && value !== UNREADABLE;
}

/** An amount in pence, undefined when left empty, or {@link UNREADABLE}. */
export function readPence(value: unknown): string | undefined {
  if (text(value) === undefined) {
    return undefined;
  }
  return strictPoundsToPence(value) ?? UNREADABLE;
}

/** A yyyy-MM-dd date, undefined when every part was left empty, or {@link UNREADABLE}. */
export function readDate(body: FormBody, name: string): string | undefined {
  const consolidated = body[name];
  const parts =
    consolidated && typeof consolidated === 'object' && !Array.isArray(consolidated)
      ? Object.values(consolidated as Record<string, unknown>)
      : [body[`${name}-day`], body[`${name}-month`], body[`${name}-year`]];
  if (parts.every(part => text(part) === undefined)) {
    return undefined;
  }
  return dateFromBody(body, name) ?? UNREADABLE;
}
