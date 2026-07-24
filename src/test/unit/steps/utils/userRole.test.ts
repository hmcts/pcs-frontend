import type { Request } from 'express';

import {
  getUserType,
  hasAllowedUserRole,
  isCitizenUser,
  isLegalRepresentativeUser,
  normaliseRoles,
} from '../../../../main/steps/utils/userRole';

const reqWithRoles = (roles: unknown): Request => ({ session: { user: { roles } } }) as unknown as Request;

describe('userRole', () => {
  describe('normaliseRoles', () => {
    it('lowercases, trims and drops non-string or empty values', () => {
      expect(normaliseRoles(['  Citizen ', 'CASEWORKER-PCS-SOLICITOR', '', 42, null])).toEqual([
        'citizen',
        'caseworker-pcs-solicitor',
      ]);
    });

    it('returns an empty array when roles are not an array', () => {
      expect(normaliseRoles(undefined)).toEqual([]);
      expect(normaliseRoles('citizen')).toEqual([]);
    });
  });

  describe('hasAllowedUserRole', () => {
    it('is true when a permitted role is present', () => {
      expect(hasAllowedUserRole(['citizen'])).toBe(true);
      expect(hasAllowedUserRole(['caseworker-pcs-solicitor'])).toBe(true);
    });

    it('is false for disallowed or empty roles', () => {
      expect(hasAllowedUserRole(['judge', 'hmcts-admin'])).toBe(false);
      expect(hasAllowedUserRole([])).toBe(false);
    });
  });

  describe('isCitizenUser / isLegalRepresentativeUser', () => {
    it('identifies a citizen only by the citizen role', () => {
      expect(isCitizenUser(reqWithRoles(['citizen']))).toBe(true);
      expect(isCitizenUser(reqWithRoles(['judge']))).toBe(false);
    });

    it('identifies a legal representative by the solicitor role', () => {
      expect(isLegalRepresentativeUser(reqWithRoles(['caseworker-pcs-solicitor']))).toBe(true);
      expect(isLegalRepresentativeUser(reqWithRoles(['citizen']))).toBe(false);
    });
  });

  describe('getUserType', () => {
    it('returns citizen for a citizen role', () => {
      expect(getUserType(reqWithRoles(['citizen']))).toBe('citizen');
    });

    it('returns legalrep for a solicitor role, taking precedence over citizen', () => {
      expect(getUserType(reqWithRoles(['caseworker-pcs-solicitor']))).toBe('legalrep');
      expect(getUserType(reqWithRoles(['citizen', 'caseworker-pcs-solicitor']))).toBe('legalrep');
    });

    it('returns unauthorised for any other or missing role, closing the citizen-default gap', () => {
      expect(getUserType(reqWithRoles(['judge']))).toBe('unauthorised');
      expect(getUserType(reqWithRoles([]))).toBe('unauthorised');
      expect(getUserType(reqWithRoles(undefined))).toBe('unauthorised');
    });
  });
});
