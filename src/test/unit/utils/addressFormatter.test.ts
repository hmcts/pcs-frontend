import { formatAddressParts } from '../../../main/utils/addressFormatter';

describe('formatAddressParts', () => {
  it('should join non-empty trimmed parts with default separator', () => {
    const result = formatAddressParts([' 10 Second Avenue ', '', '  ', 'London', null, undefined, ' W3 7RX ']);

    expect(result).toBe('10 Second Avenue, London, W3 7RX');
  });

  it('should return empty string when all parts are empty or falsy', () => {
    const result = formatAddressParts(['', '   ', null, undefined]);

    expect(result).toBe('');
  });

  it('should use the provided custom separator', () => {
    const result = formatAddressParts(['Line 1', 'Line 2', 'Line 3'], ' | ');

    expect(result).toBe('Line 1 | Line 2 | Line 3');
  });
});
