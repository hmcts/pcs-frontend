const errorUtils = require('../../../../../main/modules/journey/engine/errorUtils');

describe('errorUtils', () => {
  describe('processErrorsForTemplate', () => {
    it('should return null when no errors are provided', () => {
      const result = errorUtils.processErrorsForTemplate(undefined);
      expect(result).toBeNull();
    });

    it('should return null when errors object is empty', () => {
      const result = errorUtils.processErrorsForTemplate({});
      expect(result).toBeNull();
    });

    it('should process errors into correct format', () => {
      const errors = {
        field1: { message: 'Field 1 is required', anchor: 'field1' },
        field2: { message: 'Field 2 is invalid' },
      };

      const result = errorUtils.processErrorsForTemplate(errors);

      expect(result).toEqual({
        titleText: 'There is a problem',
        errorList: [
          { text: 'Field 1 is required', href: '#field1' },
          { text: 'Field 2 is invalid', href: '#field2' },
        ],
      });
    });

    it('should use field name as anchor when anchor is not provided', () => {
      const errors = {
        field1: { message: 'Field 1 is required' },
      };

      const result = errorUtils.processErrorsForTemplate(errors);

      expect(result?.errorList[0].href).toBe('#field1');
    });

    it('should use -day suffix for date fields when anchor is not provided', () => {
      const errors = {
        dateOfBirth: { message: 'Enter a valid date of birth' },
      };

      const step = {
        fields: {
          dateOfBirth: { type: 'date' },
        },
      };

      const result = errorUtils.processErrorsForTemplate(errors, step);

      expect(result?.errorList[0].href).toBe('#dateOfBirth-day');
    });

    it('should use provided anchor when available', () => {
      const errors = {
        field1: { message: 'Field 1 is required', anchor: 'custom-anchor' },
      };

      const result = errorUtils.processErrorsForTemplate(errors);

      expect(result?.errorList[0].href).toBe('#custom-anchor');
    });
  });

  describe('addErrorMessageToField', () => {
    it('should return original field config when no errors', () => {
      const fieldConfig: Record<string, unknown> = {
        type: 'text',
        label: 'Test Field',
      };

      const result = errorUtils.addErrorMessageToField(fieldConfig, 'field1', undefined);

      expect(result).toEqual(fieldConfig);
    });

    it('should return original field config when field has no error', () => {
      const fieldConfig: Record<string, unknown> = {
        type: 'text',
        label: 'Test Field',
      };

      const errors = {
        field2: { message: 'Field 2 error' },
      };

      const result = errorUtils.addErrorMessageToField(fieldConfig, 'field1', errors);

      expect(result).toEqual(fieldConfig);
    });

    it('should add error message to field when error exists', () => {
      const fieldConfig: Record<string, unknown> = {
        type: 'text',
        label: 'Test Field',
      };

      const errors = {
        field1: { message: 'Field 1 is required' },
      };

      const result = errorUtils.addErrorMessageToField(fieldConfig, 'field1', errors);

      expect(result).toEqual({
        ...fieldConfig,
        errorMessage: { text: 'Field 1 is required' },
      });
    });

    it('should convert error message to string', () => {
      const fieldConfig: Record<string, unknown> = {
        type: 'text',
        label: 'Test Field',
      };

      const errors = {
        field1: { message: 123 as unknown as string }, // Test with non-string message
      };

      const result = errorUtils.addErrorMessageToField(fieldConfig, 'field1', errors);

      expect(result).toEqual({
        ...fieldConfig,
        errorMessage: { text: '123' },
      });
    });
  });
});
