import { Request } from 'express';

import { getEventIdFromPath } from '@utils/getEventIdFromPath';

const createMockRequest = (originalUrl: string): Request => ({ originalUrl }) as unknown as Request;

describe('getEventIdFromPath', () => {
  describe('valid path mappings', () => {
    it('should return citizenCreateGenApp for make-an-application path', () => {
      const req = createMockRequest('/case/1234567890123456/make-an-application');
      expect(getEventIdFromPath(req)).toBe('citizenCreateGenApp');
    });

    it('should return respondPossessionClaim for respond-to-claim path', () => {
      const req = createMockRequest('/case/1234567890123456/respond-to-claim');
      expect(getEventIdFromPath(req)).toBe('respondPossessionClaim');
    });

    it('should match when path segment appears deeper in URL', () => {
      const req = createMockRequest('/case/1234567890123456/make-an-application/check-your-answers');
      expect(getEventIdFromPath(req)).toBe('citizenCreateGenApp');
    });

    it('should match when path has query parameters', () => {
      const req = createMockRequest('/case/1234567890123456/respond-to-claim?lang=en');
      expect(getEventIdFromPath(req)).toBe('respondPossessionClaim');
    });
  });

  describe('unmatched paths', () => {
    it('should return undefined for an unknown path', () => {
      const req = createMockRequest('/case/1234567890123456/unknown-path');
      expect(getEventIdFromPath(req)).toBeUndefined();
    });

    it('should return undefined for root path', () => {
      const req = createMockRequest('/');
      expect(getEventIdFromPath(req)).toBeUndefined();
    });

    it('should return undefined for empty path', () => {
      const req = createMockRequest('');
      expect(getEventIdFromPath(req)).toBeUndefined();
    });

    it('should return undefined for partial path match', () => {
      const req = createMockRequest('/case/1234567890123456/make-an');
      expect(getEventIdFromPath(req)).toBeUndefined();
    });
  });
});
