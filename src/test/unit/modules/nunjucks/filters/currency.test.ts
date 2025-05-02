import { currency } from '../../../../../main/modules/nunjucks/filters/currency';

describe('currency filter', () => {
  it('should format whole numbers with two decimal places', () => {
    expect(currency(100)).toBe('£100.00');
  });

  it('should format decimal numbers with two decimal places', () => {
    expect(currency(99.99)).toBe('£99.99');
  });

  it('should format numbers with more than two decimal places by rounding', () => {
    expect(currency(50.999)).toBe('£51.00');
  });

  it('should format zero correctly', () => {
    expect(currency(0)).toBe('£0.00');
  });

  it('should format negative numbers correctly', () => {
    expect(currency(-10.5)).toBe('£-10.50');
  });
});
