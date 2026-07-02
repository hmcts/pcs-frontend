import {
  accessRules,
  evaluateLoginAccess,
  findRuleForPath,
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
      ['/claims', 'claims'],
      ['/claims/anything', 'claims'],
      ['/access-your-case', 'access-your-case'],
      ['/access-your-case/x', 'access-your-case'],
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
      expect(userMayAccessPath(['caseworker-pcs-solicitor'], '/claims')).toBe(false);
      expect(userMayAccessPath(['caseworker-pcs-solicitor'], '/access-your-case')).toBe(false);
    });

    it('blocks users with no matching role', () => {
      expect(userMayAccessPath([], '/case/1/respond-to-claim')).toBe(false);
      expect(userMayAccessPath(['unknown-role'], '/case/1/dashboard')).toBe(false);
    });
  });

  it('exposes a non-empty rules list', () => {
    expect(accessRules.length).toBeGreaterThan(0);
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
