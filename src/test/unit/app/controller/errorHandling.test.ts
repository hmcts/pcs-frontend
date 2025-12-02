import type { Request, Response } from 'express';

import { buildErrorSummary, renderWithErrors } from '../../../../main/app/controller/errorHandling';
import type { ValidationErrors } from '../../../../main/app/controller/formHelpers';

describe('errorHandling', () => {
  describe('buildErrorSummary', () => {
    it('should return null when there are no errors', () => {
      const errors: ValidationErrors = {};

      const result = buildErrorSummary(errors);

      expect(result).toBeNull();
    });

    it('should return error summary with default title when errors exist', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const result = buildErrorSummary(errors);

      expect(result).toEqual({
        titleText: 'There is a problem',
        errorList: [
          {
            text: 'Field 1 is required',
            href: '#field1',
          },
        ],
      });
    });

    it('should return error summary with custom title when provided', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const result = buildErrorSummary(errors, 'Custom error title');

      expect(result).toEqual({
        titleText: 'Custom error title',
        errorList: [
          {
            text: 'Field 1 is required',
            href: '#field1',
          },
        ],
      });
    });

    it('should use anchor when available instead of field name', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
          anchor: 'custom-anchor',
        },
      };

      const result = buildErrorSummary(errors);

      expect(result).toEqual({
        titleText: 'There is a problem',
        errorList: [
          {
            text: 'Field 1 is required',
            href: '#custom-anchor',
          },
        ],
      });
    });

    it('should handle multiple errors', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
        field2: {
          field: 'field2',
          text: 'Field 2 is invalid',
          anchor: 'field2-anchor',
        },
        field3: {
          field: 'field3',
          text: 'Field 3 has an error',
        },
      };

      const result = buildErrorSummary(errors);

      expect(result).toEqual({
        titleText: 'There is a problem',
        errorList: [
          {
            text: 'Field 1 is required',
            href: '#field1',
          },
          {
            text: 'Field 2 is invalid',
            href: '#field2-anchor',
          },
          {
            text: 'Field 3 has an error',
            href: '#field3',
          },
        ],
      });
    });

    it('should use custom fallback title when provided', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const result = buildErrorSummary(errors, undefined, 'Custom fallback title');

      expect(result).toEqual({
        titleText: 'Custom fallback title',
        errorList: [
          {
            text: 'Field 1 is required',
            href: '#field1',
          },
        ],
      });
    });

    it('should prioritize custom title over fallback title', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const result = buildErrorSummary(errors, 'Custom title', 'Fallback title');

      expect(result?.titleText).toBe('Custom title');
    });
  });

  describe('renderWithErrors', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let renderSpy: jest.Mock;
    let statusSpy: jest.Mock;

    beforeEach(() => {
      renderSpy = jest.fn();
      statusSpy = jest.fn().mockReturnValue({
        render: renderSpy,
      });

      mockRequest = {
        body: {
          field1: 'value1',
          field2: 'value2',
        },
      };

      mockResponse = {
        status: statusSpy,
        render: renderSpy,
      };
    });

    it('should set status to 400', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {};

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
    });

    it('should call render with correct view and merged content', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {
        pageTitle: 'Test Page',
        customField: 'custom value',
      };

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        pageTitle: 'Test Page',
        customField: 'custom value',
        field1: 'value1',
        field2: 'value2',
      }));
    });

    it('should include errors in render data', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {};

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        errors,
      }));
    });

    it('should include fieldErrors in render data', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
        field2: {
          field: 'field2',
          text: 'Field 2 is invalid',
        },
      };

      const content = {};

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        fieldErrors: {
          field1: 'Field 1 is required',
          field2: 'Field 2 is invalid',
        },
      }));
    });

    it('should include first error in render data', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
        field2: {
          field: 'field2',
          text: 'Field 2 is invalid',
        },
      };

      const content = {};

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        error: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      }));
    });

    it('should include errorSummary when errors exist', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {};

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        errorSummary: {
          titleText: 'There is a problem',
          errorList: [
            {
              text: 'Field 1 is required',
              href: '#field1',
            },
          ],
        },
      }));
    });

    it('should use errorSummaryTitle from content when provided', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {
        errorSummaryTitle: 'Custom error summary title',
      };

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        errorSummary: expect.objectContaining({
          titleText: 'Custom error summary title',
        }),
        errorSummaryTitle: 'Custom error summary title',
      }));
    });

    it('should not use errorSummaryTitle from content when it is not a string', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {
        errorSummaryTitle: 123,
      };

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        errorSummary: expect.objectContaining({
          titleText: 'There is a problem',
        }),
        errorSummaryTitle: 'There is a problem',
      }));
    });

    it('should handle empty req.body', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {
        pageTitle: 'Test Page',
      };

      mockRequest.body = {};

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        pageTitle: 'Test Page',
      }));
    });

    it('should handle undefined req.body', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {
        pageTitle: 'Test Page',
      };

      mockRequest.body = undefined;

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        pageTitle: 'Test Page',
      }));
    });

    it('should include errorSummaryTitle from summary when summary exists', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {};

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        errorSummaryTitle: 'There is a problem',
      }));
    });

    it('should use errorSummaryTitle from content when summary is null', () => {
      const errors: ValidationErrors = {};

      const content = {
        errorSummaryTitle: 'Custom title',
      };

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        errorSummary: null,
        errorSummaryTitle: 'Custom title',
      }));
    });

    it('should return the response object', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
        },
      };

      const content = {};

      const result = renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(result).toBe(mockResponse);
    });

    it('should handle errors with anchors correctly in errorSummary', () => {
      const errors: ValidationErrors = {
        field1: {
          field: 'field1',
          text: 'Field 1 is required',
          anchor: 'custom-anchor-1',
        },
        field2: {
          field: 'field2',
          text: 'Field 2 is invalid',
        },
      };

      const content = {};

      renderWithErrors(
        mockRequest as Request,
        mockResponse as Response,
        'test-view',
        errors,
        content
      );

      expect(renderSpy).toHaveBeenCalledWith('test-view', expect.objectContaining({
        errorSummary: expect.objectContaining({
          errorList: [
            {
              text: 'Field 1 is required',
              href: '#custom-anchor-1',
            },
            {
              text: 'Field 2 is invalid',
              href: '#field2',
            },
          ],
        }),
      }));
    });
  });
});

