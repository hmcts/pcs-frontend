import i18next from 'i18next';

import { formatOrdinalDate, ordinalDate } from '@modules/i18n/formatters/ordinalDate';

describe('ordinalDate formatter', () => {
  it.each([
    [1, '1st May 2025'],
    [2, '2nd May 2025'],
    [3, '3rd May 2025'],
    [4, '4th May 2025'],
    [11, '11th May 2025'],
    [12, '12th May 2025'],
    [13, '13th May 2025'],
    [21, '21st May 2025'],
    [22, '22nd May 2025'],
    [23, '23rd May 2025'],
    [31, '31st May 2025'],
  ])('formats %s May 2025 as %s', (day, expected) => {
    expect(formatOrdinalDate(new Date(2025, 4, day), 'en')).toBe(expected);
  });

  it('returns the original string when the value is not a valid date', () => {
    expect(formatOrdinalDate('not-a-date', 'en')).toBe('not-a-date');
  });

  it('registers an i18next ordinalDate formatter', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            question: 'Since {{claimIssueDate, ordinalDate}}',
          },
        },
      },
    });

    ordinalDate(i18n);

    expect(i18n.t('question', { claimIssueDate: new Date(2025, 4, 20) })).toBe('Since 20th May 2025');
  });

  it('supports i18next formatParams for the interpolation value', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            question: 'Since {{claimIssueDate, ordinalDate}}',
          },
        },
      },
    });

    ordinalDate(i18n);

    expect(
      i18n.t('question', {
        claimIssueDate: new Date(2025, 4, 20),
        formatParams: {
          claimIssueDate: {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            locale: 'en-GB',
          },
        },
      })
    ).toBe('Since 20th May 2025');
  });

  it('prefers value-specific formatParams over loose formatter options', () => {
    expect(
      formatOrdinalDate(new Date(2026, 5, 15), 'en', {
        month: 'short',
        year: '2-digit',
        formatParams: {
          claimIssueDate: {
            month: 'long',
            year: 'numeric',
            locale: 'en-GB',
          },
        },
        interpolationkey: 'claimIssueDate',
      })
    ).toBe('15th June 2026');
  });
});
