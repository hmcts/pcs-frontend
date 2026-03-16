const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

import type { Request, Response } from 'express';

import { dateToISO, mapYesNoPreferNotToSay, multipleYesNo, passThrough } from '../../../main/mappers/ccdMappers';
import { autoSaveToCCD } from '../../../main/middleware/autoSaveDraftToCCD';
import { ccdCaseService } from '../../../main/services/ccdCaseService';

describe('autoSaveDraftToCCD value mappers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapYesNoPreferNotToSay', () => {
    it('should transform yes to YES', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      expect(mapper('yes')).toEqual({ testField: 'YES' });
    });

    it('should transform no to NO', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      expect(mapper('no')).toEqual({ testField: 'NO' });
    });

    it('should transform preferNotToSay to PREFER_NOT_TO_SAY', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      expect(mapper('preferNotToSay')).toEqual({ testField: 'PREFER_NOT_TO_SAY' });
    });

    it('should return empty string for invalid enum value', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      expect(mapper('invalidValue')).toEqual({ testField: '' });
    });

    it('should log error for invalid enum value', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      mapper('arbitraryText');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid value "arbitraryText" for field "testField"')
      );
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Allowed values: yes, no, preferNotToSay'));
    });

    it('should return empty string for non-string values', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      expect(mapper(['yes', 'no'])).toEqual({ testField: '' });
    });

    it('should log warning for non-string values', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      mapper({ yes: 'no' });

      expect(mockLogger.warn).toHaveBeenCalledWith('mapYesNoPreferNotToSay expects a string, received: object');
    });

    it('should return empty string for empty string', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      expect(mapper('')).toEqual({ testField: '' });
    });

    it('should return empty string for numeric string', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      expect(mapper('123')).toEqual({ testField: '' });
    });

    it('should return empty string for mixed case value', () => {
      const mapper = mapYesNoPreferNotToSay('testField');
      expect(mapper('Yes')).toEqual({ testField: '' });
    });
  });

  describe('dateToISO', () => {
    it('should convert valid date to ISO format', () => {
      const mapper = dateToISO('testDate');
      expect(mapper({ day: '15', month: '03', year: '2024' })).toEqual({ testDate: '2024-03-15' });
    });

    it('should pad single digit day and month', () => {
      const mapper = dateToISO('testDate');
      expect(mapper({ day: '1', month: '3', year: '2024' })).toEqual({ testDate: '2024-03-01' });
    });

    it('should return empty object for missing day', () => {
      const mapper = dateToISO('testDate');
      expect(mapper({ month: '03', year: '2024' })).toEqual({});
    });

    it('should return empty object for missing month', () => {
      const mapper = dateToISO('testDate');
      expect(mapper({ day: '15', year: '2024' })).toEqual({});
    });

    it('should return empty object for missing year', () => {
      const mapper = dateToISO('testDate');
      expect(mapper({ day: '15', month: '03' })).toEqual({});
    });

    it('should return empty object for string input', () => {
      const mapper = dateToISO('testDate');
      expect(mapper('2024-03-15')).toEqual({});
    });

    it('should log warning for string input', () => {
      const mapper = dateToISO('testDate');
      mapper('2024-03-15');

      expect(mockLogger.warn).toHaveBeenCalledWith('dateToISO expects an object, received: string');
    });
  });

  describe('passThrough', () => {
    it('should pass through specified fields', () => {
      const mapper = passThrough(['field1', 'field2']);
      expect(mapper({ field1: 'value1', field2: 'value2', field3: 'value3' })).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('should exclude undefined fields', () => {
      const mapper = passThrough(['field1', 'field2', 'field3']);
      expect(mapper({ field1: 'value1' })).toEqual({ field1: 'value1' });
    });

    it('should exclude null fields', () => {
      const mapper = passThrough(['field1', 'field2']);
      expect(mapper({ field1: 'value1', field2: null })).toEqual({ field1: 'value1' });
    });

    it('should exclude empty string fields', () => {
      const mapper = passThrough(['field1', 'field2']);
      expect(mapper({ field1: 'value1', field2: '' })).toEqual({ field1: 'value1' });
    });

    it('should return empty object for string input', () => {
      const mapper = passThrough(['field1']);
      expect(mapper('test')).toEqual({});
    });

    it('should log warning for string input', () => {
      const mapper = passThrough(['field1']);
      mapper('test');

      expect(mockLogger.warn).toHaveBeenCalledWith('passThrough expects an object, received: string');
    });
  });

  describe('multipleYesNo', () => {
    it('should transform camelCase array values to UPPER_CASE', () => {
      const mapper = multipleYesNo('testField');
      expect(mapper(['optionOne', 'optionTwo'])).toEqual({
        testField: ['OPTION_ONE', 'OPTION_TWO'],
      });
    });

    it('should handle single value array', () => {
      const mapper = multipleYesNo('testField');
      expect(mapper(['singleOption'])).toEqual({ testField: ['SINGLE_OPTION'] });
    });

    it('should handle empty array', () => {
      const mapper = multipleYesNo('testField');
      expect(mapper([])).toEqual({ testField: [] });
    });

    it('should return empty array for non-array input', () => {
      const mapper = multipleYesNo('testField');
      expect(mapper('notAnArray')).toEqual({ testField: [] });
    });

    it('should log warning for non-array input', () => {
      const mapper = multipleYesNo('testField');
      mapper({ not: 'array' });

      expect(mockLogger.warn).toHaveBeenCalledWith('multipleYesNo expects an array, received: object');
    });
  });

  describe('dateToISO invalid dates', () => {
    it('should return empty object for invalid date', () => {
      const mapper = dateToISO('testDate');
      expect(mapper({ day: '32', month: '13', year: '2024' })).toEqual({});
    });

    it('should log warning for invalid date', () => {
      const mapper = dateToISO('testDate');
      mapper({ day: '32', month: '01', year: '2024' });

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid date'));
    });

    it('should return empty object for array input', () => {
      const mapper = dateToISO('testDate');
      expect(mapper(['2024', '03', '15'])).toEqual({});
    });

    it('should log warning for array input', () => {
      const mapper = dateToISO('testDate');
      mapper(['2024', '03', '15']);

      expect(mockLogger.warn).toHaveBeenCalledWith('dateToISO expects an object, received: object');
    });
  });

  describe('passThrough with array input', () => {
    it('should return empty object for array input', () => {
      const mapper = passThrough(['field1']);
      expect(mapper(['value1', 'value2'])).toEqual({});
    });

    it('should log warning for array input', () => {
      const mapper = passThrough(['field1']);
      mapper(['value1']);

      expect(mockLogger.warn).toHaveBeenCalledWith('passThrough expects an object, received: object');
    });
  });
});

jest.mock('../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    updateDraftRespondToClaim: jest.fn(),
  },
}));

describe('autoSaveToCCD main function', () => {
  const mockUpdateCase = ccdCaseService.updateDraftRespondToClaim as jest.Mock;

  const freeLegalAdviceMapping = {
    backendPath: 'possessionClaimResponse.defendantResponses',
    frontendField: 'hadLegalAdvice',
    valueMapper: mapYesNoPreferNotToSay('receivedFreeLegalAdvice'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('autoSaveToCCD', () => {
    it('should skip auto-save when step is not configured', async () => {
      const req = {
        body: { field: 'value' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;

      const res = {
        locals: {
          validatedCase: { id: '1234567890123456' },
        },
      } as unknown as Response;

      await autoSaveToCCD(req, res, { stepName: 'unconfigured-step' });

      expect(mockLogger.debug).toHaveBeenCalledWith('[unconfigured-step] No CCD mapping, skipping save');
      expect(mockUpdateCase).not.toHaveBeenCalled();
    });

    it('should skip auto-save when form data is missing', async () => {
      const req = {
        body: undefined,
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;

      const res = {
        locals: {
          validatedCase: { id: '1234567890123456' },
        },
      } as unknown as Response;

      await autoSaveToCCD(req, res, { stepName: 'free-legal-advice', ccdMapping: freeLegalAdviceMapping });

      expect(mockLogger.debug).toHaveBeenCalledWith('[free-legal-advice] No form data, skipping save');
      expect(mockUpdateCase).not.toHaveBeenCalled();
    });

    it('should skip auto-save when form data is empty object', async () => {
      const req = {
        body: {},
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;

      const res = {
        locals: {
          validatedCase: { id: '1234567890123456' },
        },
      } as unknown as Response;

      await autoSaveToCCD(req, res, { stepName: 'free-legal-advice', ccdMapping: freeLegalAdviceMapping });

      expect(mockLogger.debug).toHaveBeenCalledWith('[free-legal-advice] No form data, skipping save');
      expect(mockUpdateCase).not.toHaveBeenCalled();
    });

    it('should skip auto-save when validated case is missing', async () => {
      const req = {
        body: { hadLegalAdvice: 'yes' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;

      const res = {
        locals: {},
      } as unknown as Response;

      await autoSaveToCCD(req, res, { stepName: 'free-legal-advice', ccdMapping: freeLegalAdviceMapping });

      expect(mockLogger.warn).toHaveBeenCalledWith('[free-legal-advice] No case found, skipping save');
      expect(mockUpdateCase).not.toHaveBeenCalled();
    });

    it('should throw error when access token is missing', async () => {
      const req = {
        body: { hadLegalAdvice: 'yes' },
        session: {},
      } as unknown as Request;

      const res = {
        locals: {
          validatedCase: { id: '1234567890123456' },
        },
      } as unknown as Response;

      await expect(
        autoSaveToCCD(req, res, { stepName: 'free-legal-advice', ccdMapping: freeLegalAdviceMapping })
      ).rejects.toThrow('No access token available for CCD update');
      expect(mockLogger.error).toHaveBeenCalledWith('[free-legal-advice] No access token');
    });

    it('should save to CCD successfully with frontendField', async () => {
      mockUpdateCase.mockResolvedValueOnce({
        id: '1234567890123456',
        data: {
          possessionClaimResponse: {
            defendantResponses: { receivedFreeLegalAdvice: 'YES' },
          },
        },
      });

      const req = {
        body: { hadLegalAdvice: 'yes' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;

      const res = {
        locals: { validatedCase: { id: '1234567890123456' } },
      } as unknown as Response;

      await autoSaveToCCD(req, res, { stepName: 'free-legal-advice', ccdMapping: freeLegalAdviceMapping });

      expect(mockUpdateCase).toHaveBeenCalledWith('mock-token', '1234567890123456', {
        possessionClaimResponse: {
          defendantResponses: { receivedFreeLegalAdvice: 'YES' },
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith('[free-legal-advice] Draft saved to CCD');
    });

    it('should skip save when frontendField is not found in form data', async () => {
      const req = {
        body: { otherField: 'value' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;

      const res = {
        locals: {
          validatedCase: { id: '1234567890123456' },
        },
      } as unknown as Response;

      await autoSaveToCCD(req, res, { stepName: 'free-legal-advice', ccdMapping: freeLegalAdviceMapping });

      expect(mockLogger.warn).toHaveBeenCalledWith("[free-legal-advice] Field 'hadLegalAdvice' not found");
      expect(mockUpdateCase).not.toHaveBeenCalled();
    });

    it('should allow valueMapper to use Request context', async () => {
      const defendantNameConfirmationMapping = {
        backendPath: 'possessionClaimResponse',
        frontendFields: ['nameConfirmation'],
        valueMapper: (valueOrFormData: unknown, req?: Request) => {
          if (typeof valueOrFormData === 'string' || Array.isArray(valueOrFormData)) {
            return {};
          }
          const data = valueOrFormData as Record<string, unknown>;
          if (data.nameConfirmation !== 'yes') {
            return {};
          }
          const caseData = req?.res?.locals.validatedCase?.data as Record<string, unknown> | undefined;
          const possessionClaimResponse = caseData?.possessionClaimResponse as Record<string, unknown> | undefined;
          const claimantEntry = possessionClaimResponse?.claimantEnteredDefendantDetails as
            | Record<string, unknown>
            | undefined;
          const firstName = claimantEntry?.firstName;
          const lastName = claimantEntry?.lastName;
          if (typeof firstName !== 'string' || typeof lastName !== 'string') {
            return {};
          }
          return {
            defendantResponses: { defendantNameConfirmation: 'YES' },
            defendantContactDetails: { party: { firstName, lastName } },
          };
        },
      };

      const req = {
        body: { nameConfirmation: 'yes' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;

      const res = {
        locals: {
          validatedCase: {
            id: '1234567890123456',
            data: {
              possessionClaimResponse: {
                claimantEnteredDefendantDetails: { firstName: 'AAA', lastName: 'BBB' },
              },
            },
          },
        },
      } as unknown as Response;

      // Link res to req for valueMapper access
      req.res = res;

      await autoSaveToCCD(req, res, {
        stepName: 'defendant-name-confirmation',
        ccdMapping: defendantNameConfirmationMapping,
      });

      expect(mockUpdateCase).toHaveBeenCalledWith('mock-token', '1234567890123456', {
        possessionClaimResponse: {
          defendantResponses: { defendantNameConfirmation: 'YES' },
          defendantContactDetails: { party: { firstName: 'AAA', lastName: 'BBB' } },
        },
      });
    });

    it('should handle CCD save errors gracefully', async () => {
      mockUpdateCase.mockRejectedValueOnce(new Error('CCD API error'));

      const req = {
        body: { hadLegalAdvice: 'yes' },
        session: { user: { accessToken: 'mock-token' } },
      } as unknown as Request;

      const res = {
        locals: {
          validatedCase: { id: '1234567890123456' },
        },
      } as unknown as Response;

      await autoSaveToCCD(req, res, { stepName: 'free-legal-advice', ccdMapping: freeLegalAdviceMapping });

      expect(mockLogger.error).toHaveBeenCalledWith('[free-legal-advice] Failed to save to CCD:', expect.any(Error));
    });
  });
});
