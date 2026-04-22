import { Request } from 'express';

import { getEventIdFromPath } from '@utils/getEventIdFromPath';

const CASE_REF = '1234567890123456';

const createMockRequest = (path: string, caseReference = CASE_REF): Request =>
  ({ path, params: { caseReference } }) as unknown as Request;

describe('getEventIdFromPath', () => {
  describe('valid path mappings', () => {
    it('should return citizenCreateGenApp for make-an-application journey', () => {
      const req = createMockRequest(`/case/${CASE_REF}/make-an-application`);
      expect(getEventIdFromPath(req)).toBe('citizenCreateGenApp');
    });

    it('should return respondPossessionClaim for respond-to-claim journey', () => {
      const req = createMockRequest(`/case/${CASE_REF}/respond-to-claim`);
      expect(getEventIdFromPath(req)).toBe('respondPossessionClaim');
    });

    it('should match the journey segment with deeper path segments', () => {
      const req = createMockRequest(`/case/${CASE_REF}/make-an-application/check-your-answers`);
      expect(getEventIdFromPath(req)).toBe('citizenCreateGenApp');
    });

    it('should match regardless of trailing slash', () => {
      const req = createMockRequest(`/case/${CASE_REF}/respond-to-claim/`);
      expect(getEventIdFromPath(req)).toBe('respondPossessionClaim');
    });
  });

  describe('journey segment matching', () => {
    it('should only match the segment immediately after the case reference', () => {
      const req = createMockRequest(`/case/${CASE_REF}/respond-to-claim/make-an-application`);
      expect(getEventIdFromPath(req)).toBe('respondPossessionClaim');
    });

    it('should not match when journey name appears only in a later segment', () => {
      const req = createMockRequest(`/case/${CASE_REF}/some-journey/make-an-application`);
      expect(getEventIdFromPath(req)).toBeUndefined();
    });

    it('should not match when mapping path is embedded in a longer segment', () => {
      const req = createMockRequest(`/case/${CASE_REF}/pre-make-an-application-suffix`);
      expect(getEventIdFromPath(req)).toBeUndefined();
    });
  });

  describe('missing or invalid params', () => {
    it('should return undefined when caseReference param is missing', () => {
      const req = { path: `/case/${CASE_REF}/make-an-application`, params: {} } as unknown as Request;
      expect(getEventIdFromPath(req)).toBeUndefined();
    });

    it('should return undefined when params is undefined', () => {
      const req = { path: `/case/${CASE_REF}/make-an-application` } as unknown as Request;
      expect(getEventIdFromPath(req)).toBeUndefined();
    });
  });

  describe('unmatched paths', () => {
    it('should return undefined for an unknown journey', () => {
      const req = createMockRequest(`/case/${CASE_REF}/unknown-path`);
      expect(getEventIdFromPath(req)).toBeUndefined();
    });

    it('should return undefined when path has no segment after case reference', () => {
      const req = createMockRequest(`/case/${CASE_REF}`);
      expect(getEventIdFromPath(req)).toBeUndefined();
    });

    it('should return undefined for empty path', () => {
      const req = createMockRequest('');
      expect(getEventIdFromPath(req)).toBeUndefined();
    });
  });
});
