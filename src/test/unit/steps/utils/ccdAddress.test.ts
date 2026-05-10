import { buildCcdAddressFromFormParts, formatCcdAddress } from '../../../../main/steps/utils/ccdAddress';

describe('ccdAddress utilities', () => {
  describe('buildCcdAddressFromFormParts', () => {
    it('builds a CCD address from all required parts', () => {
      const result = buildCcdAddressFromFormParts({
        addressLine1: '1 High Street',
        townOrCity: 'London',
        postcode: 'SW1A 1AA',
      });

      expect(result).toEqual({
        AddressLine1: '1 High Street',
        PostTown: 'London',
        PostCode: 'SW1A 1AA',
      });
    });

    it('includes optional addressLine2 when provided', () => {
      const result = buildCcdAddressFromFormParts({
        addressLine1: '1 High Street',
        addressLine2: 'Flat 4',
        townOrCity: 'London',
        postcode: 'SW1A 1AA',
      });

      expect(result.AddressLine2).toBe('Flat 4');
    });

    it('omits addressLine2 when undefined', () => {
      const result = buildCcdAddressFromFormParts({
        addressLine1: '1 High Street',
        townOrCity: 'London',
        postcode: 'SW1A 1AA',
      });

      expect(result).not.toHaveProperty('AddressLine2');
    });

    it('omits addressLine2 when empty string', () => {
      const result = buildCcdAddressFromFormParts({
        addressLine1: '1 High Street',
        addressLine2: '',
        townOrCity: 'London',
        postcode: 'SW1A 1AA',
      });

      expect(result).not.toHaveProperty('AddressLine2');
    });

    it('includes optional county when provided', () => {
      const result = buildCcdAddressFromFormParts({
        addressLine1: '1 High Street',
        townOrCity: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
      });

      expect(result.County).toBe('Greater London');
    });

    it('omits county when undefined or empty', () => {
      const undefinedResult = buildCcdAddressFromFormParts({
        addressLine1: '1 High Street',
        townOrCity: 'London',
        postcode: 'SW1A 1AA',
      });
      const emptyResult = buildCcdAddressFromFormParts({
        addressLine1: '1 High Street',
        townOrCity: 'London',
        county: '',
        postcode: 'SW1A 1AA',
      });

      expect(undefinedResult).not.toHaveProperty('County');
      expect(emptyResult).not.toHaveProperty('County');
    });
  });

  describe('formatCcdAddress', () => {
    it('joins all populated address parts with comma separator', () => {
      const result = formatCcdAddress({
        AddressLine1: '1 High Street',
        AddressLine2: 'Flat 4',
        PostTown: 'London',
        County: 'Greater London',
        PostCode: 'SW1A 1AA',
      });

      expect(result).toBe('1 High Street, Flat 4, London, Greater London, SW1A 1AA');
    });

    it('skips empty and undefined parts', () => {
      const result = formatCcdAddress({
        AddressLine1: '1 High Street',
        AddressLine2: '',
        PostTown: 'London',
        PostCode: 'SW1A 1AA',
      });

      expect(result).toBe('1 High Street, London, SW1A 1AA');
    });

    it('includes Country when present', () => {
      const result = formatCcdAddress({
        AddressLine1: '1 High Street',
        PostTown: 'London',
        PostCode: 'SW1A 1AA',
        Country: 'United Kingdom',
      });

      expect(result).toBe('1 High Street, London, SW1A 1AA, United Kingdom');
    });

    it('returns empty string for undefined address', () => {
      expect(formatCcdAddress(undefined)).toBe('');
    });

    it('returns empty string for null address', () => {
      expect(formatCcdAddress(null)).toBe('');
    });

    it('returns empty string for an address with only empty parts', () => {
      expect(formatCcdAddress({ AddressLine1: '', PostTown: '', PostCode: '' })).toBe('');
    });

    it('trims whitespace from parts', () => {
      const result = formatCcdAddress({
        AddressLine1: '  1 High Street  ',
        PostTown: '  London  ',
        PostCode: '  SW1A 1AA  ',
      });

      expect(result).toBe('1 High Street, London, SW1A 1AA');
    });
  });
});
