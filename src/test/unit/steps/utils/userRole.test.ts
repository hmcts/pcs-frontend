import type { Request } from 'express';

import {
  CITIZEN_USER_ROLES,
  LEGAL_REPRESENTATIVE_USER_ROLES,
  ROLE_CITIZEN,
  ROLE_PCS_SOLICITOR,
  getUserRoles,
  getUserToken,
  getUserType,
  isCitizenUser,
  isLegalRepresentativeUser,
} from '../../../../main/steps/utils/userRole';

const reqWith = (roles: unknown, accessToken?: string): Request =>
  ({ session: { user: { roles, accessToken } } }) as unknown as Request;

describe('userRole', () => {
  describe('role constants', () => {
    it('citizen role is "citizen"', () => {
      expect(ROLE_CITIZEN).toBe('citizen');
      expect(CITIZEN_USER_ROLES).toEqual(['citizen']);
    });

    it('pcs solicitor role is "caseworker-pcs-solicitor"', () => {
      expect(ROLE_PCS_SOLICITOR).toBe('caseworker-pcs-solicitor');
      expect(LEGAL_REPRESENTATIVE_USER_ROLES).toEqual(['caseworker-pcs-solicitor']);
    });
  });

  describe('getUserRoles', () => {
    it('returns empty array when session has no user', () => {
      expect(getUserRoles({ session: {} } as unknown as Request)).toEqual([]);
    });

    it('returns empty array when roles is not an array', () => {
      expect(getUserRoles(reqWith('citizen'))).toEqual([]);
      expect(getUserRoles(reqWith(undefined))).toEqual([]);
    });

    it('normalises roles by trimming, lowercasing, and dropping non-strings', () => {
      const roles = ['  Citizen ', 'CASEWORKER-PCS-SOLICITOR', 42, '', null];
      expect(getUserRoles(reqWith(roles))).toEqual(['citizen', 'caseworker-pcs-solicitor']);
    });
  });

  describe('isCitizenUser', () => {
    it('is true when roles include citizen (case-insensitive)', () => {
      expect(isCitizenUser(reqWith(['Citizen']))).toBe(true);
    });

    it('is false when roles do not include citizen', () => {
      expect(isCitizenUser(reqWith(['caseworker-pcs-solicitor']))).toBe(false);
      expect(isCitizenUser(reqWith([]))).toBe(false);
    });
  });

  describe('isLegalRepresentativeUser', () => {
    it('is true when roles include caseworker-pcs-solicitor', () => {
      expect(isLegalRepresentativeUser(reqWith(['caseworker-pcs-solicitor']))).toBe(true);
    });

    it('is true regardless of casing/whitespace', () => {
      expect(isLegalRepresentativeUser(reqWith(['  Caseworker-PCS-Solicitor  ']))).toBe(true);
    });

    it('is false for citizen-only users', () => {
      expect(isLegalRepresentativeUser(reqWith(['citizen']))).toBe(false);
    });

    it('is false for legacy "solicitor" role string (IDAM emits long form)', () => {
      expect(isLegalRepresentativeUser(reqWith(['solicitor']))).toBe(false);
    });
  });

  describe('getUserType', () => {
    it('returns "legalrep" when user has the pcs solicitor role', () => {
      expect(getUserType(reqWith(['caseworker-pcs-solicitor']))).toBe('legalrep');
    });

    it('returns "citizen" otherwise', () => {
      expect(getUserType(reqWith(['citizen']))).toBe('citizen');
      expect(getUserType(reqWith([]))).toBe('citizen');
    });
  });

  describe('getUserToken', () => {
    it('returns the access token when present', () => {
      expect(getUserToken(reqWith(['citizen'], 'token-123'))).toBe('token-123');
    });

    it('throws when no access token is set', () => {
      expect(() => getUserToken(reqWith(['citizen']))).toThrow('User not authenticated');
    });
  });
});
