import {
  accessRules,
  evaluateLoginAccess,
  findRuleForPath,
  rolesForRule,
  userMayAccessPath,
} from '../../../main/access-control/accessRules';

describe('accessRules', () => {
  describe('findRuleForPath', () => {
    it.each([
      ['/case/1234567890123456/respond-to-claim', 'respond-to-claim'],
      ['/case/1234567890123456/respond-to-claim/start-now', 'respond-to-claim'],
      ['/case/1234567890123456/dashboard', 'dashboard'],
      ['/case/1234567890123456/dashboard/something', 'dashboard'],
      ['/case/1234567890123456/make-an-application', 'make-an-application'],
      ['/case/1234567890123456/make-an-application/select-type', 'make-an-application'],
      ['/case/1234567890123456/upload-additional-documents', 'upload-additional-documents'],
      ['/case/1234567890123456/upload-additional-documents/start-evidence-upload', 'upload-additional-documents'],
      ['/claims', 'claims'],
      ['/claims/anything', 'claims'],
      ['/access-your-case', 'access-your-case'],
      ['/access-your-case/x', 'access-your-case'],
      ['/case/1234567890123456/view-the-claim', 'view-the-claim'],
      ['/case/1234567890123456/view-documents', 'view-documents'],
      ['/case/1234567890123456/view-documents/doc-1', 'view-documents'],
      ['/case/1234567890123456/view-hearing-documents', 'view-hearing-documents'],
      ['/case/1234567890123456/view-orders-and-notices', 'view-orders-and-notices'],
      ['/case/1234567890123456/view-all-applications', 'view-all-applications'],
    ])('matches gated path %s to rule "%s"', (path, expectedRuleName) => {
      expect(findRuleForPath(path)?.name).toBe(expectedRuleName);
    });

    it.each(['/', '/login', '/case/1234567890123456/access-code', '/api/postcode-lookup'])(
      'returns undefined for ungated path %s',
      path => {
        expect(findRuleForPath(path)).toBeUndefined();
      }
    );
  });

  describe('userMayAccessPath', () => {
    it('allows access to ungated paths regardless of roles', () => {
      expect(userMayAccessPath([], '/login')).toBe(true);
      expect(userMayAccessPath(['unknown-role'], '/login')).toBe(true);
    });

    it('allows citizens into respond-to-claim, dashboard, make-an-application, /claims and /access-your-case', () => {
      expect(userMayAccessPath(['citizen'], '/case/1/respond-to-claim')).toBe(true);
      expect(userMayAccessPath(['citizen'], '/case/1/dashboard')).toBe(true);
      expect(userMayAccessPath(['citizen'], '/case/1/make-an-application')).toBe(true);
      expect(userMayAccessPath(['citizen'], '/claims')).toBe(true);
      expect(userMayAccessPath(['citizen'], '/access-your-case')).toBe(true);
    });

    it('allows pcs solicitors into respond-to-claim only', () => {
      expect(userMayAccessPath(['caseworker-pcs-solicitor'], '/case/1/respond-to-claim')).toBe(true);
      expect(userMayAccessPath(['caseworker-pcs-solicitor'], '/case/1/dashboard')).toBe(false);
      expect(userMayAccessPath(['caseworker-pcs-solicitor'], '/case/1/make-an-application')).toBe(false);
      expect(userMayAccessPath(['caseworker-pcs-solicitor'], '/case/1/upload-additional-documents')).toBe(false);
      expect(userMayAccessPath(['caseworker-pcs-solicitor'], '/claims')).toBe(false);
      expect(userMayAccessPath(['caseworker-pcs-solicitor'], '/access-your-case')).toBe(false);
    });

    it('allows citizens into upload-additional-documents', () => {
      expect(userMayAccessPath(['citizen'], '/case/1/upload-additional-documents')).toBe(true);
    });

    it.each([
      '/case/1/view-the-claim',
      '/case/1/view-documents',
      '/case/1/view-hearing-documents',
      '/case/1/view-orders-and-notices',
      '/case/1/view-all-applications',
    ])('gates the view page %s to citizens only', path => {
      expect(userMayAccessPath(['citizen'], path)).toBe(true);
      expect(userMayAccessPath(['caseworker-pcs-solicitor'], path)).toBe(false);
    });

    it('blocks users with no matching role', () => {
      expect(userMayAccessPath([], '/case/1/respond-to-claim')).toBe(false);
      expect(userMayAccessPath(['unknown-role'], '/case/1/dashboard')).toBe(false);
    });
  });

  it('exposes a non-empty rules list', () => {
    expect(accessRules.length).toBeGreaterThan(0);
  });

  describe('rolesForRule', () => {
    it('returns the allowed roles for a known rule', () => {
      expect(rolesForRule('dashboard')).toEqual(['citizen']);
      expect(rolesForRule('respond-to-claim')).toEqual(['citizen', 'caseworker-pcs-solicitor']);
    });

    it('throws for an unknown rule name so renames fail fast at boot', () => {
      expect(() => rolesForRule('does-not-exist')).toThrow(/No accessRule named 'does-not-exist'/);
    });
  });

  describe('evaluateLoginAccess', () => {
    it('allows when returnTo is undefined', () => {
      expect(evaluateLoginAccess(undefined, ['citizen'])).toEqual({ allowed: true });
    });

    it('allows when returnTo is an ungated path', () => {
      expect(evaluateLoginAccess('/login', [])).toEqual({ allowed: true });
    });

    it('allows when the user has a matching role', () => {
      expect(evaluateLoginAccess('/case/1/respond-to-claim', ['caseworker-pcs-solicitor'])).toEqual({ allowed: true });
      expect(evaluateLoginAccess('/case/1/dashboard', ['citizen'])).toEqual({ allowed: true });
    });

    it('denies and returns the matched rule when the user lacks the role', () => {
      const decision = evaluateLoginAccess('/case/1/dashboard', ['caseworker-pcs-solicitor']);
      expect(decision).toEqual({
        allowed: false,
        rule: expect.objectContaining({ name: 'dashboard' }),
      });
    });

    it('denies make-an-application for solicitors', () => {
      const decision = evaluateLoginAccess('/case/1/make-an-application', ['caseworker-pcs-solicitor']);
      expect(decision.allowed).toBe(false);
    });
  });
});
