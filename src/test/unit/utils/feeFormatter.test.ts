import { formatFee } from '@utils/feeFormatter';

describe('feeFormatter', () => {
  describe('formatFee', () => {
    it('should format whole pounds value without zero pence', async () => {
      const formatted = formatFee(1.0);
      expect(formatted).toEqual('1');
    });

    it('should format pounds with pence to include pence', async () => {
      const formatted = formatFee(1.2);
      expect(formatted).toEqual('1.20');
    });

    it('should format zero', async () => {
      const formatted = formatFee(0.0);
      expect(formatted).toEqual('0');
    });
  });
});
