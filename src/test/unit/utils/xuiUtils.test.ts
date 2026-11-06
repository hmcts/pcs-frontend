import config from 'config';
import { NextFunction } from 'express';

import { CallbackRejectedError, HTTPError } from '../../../main/HttpError';

import type { CcdCaseData } from '@services/ccdCase.interface';
import * as manageCaseRedirect from '@utils/manageCaseRedirect';
import {
  ValidationIssue,
  errorSummary,
  getClaimantNames,
  getDefendantNames,
  manageCaseDetailsUrl,
  mapXuiValidation,
  refusedXuiEvent,
} from '@utils/xuiUtils';

describe('xuiUtils', () => {
  describe('refusedXUIEvent', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let res: any;
    let next: jest.Mock;

    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      next = jest.fn();
    });

    it('should handle CallbackRejectedError', () => {
      const error = new CallbackRejectedError(['Rejected'], 400);
      const rejected = jest.fn();

      refusedXuiEvent(res, next as NextFunction, error, rejected);

      expect(rejected).toHaveBeenCalledWith(error);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle 403 error message', () => {
      const error = new HTTPError('Forbidden', 403);

      refusedXuiEvent(res, next as NextFunction, error);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Not Found');
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle 404 error message', () => {
      const error = new HTTPError('Not Found', 404);

      refusedXuiEvent(res, next as NextFunction, error);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Not Found');
      expect(next).not.toHaveBeenCalled();
    });

    it('should pass any other error to next', () => {
      const error = new Error('Something went wrong');

      refusedXuiEvent(res, next as NextFunction, error);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });
  });

  describe('errorSummary', () => {
    it('should return undefined when there are no validation issues', () => {
      expect(errorSummary([])).toBeUndefined();
    });

    it('should return an error summary when validation issues exist', () => {
      const issues: ValidationIssue[] = [
        {
          id: 'firstName',
          message: 'Enter a first name',
        },
        {
          id: 'lastName',
          message: 'Enter a last name',
        },
      ];

      expect(errorSummary(issues)).toEqual({
        titleText: 'There is a problem',
        errorList: [
          {
            text: 'Enter a first name',
            href: '#firstName',
          },
          {
            text: 'Enter a last name',
            href: '#lastName',
          },
        ],
      });
    });
  });

  describe('mapXuiValidation', () => {
    it('should return an empty object when no validation issues exist', () => {
      expect(mapXuiValidation([])).toEqual({});
    });

    it('should map a single validation issue', () => {
      const issues: ValidationIssue[] = [
        {
          id: 'firstName',
          message: 'Enter a first name',
        },
      ];

      expect(mapXuiValidation(issues)).toEqual({
        firstName: {
          text: 'Enter a first name',
        },
      });
    });

    it('should map multiple validation issues', () => {
      const issues: ValidationIssue[] = [
        {
          id: 'firstName',
          message: 'Enter a first name',
        },
        {
          id: 'lastName',
          message: 'Enter a last name',
        },
      ];

      expect(mapXuiValidation(issues)).toEqual({
        firstName: {
          text: 'Enter a first name',
        },
        lastName: {
          text: 'Enter a last name',
        },
      });
    });
  });

  describe('manageCaseDetailsUrl', () => {
    it('should return the generated manage case URL', () => {
      jest.spyOn(config, 'get').mockReturnValue('https://example.com');
      jest.spyOn(manageCaseRedirect, 'buildManageCaseDetailsRedirect').mockReturnValue('https://example.com/case/123');

      const result = manageCaseDetailsUrl('123');

      expect(config.get).toHaveBeenCalledWith('redirects.manageCaseReturnURL');
      expect(result).toBe('https://example.com/case/123');
    });

    it('should throw an HTTPError when the manage case URL is not configured', () => {
      jest.spyOn(config, 'get').mockReturnValue(undefined as never);

      jest.spyOn(manageCaseRedirect, 'buildManageCaseDetailsRedirect').mockReturnValue('');

      expect(() => manageCaseDetailsUrl('123')).toThrow(HTTPError);

      expect(() => manageCaseDetailsUrl('123')).toThrow('The Manage Case return URL is not configured');
    });
  });

  describe('getClaimantNames', () => {
    it('should return an empty string when there are no claimants', () => {
      expect(getClaimantNames({} as CcdCaseData)).toBe('');
      expect(getClaimantNames({ allClaimants: [] } as unknown as CcdCaseData)).toBe('');
    });

    it('should name a single individual claimant', () => {
      const ccdCase = { allClaimants: [{ value: { firstName: 'John', lastName: 'Smith' } }] } as CcdCaseData;

      expect(getClaimantNames(ccdCase)).toBe('John Smith');
    });

    it('should list individual and organisation claimants separated by commas', () => {
      const ccdCase = {
        allClaimants: [
          { value: { firstName: 'John', lastName: 'Smith' } },
          { value: { orgName: 'ABC Housing Association' } },
          { value: { firstName: 'Jane', lastName: 'Doe' } },
        ],
      } as CcdCaseData;

      expect(getClaimantNames(ccdCase)).toBe('John Smith, ABC Housing Association, Jane Doe');
    });
  });

  describe('getDefendantNames', () => {
    it('should return an empty string when there are no defendants', () => {
      expect(getDefendantNames({} as CcdCaseData)).toBe('');
      expect(getDefendantNames({ allDefendants: [] } as unknown as CcdCaseData)).toBe('');
    });

    it('should name a single individual defendant', () => {
      const ccdCase = { allDefendants: [{ value: { firstName: 'John', lastName: 'Smith' } }] } as CcdCaseData;

      expect(getDefendantNames(ccdCase)).toBe('John Smith');
    });

    it('should only list multiple defendants separated by commas', () => {
      const ccdCase = {
        allDefendants: [
          { value: { firstName: 'John', lastName: 'Smith' } },
          { value: { firstName: 'Jane', lastName: 'Doe' } },
        ],
      } as CcdCaseData;

      expect(getDefendantNames(ccdCase)).toBe('John Smith, Jane Doe');
    });

    it('should list defendants with unknown names once as persons unknown, at the end', () => {
      const ccdCase = {
        allDefendants: [
          { value: { nameKnown: 'NO' } },
          { value: { nameKnown: 'YES', firstName: 'John', lastName: 'Smith' } },
          { value: { nameKnown: 'No' } },
        ],
      } as CcdCaseData;

      expect(getDefendantNames(ccdCase)).toBe('John Smith, Persons unknown');
    });

    it('should show only persons unknown when no defendant names are known', () => {
      const ccdCase = { allDefendants: [{ value: { nameKnown: 'NO' } }] } as CcdCaseData;

      expect(getDefendantNames(ccdCase)).toBe('Persons unknown');
    });
  });
});
