import { formatLocalisedDate, toDateLocale } from '@utils/formatLocalisedDate';

describe('formatLocalisedDate', () => {
  it.each([
    ['long', 'en', '20 March 2024'],
    ['long', 'cy', '20 Mawrth 2024'],
    ['ordinal', 'en', '20th March 2024'],
    ['ordinal', 'cy', '20 Mawrth 2024'],
    ['weekday', 'en', 'Wednesday 20 March 2024'],
    ['weekday', 'cy', 'Dydd Mercher 20 Mawrth 2024'],
    ['short', 'en', '20 Mar 2024'],
    ['short', 'cy', '20 Maw 2024'],
  ] as const)('formats %s dates in %s', (style, lang, expected) => {
    expect(formatLocalisedDate('2024-03-20', lang, style)).toBe(expected);
  });

  it('defaults to English long dates', () => {
    expect(formatLocalisedDate('2024-03-20')).toBe('20 March 2024');
  });

  it('uses Welsh month names for every month', () => {
    const months = Array.from(
      { length: 12 },
      (_, i) => formatLocalisedDate(`2024-${String(i + 1).padStart(2, '0')}-01`, 'cy')?.split(' ')[1]
    );
    expect(months).toEqual([
      'Ionawr',
      'Chwefror',
      'Mawrth',
      'Ebrill',
      'Mai',
      'Mehefin',
      'Gorffennaf',
      'Awst',
      'Medi',
      'Hydref',
      'Tachwedd',
      'Rhagfyr',
    ]);
  });

  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [31, '31st'],
  ])('uses the English ordinal suffix for day %i', (day, expected) => {
    expect(formatLocalisedDate(`2024-05-${String(day).padStart(2, '0')}`, 'en', 'ordinal')).toBe(
      `${expected} May 2024`
    );
  });

  it('keeps the calendar date of a date-only value', () => {
    expect(formatLocalisedDate('2024-06-30', 'en')).toBe('30 June 2024');
  });

  it('shows UTC timestamps in UK time', () => {
    expect(formatLocalisedDate('2024-06-29T23:30:00Z', 'en')).toBe('30 June 2024');
    expect(formatLocalisedDate('2024-06-29T23:30:00Z', 'en', 'time')).toBe('00:30');
  });

  it('accepts Date objects', () => {
    expect(formatLocalisedDate(new Date('2024-03-20T12:00:00Z'), 'cy')).toBe('20 Mawrth 2024');
  });

  it.each([undefined, null, '', '   ', 'not-a-date', 42])('returns undefined for %p', value => {
    expect(formatLocalisedDate(value, 'cy')).toBeUndefined();
  });
});

describe('toDateLocale', () => {
  it.each([
    ['cy', 'cy'],
    ['CY', 'cy'],
    ['en', 'en-gb'],
    [undefined, 'en-gb'],
  ])('maps %p to %p', (language, expected) => {
    expect(toDateLocale(language)).toBe(expected);
  });
});
