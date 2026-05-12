import { asHeaderString } from '../../../main/utils/httpHeaders';

describe('asHeaderString', () => {
  it('returns trimmed string when input is string', () => {
    expect(asHeaderString('  application/pdf  ')).toBe('application/pdf');
  });

  it('returns undefined when input is blank string', () => {
    expect(asHeaderString('   ')).toBeUndefined();
  });

  it('returns string value when input is number', () => {
    expect(asHeaderString(123)).toBe('123');
  });

  it('returns first array item as string when input is array', () => {
    expect(asHeaderString(['inline', 'attachment'])).toBe('inline');
  });

  it('returns undefined for unsupported input', () => {
    expect(asHeaderString(undefined)).toBeUndefined();
  });
});
