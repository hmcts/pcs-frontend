import config from 'config';
import { NextFunction, Request } from 'express';

import { CallbackRejectedError, HTTPError } from '../../../main/HttpError';

import * as manageCaseRedirect from '@utils/manageCaseRedirect';
import {
  ValidationIssue,
  errorSummary,
  manageCaseDetailsUrl,
  mapXuiValidation,
  refusedXuiEvent,
  xuiHeaderModel,
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

    it('should pass a CallbackRejectedError to next', () => {
      const error = new CallbackRejectedError(['Rejected'], 422);

      refusedXuiEvent(res, next as NextFunction, error);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    it.each([400, 401, 500, 502])('should pass an HTTPError with status %s to next', status => {
      const error = new HTTPError('Failed', status);

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
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return the generated manage case URL', () => {
      jest.spyOn(config, 'get').mockReturnValue('https://example.com');
      jest.spyOn(manageCaseRedirect, 'buildManageCaseDetailsRedirect').mockReturnValue('https://example.com/case/123');

      const result = manageCaseDetailsUrl('123');

      expect(config.get).toHaveBeenCalledWith('redirects.manageCaseReturnURL');
      expect(manageCaseRedirect.buildManageCaseDetailsRedirect).toHaveBeenCalledWith('https://example.com', '123');
      expect(result).toBe('https://example.com/case/123');
    });

    it('should throw an HTTPError when the manage case URL is not configured', () => {
      jest.spyOn(manageCaseRedirect, 'buildManageCaseDetailsRedirect').mockReturnValue(undefined);

      expect(() => manageCaseDetailsUrl('123')).toThrow(HTTPError);

      expect(() => manageCaseDetailsUrl('123')).toThrow('The Manage Case return URL is not configured');
    });

    it('should build the case details URL from the configured Manage Case URL', () => {
      expect(manageCaseDetailsUrl('1794231546115667')).toBe(
        `${config.get<string>('redirects.manageCaseReturnURL')}/1794231546115667`
      );
    });
  });

  describe('xuiHeaderModel', () => {
    const request = (roles?: unknown): Request =>
      ({ session: roles === undefined ? {} : { user: { roles } } }) as unknown as Request;

    it('should get xui assets and configure header config', () => {
      const headerModel = xuiHeaderModel(request(['caseworker-pcs']));
      const xuiUri = config.get<string>('xui.uri');

      expect(headerModel.title.href).toBe(`${xuiUri}/`);
      expect(headerModel.assetsPath).toBe('/assets/ui-component-lib');
      expect(headerModel.accountNav.items).toEqual([{ id: 'sign-out', text: 'Sign out', href: '/logout' }]);
    });

    it('should choose the header from the user’s roles, ignoring case and spaces', () => {
      expect(xuiHeaderModel(request([' CASEWORKER-PCS-JUDGE '])).theme.key).toBe('judicial');
      expect(xuiHeaderModel(request(['caseworker-pcs'])).theme.key).toBe('default');
    });

    it('should add the role assignments the event is limited to', () => {
      const headerModel = xuiHeaderModel(request(['caseworker-pcs']), ['judge']);

      expect(headerModel.theme.key).toBe('judicial');
      expect(headerModel.title.text).toBe('Judicial Case Manager');
    });
  });
});
