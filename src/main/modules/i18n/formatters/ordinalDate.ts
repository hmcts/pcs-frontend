import type i18next from 'i18next';

const ordinalSuffixes: Record<string, string> = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
};

type OrdinalDateOptions = Intl.DateTimeFormatOptions & {
  formatParams?: Record<string, Intl.DateTimeFormatOptions & { locale?: string }>;
  interpolationkey?: string;
  locale?: string;
};

function toValidDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
}

function resolveOptions(lng?: string, options?: OrdinalDateOptions): Intl.DateTimeFormatOptions & { locale: string } {
  const nestedOptions =
    options?.interpolationkey && options.formatParams?.[options.interpolationkey]
      ? options.formatParams[options.interpolationkey]
      : {};
  const locale = nestedOptions.locale ?? options?.locale ?? (lng === 'cy' ? 'cy-GB' : 'en-GB');

  return {
    month: nestedOptions.month ?? options?.month ?? 'long',
    year: nestedOptions.year ?? options?.year ?? 'numeric',
    locale,
  };
}

export function formatOrdinalDate(value: unknown, lng?: string, options?: OrdinalDateOptions): string {
  const date = toValidDate(value);
  if (!date) {
    return typeof value === 'string' ? value : '';
  }

  const { locale, ...dateFormatOptions } = resolveOptions(lng, options);
  const day = date.getDate();

  if (locale !== 'en-GB') {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      ...dateFormatOptions,
    }).format(date);
  }

  const ordinalRule = new Intl.PluralRules(locale, { type: 'ordinal' }).select(day);
  const suffix = ordinalSuffixes[ordinalRule] ?? ordinalSuffixes.other;
  const monthAndYear = new Intl.DateTimeFormat(locale, dateFormatOptions).format(date);

  return `${day}${suffix} ${monthAndYear}`;
}

export const ordinalDate = (i18n: typeof i18next): void => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - i18next formatter is not typed
  i18n.services?.formatter?.add(
    'ordinalDate',
    (value: unknown, lng: string | undefined, options: OrdinalDateOptions): string =>
      formatOrdinalDate(value, lng, options)
  );
};
