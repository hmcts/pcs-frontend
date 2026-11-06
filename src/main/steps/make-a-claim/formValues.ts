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

const MONEY = /^\d{1,10}(?:\.\d{1,2})?$/;

/** Pounds as typed (commas allowed) to pence as a string, or undefined when it is not an amount. */
export function toPenceString(value: unknown): string | undefined {
  const amount = text(value)?.replace(/,/g, '').replace(/^£/, '');
  if (!amount || !MONEY.test(amount)) {
    return undefined;
  }
  const [pounds, pennies = ''] = amount.split('.');
  return String(Number(pounds) * 100 + Number(pennies.padEnd(2, '0')));
}

/** Pence as a string to pounds for an input, e.g. 150000 as 1500.00. */
export function fromPenceString(value: string | undefined): string | undefined {
  if (value === undefined || value === '' || !/^\d+$/.test(value)) {
    return undefined;
  }
  const pence = Number(value);
  return `${Math.floor(pence / 100)}.${String(pence % 100).padStart(2, '0')}`;
}

export function amountValidator(errorKey: string) {
  return (value: unknown): boolean | string => {
    if (text(value) === undefined) {
      return true;
    }
    return toPenceString(value) === undefined ? errorKey : true;
  };
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
