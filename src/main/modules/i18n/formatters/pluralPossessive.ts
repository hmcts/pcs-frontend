import type i18next from 'i18next';

export const pluralPossessive = (i18n: typeof i18next): void => {
  i18n.services?.formatter?.add(
    'pluralPossessive',
    (value: string, lng: string | undefined, options: { format?: string }): string => {
      if (!options?.format) {
        options.format = '’';
      }

      const trimmedValue = value.trim();

      if (lng === 'en' || lng === 'cy') {
        return trimmedValue.toLowerCase().endsWith('s')
          ? `${trimmedValue}${options.format}`
          : `${trimmedValue}${options.format}s`;
      }
      return trimmedValue;
    }
  );
};
