import { StepConfig } from '../../../../../main/modules/journey/engine/schema';

const loggerMock = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

jest.mock('@modules/logger', () => ({
  Logger: { getLogger: jest.fn(() => loggerMock) },
}));

// No LaunchDarkly usage here but keep mock alignment with engine tests
jest.mock('@launchdarkly/node-server-sdk', () => ({ init: () => ({ variation: jest.fn() }) }));

const { JourneyValidator } = require('../../../../../main/modules/journey/engine/validation');

describe('JourneyValidator – date fields and checkbox arrays', () => {
  const validator = new JourneyValidator();

  it('returns detailed errors for missing required date field parts', () => {
    const stepConfig = {
      id: 'dobStep',
      title: 'Date of birth',
      type: 'form',
      fields: {
        dob: {
          type: 'date',
          validate: {
            required: true,
            minLength: 0,
            maxLength: 100,
            min: 0,
            max: 100,
            email: false,
            postcode: false,
            url: false,
          },
          errorMessages: {
            required: 'Enter your date of birth',
            missingParts: () => 'Date must include a day, month and year',
            invalidPart: (field: string) => `Enter a valid ${field}`,
          },
        },
      },
    } as const;

    const result = validator.validate(stepConfig as unknown as StepConfig, {});
    expect(result.success).toBe(false);
    expect(result.errors?.dob?.message).toMatch(/date of birth/i);
  });

  it('validates checkbox arrays and produces error when none selected', () => {
    const stepCfg = {
      id: 'pets',
      type: 'form',
      fields: {
        animals: {
          type: 'checkboxes',
          validate: {
            required: true,
            minLength: 0,
            maxLength: 100,
            min: 0,
            max: 100,
            email: false,
            postcode: false,
            url: false,
          },
          items: ['Dog', 'Cat'],
        },
      },
    } as const;

    const result = validator.validate(stepCfg as unknown as StepConfig, {});
    expect(result.success).toBe(false);
    expect(result.errors?.animals).toBeDefined();
  });

  it('accepts single checkbox value sent as string and coerces to array', () => {
    const stepCfg = {
      id: 'pets',
      type: 'form',
      fields: {
        animals: {
          type: 'checkboxes',
          validate: {
            required: true,
            minLength: 0,
            maxLength: 100,
            min: 0,
            max: 100,
            email: false,
            postcode: false,
            url: false,
          },
          items: ['Dog', 'Cat'],
        },
      },
    } as const;

    const result = validator.validate(stepCfg as unknown as StepConfig, { animals: 'Dog' });
    expect(result.success).toBe(true);
    expect(result.data?.animals).toEqual(['Dog']);
  });

  it('uses customMessage function to generate error text', () => {
    const stepCfg = {
      id: 'email',
      type: 'form',
      fields: {
        personalEmail: {
          type: 'email',
          validate: {
            customMessage: (code: string) => `custom-${code}`,
          },
        },
      },
    } as const;

    const res = validator.validate(stepCfg as unknown as StepConfig, { personalEmail: 'not-an-email' });
    expect(res.success).toBe(false);
    expect(res.errors?.personalEmail?.message.startsWith('custom-')).toBe(true);
  });

  it('detects incomplete date (missing month) and returns incomplete message', () => {
    const cfg = {
      id: 'dateStep',
      type: 'form',
      fields: {
        dob: {
          type: 'date',
          errorMessages: {
            missingParts: () => 'incomplete-msg',
            invalidPart: (field: string) => (field === 'month' ? 'bad-month' : ''),
          },
        },
      },
    } as const;

    const res = validator.validate(cfg as unknown as StepConfig, { 'dob-day': '01', 'dob-year': '2000' });
    expect(res.success).toBe(false);
    expect(res.errors?.dob?.message).toBe('incomplete-msg');
    // Anchor is only added for invalid part errors, not incomplete
  });

  it('detects invalid month out of range', () => {
    const cfg = {
      id: 'd2',
      type: 'form',
      fields: { dob: { type: 'date' } },
    } as const;
    const res = validator.validate(cfg as unknown as StepConfig, {
      'dob-day': '10',
      'dob-month': '13',
      'dob-year': '2000',
    });
    expect(res.success).toBe(false);
    expect(res.errors?.['dob-month']?.message).toBe('Enter a valid month');
    expect(res.errors?.dob?.message).toBe('Enter a valid date');
    expect(res.errors?.dob?._fieldOnly).toBe(true);
  });

  it('falls back when customMessage throws', () => {
    const cfg = {
      id: 'num',
      type: 'form',
      fields: {
        age: {
          type: 'number',
          validate: {
            min: 10,
            customMessage: () => {
              throw new Error('boom');
            },
          },
        },
      },
    } as const;

    const res = validator.validate(cfg as unknown as StepConfig, { age: 5 });
    expect(res.success).toBe(false);
    expect(res.errors?.age?.message).toMatch(/10/);
  });

  it('validates individual date field components with proper error messages', () => {
    const step: StepConfig = {
      id: 'test',
      title: 'Test',
      type: 'form',
      fields: {
        dateOfBirth: {
          type: 'date',
          fieldset: {
            legend: { text: 'Date of birth', isPageHeading: true },
          },
          validate: {
            required: true,
            minLength: 0,
            maxLength: 100,
            min: 0,
            max: 100,
            email: false,
            postcode: false,
            url: false,
          },
        },
      },
    };

    // Test individual field validation - invalid day
    const submissionWithInvalidDay = {
      'dateOfBirth-day': '32', // Invalid day
      'dateOfBirth-month': '12',
      'dateOfBirth-year': '1990',
    };

    const result1 = validator.validate(step, submissionWithInvalidDay);
    expect(result1.success).toBe(false);
    expect(result1.errors?.['dateOfBirth-day']?.message).toBe('Enter a valid day');
    expect(result1.errors?.dateOfBirth?.message).toBe('Enter a valid date');
    expect(result1.errors?.dateOfBirth?._fieldOnly).toBe(true);

    // Test individual field validation - invalid month
    const submissionWithInvalidMonth = {
      'dateOfBirth-day': '15',
      'dateOfBirth-month': '13', // Invalid month
      'dateOfBirth-year': '1990',
    };

    const result2 = validator.validate(step, submissionWithInvalidMonth);
    expect(result2.success).toBe(false);
    expect(result2.errors?.['dateOfBirth-month']?.message).toBe('Enter a valid month');
    expect(result2.errors?.dateOfBirth?.message).toBe('Enter a valid date');
    expect(result2.errors?.dateOfBirth?._fieldOnly).toBe(true);

    // Test individual field validation - invalid year
    const submissionWithInvalidYear = {
      'dateOfBirth-day': '15',
      'dateOfBirth-month': '12',
      'dateOfBirth-year': '999', // Invalid year (too short)
    };

    const result3 = validator.validate(step, submissionWithInvalidYear);
    expect(result3.success).toBe(false);
    expect(result3.errors?.['dateOfBirth-year']?.message).toBe('Enter a valid year');
    expect(result3.errors?.dateOfBirth?.message).toBe('Enter a valid date');
    expect(result3.errors?.dateOfBirth?._fieldOnly).toBe(true);

    // Test individual field validation - non-numeric values
    const submissionWithNonNumeric = {
      'dateOfBirth-day': 'abc',
      'dateOfBirth-month': 'def',
      'dateOfBirth-year': 'ghi',
    };

    const result4 = validator.validate(step, submissionWithNonNumeric);
    expect(result4.success).toBe(false);
    expect(result4.errors?.['dateOfBirth-day']?.message).toBe('Enter a valid day');
    expect(result4.errors?.['dateOfBirth-month']?.message).toBe('Enter a valid month');
    expect(result4.errors?.['dateOfBirth-year']?.message).toBe('Enter a valid year');
    expect(result4.errors?.dateOfBirth?.message).toBe('Enter a valid date');
    expect(result4.errors?.dateOfBirth?._fieldOnly).toBe(true);
  });

  it('shows missing parts error when correct type but other fields blank', () => {
    const step: StepConfig = {
      id: 'test',
      title: 'Test',
      type: 'form',
      fields: {
        dateOfBirth: {
          type: 'date',
          fieldset: {
            legend: { text: 'Date of birth', isPageHeading: true },
          },
          validate: {
            required: true,
            minLength: 0,
            maxLength: 100,
            min: 0,
            max: 100,
            email: false,
            postcode: false,
            url: false,
          },
        },
      },
    };

    // Test missing parts - correct type but missing other fields
    const submissionWithMissingParts = {
      'dateOfBirth-day': '01', // Valid day
      'dateOfBirth-month': '', // Missing month
      'dateOfBirth-year': '', // Missing year
    };

    const result = validator.validate(step, submissionWithMissingParts);
    expect(result.success).toBe(false);
    expect(result.errors?.dateOfBirth?.message).toBe('dateOfBirth must include month and year');
    expect(result.errors?.dateOfBirth?._fieldOnly).toBe(true); // Should be in summary
  });

  it('shows invalid date error when incorrect type but other fields blank', () => {
    const step: StepConfig = {
      id: 'test',
      title: 'Test',
      type: 'form',
      fields: {
        dateOfBirth: {
          type: 'date',
          fieldset: {
            legend: { text: 'Date of birth', isPageHeading: true },
          },
          validate: {
            required: true,
            minLength: 0,
            maxLength: 100,
            min: 0,
            max: 100,
            email: false,
            postcode: false,
            url: false,
          },
        },
      },
    };

    // Test invalid parts - incorrect type but missing other fields
    const submissionWithInvalidParts = {
      'dateOfBirth-day': 'AA', // Invalid day (non-numeric)
      'dateOfBirth-month': '', // Missing month
      'dateOfBirth-year': '', // Missing year
    };

    const result = validator.validate(step, submissionWithInvalidParts);
    expect(result.success).toBe(false);
    expect(result.errors?.['dateOfBirth-day']?.message).toBe('Enter a valid day');
    expect(result.errors?.['dateOfBirth-month']?.message).toBe('Enter a valid month');
    expect(result.errors?.['dateOfBirth-year']?.message).toBe('Enter a valid year');
    expect(result.errors?.dateOfBirth?.message).toBe('dateOfBirth must be a real date');
    expect(result.errors?.dateOfBirth?._fieldOnly).toBe(true); // Should not be in summary
  });

  it('shows both invalid and missing part errors when mixed', () => {
    const step: StepConfig = {
      id: 'test',
      title: 'Test',
      type: 'form',
      fields: {
        dateOfBirth: {
          type: 'date',
          fieldset: {
            legend: { text: 'Date of birth', isPageHeading: true },
          },
          validate: {
            required: true,
            minLength: 0,
            maxLength: 100,
            min: 0,
            max: 100,
            email: false,
            postcode: false,
            url: false,
          },
        },
      },
    };

    // Test scenario from image: invalid day + missing month + valid year
    const submissionWithMixedErrors = {
      'dateOfBirth-day': 'ff', // Invalid day (non-numeric)
      'dateOfBirth-month': '', // Missing month
      'dateOfBirth-year': '2050', // Valid year (but might be invalid for DOB)
    };

    const result = validator.validate(step, submissionWithMixedErrors);
    expect(result.success).toBe(false);
    expect(result.errors?.['dateOfBirth-day']?.message).toBe('Enter a valid day');
    expect(result.errors?.['dateOfBirth-month']?.message).toBe('Enter a valid month');
    expect(result.errors?.dateOfBirth?.message).toBe('dateOfBirth must be a real date');
    expect(result.errors?.dateOfBirth?._fieldOnly).toBe(true); // Should not be in summary

    // Verify part-specific error messages are stored for engine styling
    expect(result.errors?.dateOfBirth?.day).toBe('Enter a valid day');
    expect(result.errors?.dateOfBirth?.month).toBe('Enter a valid month');
    expect(result.errors?.dateOfBirth?.year).toBeUndefined(); // No error for year
  });
});
