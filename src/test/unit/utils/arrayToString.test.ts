import { arrayToString } from '../../../main/utils/arrayToString';

describe('arrayToString', () => {
  it('should join non-empty trimmed parts with default separator', () => {
    const result = arrayToString([' 10 Second Avenue ', '', '  ', 'London', null, undefined, ' W3 7RX ']);

    expect(result).toBe('10 Second Avenue, London, W3 7RX');
  });

  it('should return empty string when all parts are empty or falsy', () => {
    const result = arrayToString(['', '   ', null, undefined]);

    expect(result).toBe('');
  });

  it('should use the provided custom separator', () => {
    const result = arrayToString(['Line 1', 'Line 2', 'Line 3'], ' | ');

    expect(result).toBe('Line 1 | Line 2 | Line 3');
  });
});
