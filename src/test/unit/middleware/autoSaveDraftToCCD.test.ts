const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

import { dateToISO, multipleYesNo, passThrough, yesNoEnum } from '../../../main/middleware/autoSaveDraftToCCD';

describe('autoSaveDraftToCCD value mappers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('yesNoEnum', () => {
    it('should transform yes to YES', () => {
      const mapper = yesNoEnum('testField');
      expect(mapper('yes')).toEqual({ testField: 'YES' });
    });

    it('should transform no to NO', () => {
      const mapper = yesNoEnum('testField');
      expect(mapper('no')).toEqual({ testField: 'NO' });
    });

    it('should transform preferNotToSay to PREFER_NOT_TO_SAY', () => {
      const mapper = yesNoEnum('testField');
      expect(mapper('preferNotToSay')).toEqual({ testField: 'PREFER_NOT_TO_SAY' });
    });

    it('should return empty string for invalid enum value', () => {
      const mapper = yesNoEnum('testField');
      expect(mapper('invalidValue')).toEqual({ testField: '' });
    });

    it('should log error for invalid enum value', () => {
      const mapper = yesNoEnum('testField');
      mapper('arbitraryText');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid value "arbitraryText" for field "testField"')
      );
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Allowed values: yes, no, preferNotToSay'));
    });

    it('should return empty string for non-string values', () => {
      const mapper = yesNoEnum('testField');
      expect(mapper(['yes', 'no'])).toEqual({ testField: '' });
    });

    it('should log warning for non-string values', () => {
      const mapper = yesNoEnum('testField');
      mapper({ yes: 'no' });

      expect(mockLogger.warn).toHaveBeenCalledWith('yesNoEnum expects a string, received:', 'object');
    });

    it('should return empty string for empty string', () => {
      const mapper = yesNoEnum('testField');
      expect(mapper('')).toEqual({ testField: '' });
    });

    it('should return empty string for numeric string', () => {
      const mapper = yesNoEnum('testField');
      expect(mapper('123')).toEqual({ testField: '' });
    });

    it('should return empty string for mixed case value', () => {
      const mapper = yesNoEnum('testField');
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

      expect(mockLogger.warn).toHaveBeenCalledWith('dateToISO expects an object, received:', 'string');
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

      expect(mockLogger.warn).toHaveBeenCalledWith('passThrough expects an object, received:', 'string');
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

      expect(mockLogger.warn).toHaveBeenCalledWith('multipleYesNo expects an array, received:', 'object');
    });
  });
});
