import { date } from '../../../../../main/modules/nunjucks/filters/date';

describe('date filter', () => {
  it('should format date with default format', () => {
    const isoDate = '2024-03-20T12:00:00Z';
    const result = date(isoDate);
    expect(result).toBe('20 March 2024');
  });

  it('should format date with custom format', () => {
    const isoDate = '2024-03-20T12:00:00Z';
    const customFormat = 'dd/MM/yyyy';
    const result = date(isoDate, customFormat);
    expect(result).toBe('20/03/2024');
  });

  it('should handle different timezones correctly', () => {
    const isoDate = '2024-06-29T23:00:00Z';
    const result = date(isoDate);
    // The result should be in Europe/London timezone
    expect(result).toBe('30 June 2024');
  });

  it('should handle different date formats', () => {
    const isoDate = '2024-03-20T12:00:00Z';
    const formats = [
      { format: 'yyyy-MM-dd', expected: '2024-03-20' },
      { format: 'MMMM d, yyyy', expected: 'March 20, 2024' },
      { format: 'EEEE', expected: 'Wednesday' },
    ];

    formats.forEach(({ format, expected }) => {
      expect(date(isoDate, format)).toBe(expected);
    });
  });

  it('should handle invalid date input', () => {
    const invalidDate = 'invalid-date';
    const result = date(invalidDate);
    // Luxon returns 'Invalid DateTime' for invalid dates
    expect(result).toBe('Invalid DateTime');
  });
});
