import { StepConfig } from '../../../../../main/modules/journey/engine/schema';

const loggerMock = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

jest.mock('@hmcts/nodejs-logging', () => ({
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
          validate: { required: true },
          errorMessages: {
            required: 'Enter your date of birth',
            incomplete: 'Date must include a day, month and year',
            day: 'Enter a valid day',
            month: 'Enter a valid month',
            year: 'Enter a valid year',
          },
        },
      },
    } as const;

    const result = validator.validate(stepConfig as unknown as StepConfig, {});
    expect(result.success).toBe(false);
    expect(result.errors?.dob?.message).toBe('Enter your date of birth');
  });

  it('validates checkbox arrays and produces error when none selected', () => {
    const stepCfg = {
      id: 'pets',
      type: 'form',
      fields: {
        animals: {
          type: 'checkboxes',
          validate: { required: true },
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
          validate: { required: true },
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
          errorMessages: { incomplete: 'incomplete-msg', month: 'bad-month' },
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
    expect(res.errors?.dob?.month).toMatch(/valid month/);
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
});
