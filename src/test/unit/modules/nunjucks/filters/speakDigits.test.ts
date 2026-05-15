import { speakDigits } from '@modules/nunjucks/filters/speakDigits';

describe('speakDigits filter', () => {
  it('reads numeric strings digit by digit', () => {
    expect(speakDigits('1777570813792018')).toBe('1, 7, 7, 7, 5, 7, 0, 8, 1, 3, 7, 9, 2, 0, 1, 8');
  });

  it('removes non-digits before spacing', () => {
    expect(speakDigits('1777 5708 1379 2018')).toBe('1, 7, 7, 7, 5, 7, 0, 8, 1, 3, 7, 9, 2, 0, 1, 8');
  });

  it('returns empty string for nullish values', () => {
    expect(speakDigits(null)).toBe('');
    expect(speakDigits(undefined)).toBe('');
  });
});
