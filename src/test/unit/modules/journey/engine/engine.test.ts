import fs from 'fs';
import path from 'path';

import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { FieldConfig, JourneyConfig, StepConfig } from '../../../../../main/modules/journey/engine/schema';

const { WizardEngine } = require('../../../../../main/modules/journey/engine/engine');
const { memoryStore } = require('../../../../../main/modules/journey/engine/storage/memoryStore');
const { sessionStore } = require('../../../../../main/modules/journey/engine/storage/sessionStore');
const { JourneyValidator } = require('../../../../../main/modules/journey/engine/validation');

jest.mock('@hmcts/nodejs-logging', () => {
  const loggerInstance = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
  return { Logger: { getLogger: jest.fn(() => loggerInstance) } };
});

// LaunchDarkly client mock – suites manipulate variationMock as required
const variationMock = jest.fn();

afterEach(() => {
  variationMock.mockReset();
});

jest.mock('@launchdarkly/node-server-sdk', () => ({
  init: () => ({ variation: variationMock }),
}));

jest.mock('../../../../../main/modules/steps/i18n', () => ({}));

const makeReq = () =>
  ({
    app: { locals: { launchDarklyClient: { variation: variationMock } } },
    session: { user: { uid: 'u123', name: 'Test' } },
  }) as unknown as Request;

// Minimal Express request stub for memoryStore tests that do not need LD data
const reqStub = {} as unknown as { session?: Record<string, unknown> };

// Typed noop translator that returns defaultValue if provided, else the key (string or first of array)
const makeNoopT = (): TFunction =>
  ((key: string | string[], defaultValue?: string) =>
    Array.isArray(key)
      ? (defaultValue ?? (key[0] as string))
      : (defaultValue ?? (key as string))) as unknown as TFunction;

describe('WizardEngine - core utilities & validator', () => {
  const journeyConfig = {
    meta: {
      name: 'Utility Test Journey',
      description: 'Journey used exclusively for unit testing utility functions',
      version: '1.0.0',
    },
    steps: {
      start: {
        id: 'start',
        title: 'Start',
        type: 'form',
        fields: {
          field1: { type: 'text', validate: { required: true } },
        },
        next: 'mid',
      },
      mid: {
        id: 'mid',
        title: 'Mid',
        type: 'form',
        fields: {
          choice: { type: 'text' },
        },
        next: {
          when: (stepData: Record<string, unknown>) => stepData.choice === 'yes',
          goto: 'yesStep',
          else: 'noStep',
        },
      },
      yesStep: { id: 'yesStep', title: 'Yes branch', type: 'confirmation' },
      noStep: { id: 'noStep', title: 'No branch', type: 'confirmation' },
    },
    config: { store: { type: 'memory' } },
  } as const;

  const engine = new WizardEngine(journeyConfig, 'utility-tests');

  it('sanitizePathSegment strips disallowed characters', () => {
    expect(engine['sanitizePathSegment']('hello/world?bad%chars!')).toBe('helloworldbadchars');
  });

  describe('resolveNext helper', () => {
    const midStep = engine['journey'].steps.mid;

    it('returns static next when next is string', () => {
      const startStep = engine['journey'].steps.start;
      expect(engine['resolveNext'](startStep, {})).toBe('mid');
    });

    it('evaluates functional branching (true branch)', () => {
      const nextId = engine['resolveNext'](midStep, { mid: { choice: 'yes' } });
      expect(nextId).toBe('yesStep');
    });

    it('evaluates functional branching (else branch)', () => {
      const nextId = engine['resolveNext'](midStep, { mid: { choice: 'no' } });
      expect(nextId).toBe('noStep');
    });
  });

  it('findPreviousStep identifies previous step in linear flow', () => {
    expect(engine['findPreviousStep']('mid', {})).toBe('start');
  });

  it('isStepAccessible respects journey progress', () => {
    expect(engine['isStepAccessible']('mid', {})).toBe(false);
    expect(engine['isStepAccessible']('mid', { start: { field1: 'x' } })).toBe(true);
  });

  it('isStepComplete correctly handles optional and required fields', () => {
    // Create a journey with mixed optional and required fields
    const testJourneyConfig = {
      meta: {
        name: 'Test Journey',
        description: 'Journey with mixed fields',
        version: '1.0.0',
      },
      steps: {
        optional: {
          id: 'optional',
          title: 'Optional Step',
          type: 'form',
          fields: {
            optionalField: {
              type: 'date',
              validate: { required: false },
            },
          },
          next: 'mixed',
        },
        mixed: {
          id: 'mixed',
          title: 'Mixed Step',
          type: 'form',
          fields: {
            requiredField: {
              type: 'text',
              validate: { required: true },
            },
            optionalField: {
              type: 'date',
              validate: { required: false },
            },
          },
          next: 'confirmation',
        },
        confirmation: {
          id: 'confirmation',
          title: 'Done',
          type: 'confirmation',
        },
      },
      config: { store: { type: 'memory' } },
    } as const;

    const testEngine = new WizardEngine(testJourneyConfig, 'test-tests');

    // Optional step with no data should be complete
    expect(testEngine['isStepComplete']('optional', {})).toBe(true);

    // Optional step with empty data should be complete
    expect(testEngine['isStepComplete']('optional', { optional: {} })).toBe(true);

    // Optional step with partial data should be complete
    expect(testEngine['isStepComplete']('optional', { optional: { optionalField: { day: '01' } } })).toBe(true);

    // Mixed step with no data should be incomplete (has required field)
    expect(testEngine['isStepComplete']('mixed', {})).toBe(false);

    // Mixed step with only optional data should be incomplete
    expect(testEngine['isStepComplete']('mixed', { mixed: { optionalField: { day: '01' } } })).toBe(false);

    // Mixed step with required data should be complete
    expect(testEngine['isStepComplete']('mixed', { mixed: { requiredField: 'some value' } })).toBe(true);

    // Mixed step with both required and optional data should be complete
    expect(
      testEngine['isStepComplete']('mixed', {
        mixed: {
          requiredField: 'some value',
          optionalField: { day: '01', month: '02', year: '2000' },
        },
      })
    ).toBe(true);

    // Mixed step with incomplete required date field should be incomplete
    expect(
      testEngine['isStepComplete']('mixed', {
        mixed: {
          requiredField: 'some value',
          optionalField: { day: '01' }, // missing month and year
        },
      })
    ).toBe(true); // This should still be complete since optionalField is not required
  });

  it('isStepComplete correctly excludes button fields from validation', () => {
    // Create a journey with button fields
    const buttonJourneyConfig = {
      meta: {
        name: 'Button Test Journey',
        description: 'Journey with button fields',
        version: '1.0.0',
      },
      steps: {
        withButton: {
          id: 'withButton',
          title: 'Step with Button',
          type: 'form',
          fields: {
            textField: {
              type: 'text',
              validate: { required: true },
            },
            continueButton: {
              type: 'button',
              attributes: {
                type: 'submit',
              },
            },
          },
          next: 'confirmation',
        },
        confirmation: {
          id: 'confirmation',
          title: 'Done',
          type: 'confirmation',
        },
      },
      config: { store: { type: 'memory' } },
    } as const;

    const buttonEngine = new WizardEngine(buttonJourneyConfig, 'button-tests');

    // Step with button should be incomplete when required field is missing
    expect(buttonEngine['isStepComplete']('withButton', {})).toBe(false);

    // Step with button should be complete when required field has data
    expect(buttonEngine['isStepComplete']('withButton', { withButton: { textField: 'some value' } })).toBe(true);

    // Step with button should be complete when required field has data (button field should be ignored)
    expect(
      buttonEngine['isStepComplete']('withButton', {
        withButton: {
          textField: 'some value',
          continueButton: 'button value', // This should be ignored
        },
      })
    ).toBe(true);
  });

  it('isStepAccessible allows progression with optional fields left blank', () => {
    // Create a journey with optional fields
    const optionalJourneyConfig = {
      meta: {
        name: 'Optional Test Journey',
        description: 'Journey with optional fields',
        version: '1.0.0',
      },
      steps: {
        optional: {
          id: 'optional',
          title: 'Optional Step',
          type: 'form',
          fields: {
            optionalField: {
              type: 'date',
              validate: { required: false },
            },
          },
          next: 'next',
        },
        next: {
          id: 'next',
          title: 'Next Step',
          type: 'form',
          fields: {
            requiredField: {
              type: 'text',
              validate: { required: true },
            },
          },
          next: 'confirmation',
        },
        confirmation: {
          id: 'confirmation',
          title: 'Done',
          type: 'confirmation',
        },
      },
      config: { store: { type: 'memory' } },
    } as const;

    const optionalEngine = new WizardEngine(optionalJourneyConfig, 'optional-tests');

    // Should be able to access 'next' step even when optional step has no data
    expect(optionalEngine['isStepAccessible']('next', {})).toBe(true);

    // Should be able to access 'next' step when optional step has empty data
    expect(optionalEngine['isStepAccessible']('next', { optional: {} })).toBe(true);

    // Should be able to access 'next' step when optional step has partial data
    expect(optionalEngine['isStepAccessible']('next', { optional: { optionalField: { day: '01' } } })).toBe(true);

    // Should NOT be able to access 'next' step when it has required fields but no data
    expect(optionalEngine['isStepAccessible']('confirmation', { optional: {} })).toBe(false);

    // Should be able to access 'confirmation' when 'next' has required data
    expect(
      optionalEngine['isStepAccessible']('confirmation', {
        optional: {},
        next: { requiredField: 'some value' },
      })
    ).toBe(true);
  });

  it('buildSummaryRows returns formatted data', () => {
    const rows = engine['buildSummaryRows']({ start: { field1: 'abc' }, mid: { choice: 'y' } }, makeNoopT(), 'en');
    expect(rows).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: { text: 'Start' }, value: { text: 'abc' } })])
    );
  });

  // Validator happy / unhappy path
  const validator = new JourneyValidator();
  const stepCfg = {
    id: 'emailStep',
    type: 'form',
    fields: { email: { type: 'email', validate: { required: true } } },
  } as const;

  it('JourneyValidator success path', () => {
    const res = validator.validate(stepCfg as unknown as StepConfig, { email: 'test@example.com' });
    expect(res.success).toBe(true);
  });

  it('JourneyValidator failure path', () => {
    const res = validator.validate(stepCfg as unknown as StepConfig, { email: 'bad' });
    expect(res.success).toBe(false);
  });

  // memoryStore deep-merge behaviour
  it('memoryStore deep-merges step patches', async () => {
    const store = memoryStore('test-slug');
    await store.save(reqStub, 'case1', 0, { stepA: { foo: 'bar' } });
    await store.save(reqStub, 'case1', 1, { stepA: { baz: 'qux' }, stepB: 'val' });
    const { data } = await store.load(reqStub, 'case1');
    expect(data).toEqual({ stepA: { foo: 'bar', baz: 'qux' }, stepB: 'val' });
  });
});

describe('WizardEngine - buildJourneyContext', () => {
  const createEngine = () => {
    const journey = {
      meta: { name: 'CTX', description: 'ctx', version: '1.0.0' },
      steps: {
        start: {
          id: 'start',
          title: 'Start',
          type: 'form',
          fields: {
            dob: { type: 'date' },
            gender: { type: 'radios', items: ['M', 'F'] },
            country: { type: 'select', items: ['UK', 'US'] },
            submit: { type: 'button' },
          },
          next: 'confirmation',
        },
        confirmation: { id: 'confirmation', type: 'confirmation', title: 'Done' },
      },
    } as const;
    return new WizardEngine(journey, 'ctx-slug');
  };

  const engine = createEngine();
  const step = engine.journey.steps.start;

  it('buildJourneyContext processes complex fields', () => {
    const ctx = engine['buildJourneyContext'](
      step,
      'case-1',
      {
        start: { dob: { day: '01', month: '02', year: '2000' }, gender: 'M', country: 'UK' },
      },
      makeNoopT(),
      'en'
    );

    const dobItems = (ctx.step.fields?.dob as unknown as FieldConfig).items;
    expect(dobItems).toHaveLength(3);
    expect((ctx.step.fields?.submit as unknown as FieldConfig).text).toBe('Continue');
  });

  it('resolveTemplatePath falls back to defaults & custom templates', async () => {
    expect(await engine['resolveTemplatePath']('confirmation')).toBe('_defaults/confirmation');
    expect(await engine['resolveTemplatePath']('start')).toBe('_defaults/form');

    const engine2 = (() => {
      const journey = { ...createEngine().journey } as unknown as JourneyConfig;
      const eng = new WizardEngine(journey, 'custom-slug');
      eng.journey.steps.start.template = 'custom/my-template';
      return eng;
    })();
    expect(await engine2['resolveTemplatePath']('start')).toBe('custom/my-template');
  });

  it('resolveTemplatePath detects DSL template on disk', async () => {
    const accessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined as unknown as void);
    const engine3 = new WizardEngine(createEngine().journey, 'dsl-slug');
    const expectedRel = path.join('dsl-slug', 'steps', 'start', 'start');
    expect(await engine3['resolveTemplatePath']('start')).toBe(expectedRel);
    expect(accessSpy).toHaveBeenCalled();
  });

  it('applyLaunchDarklyFlags hides fields when flag false', async () => {
    variationMock.mockResolvedValue(false);
    const filtered = await engine['applyLaunchDarklyFlags'](step, makeReq());
    expect(filtered.fields).toEqual({});
  });
});

describe('WizardEngine - buildSummaryRows', () => {
  const journey = {
    meta: { name: 'Summary', description: 'Summary', version: '1.0.0' },
    steps: {
      start: { id: 'start', type: 'form', fields: { name: { type: 'text' } }, next: 'details' },
      details: {
        id: 'details',
        type: 'form',
        fields: {
          dob: { type: 'date' },
          pets: { type: 'checkboxes', items: ['Dog', 'Cat'] },
        },
        next: 'summary',
      },
      summary: { id: 'summary', type: 'summary', title: 'Check', next: 'confirmation' },
      confirmation: { id: 'confirmation', type: 'confirmation', title: 'Done' },
    },
    config: { store: { type: 'redis' } },
  } as const;

  const engine = new WizardEngine(journey, 'extra');

  it('buildSummaryRows formats date & checkbox values', () => {
    const rows = engine['buildSummaryRows'](
      {
        start: { name: 'Alice' },
        details: { dob: { day: '01', month: '02', year: '2000' }, pets: ['Dog', 'Cat'] },
      },
      makeNoopT(),
      'en'
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const combinedTexts = rows.map((r: unknown) => (r as { value: { text: string } }).value.text).join(' ');
    expect(combinedTexts).toContain('Alice 1 2 2000 Dog, Cat');
    expect(combinedTexts).toContain('Dog, Cat');
  });

  it('isStepAccessible blocks non-confirmation after completion', () => {
    expect(engine['isStepAccessible']('details', { confirmation: { ref: 'x' } })).toBe(false);
    expect(engine['isStepAccessible']('confirmation', { confirmation: { ref: 'x' } })).toBe(true);
  });

  it('resolveNext returns else when when-clause is not function', () => {
    const dummyStep = {
      id: 'dummy',
      type: 'form',
      fields: {},
      next: { when: 'bad', goto: 'x', else: 'y' },
    } as unknown as StepConfig;
    expect(engine['resolveNext'](dummyStep, { dummy: {} })).toBe('y');
  });

  // LaunchDarkly helper combinations
  it('applyLdOverride merges & prunes nulls', async () => {
    variationMock.mockResolvedValueOnce({ title: 'Override', some: null });
    const patched = await engine['applyLdOverride'](engine.journey.steps.start, makeReq());
    expect(patched.title).toBe('Override');
    expect(patched.some).toBeUndefined();
  });

  // sessionStore behaviour
  it('sessionStore read / write', async () => {
    const store = sessionStore('sess-test');
    const req = { session: {} } as unknown as Request;
    await store.save(req, 'caseZ', 0, { a: 'b' });
    expect((await store.load(req, 'caseZ')).data).toEqual({ a: 'b' });
  });
});

describe('WizardEngine - applyLaunchDarklyFlags', () => {
  const journey = {
    meta: { name: 'More', description: 'Cover', version: '1.0.0' },
    steps: {
      start: {
        id: 'start',
        title: 'StartTitle',
        type: 'form',
        fields: {
          name: {
            type: 'text',
            fieldset: { legend: { text: 'Your name', isPageHeading: true } },
          },
        },
        next: 'buttonOnly',
      },
      buttonOnly: {
        id: 'buttonOnly',
        type: 'form',
        fields: { continue: { type: 'button' } },
        next: 'logic',
      },
      logic: {
        id: 'logic',
        type: 'form',
        fields: { choice: { type: 'text' } },
        next: {
          when: () => {
            throw new Error('test err');
          },
          goto: 'end',
          else: 'end',
        },
      },
      end: { id: 'end', type: 'confirmation', title: 'Done', flag: 'disable-end' },
    },
    config: { store: { type: 'memory' } },
  } as const;

  const engine = new WizardEngine(journey, 'more');

  it('hasInputFields returns false when only button present', () => {
    expect(engine['hasInputFields'](journey.steps.buttonOnly)).toBe(false);
  });

  it('buildSummaryRows prefers fieldset legend when isPageHeading true', () => {
    const rows = engine['buildSummaryRows']({ start: { name: 'Alice' } }, makeNoopT(), 'en');
    expect(rows[0].key.text).toBe('Your name');
  });

  it('resolveNext uses else branch when when-function throws', () => {
    const next = engine['resolveNext'](journey.steps.logic, { logic: { choice: 'x' } });
    expect(next).toBe('end');
  });

  it('applyLaunchDarklyFlags disables entire step when flag false', async () => {
    variationMock.mockResolvedValue(false);
    const filtered = await engine['applyLaunchDarklyFlags'](journey.steps.end, makeReq());
    expect(filtered.fields).toEqual({});
  });

  it('getPreviousVisibleStep skips hidden step', async () => {
    variationMock.mockResolvedValue(false);
    const prev = await engine['getPreviousVisibleStep']('end', makeReq(), { start: { name: 'Alice' } });
    expect(prev).toBeNull();
  });
});

describe('WizardEngine - date input attributes', () => {
  const journeyConfig = {
    meta: {
      name: 'Date Test Journey',
      description: 'Journey for testing date input attributes',
      version: '1.0.0',
    },
    steps: {
      start: {
        id: 'start',
        title: 'Date Input Test',
        type: 'form',
        fields: {
          dateOfBirth: {
            type: 'date',
            fieldset: {
              legend: { text: 'Date of birth', isPageHeading: true },
            },
            validate: { required: true },
          },
        },
        next: 'confirmation',
      },
      confirmation: {
        id: 'confirmation',
        title: 'Complete',
        type: 'confirmation',
      },
    },
    config: { store: { type: 'memory' } },
  } as const;

  const engine = new WizardEngine(journeyConfig, 'date-test');

  it('adds maxlength attribute to year input in date fields', () => {
    const step = journeyConfig.steps.start;
    const context = engine['buildJourneyContext'](step, 'test-case', {}, makeNoopT(), 'en');

    // Check that the date items are built correctly
    expect(context.dateItems).toBeDefined();
    expect(context.dateItems?.dateOfBirth).toBeDefined();

    const dateItems = context.dateItems!.dateOfBirth;
    expect(dateItems).toHaveLength(3);

    // Check day input
    expect(dateItems[0]).toEqual({
      name: 'day',
      label: 'date.day',
      classes: 'govuk-input--width-2',
      value: '',
      attributes: {
        maxlength: '2',
        inputmode: 'numeric',
      },
    });

    // Check month input
    expect(dateItems[1]).toEqual({
      name: 'month',
      label: 'date.month',
      classes: 'govuk-input--width-2',
      value: '',
      attributes: {
        maxlength: '2',
        inputmode: 'numeric',
      },
    });

    // Check year input has maxlength attribute
    expect(dateItems[2]).toEqual({
      name: 'year',
      label: 'date.year',
      classes: 'govuk-input--width-4',
      value: '',
      attributes: {
        maxlength: '4',
        inputmode: 'numeric',
      },
    });
  });

  it('renders maxlength attribute in processed fields for date inputs', () => {
    const step = journeyConfig.steps.start;
    const context = engine['buildJourneyContext'](step, 'test-case', {}, makeNoopT(), 'en');

    // Check that the processed fields include the date items with maxlength
    expect(context.step.fields?.dateOfBirth).toBeDefined();
    const dateField = context.step.fields!.dateOfBirth;

    // Check that the items array includes the year with maxlength attribute
    expect(dateField.items).toBeDefined();
    const yearItem = dateField.items!.find((item: { name: string }) => item.name === 'year');
    expect(yearItem).toBeDefined();
    expect(yearItem!.attributes).toEqual({
      maxlength: '4',
      inputmode: 'numeric',
    });
  });
});

describe('WizardEngine - conditional data cleanup', () => {
  const cleanupJourneyConfig = {
    meta: {
      name: 'Cleanup Test Journey',
      description: 'Journey for testing conditional data cleanup',
      version: '1.0.0',
    },
    steps: {
      choice: {
        id: 'choice',
        title: 'Choice Step',
        type: 'form',
        fields: {
          isCorrespondenceAddress: {
            type: 'radios',
            items: ['yes', 'no'],
            validate: { required: true },
          },
        },
        next: 'address',
      },
      address: {
        id: 'address',
        title: 'Address Step',
        type: 'form',
        fields: {
          correspondenceAddress: {
            type: 'address',
            validate: {
              required: (stepData: Record<string, unknown>, allData: Record<string, unknown>) =>
                (allData.choice as Record<string, unknown>)?.isCorrespondenceAddress === 'no',
            },
          },
        },
        next: 'confirmation',
      },
      confirmation: {
        id: 'confirmation',
        title: 'Complete',
        type: 'confirmation',
      },
    },
    config: { store: { type: 'memory' } },
  } as const;

  const cleanupEngine = new WizardEngine(cleanupJourneyConfig, 'cleanup-test');

  it('cleanupConditionalData removes data when conditional field is not required', async () => {
    const step = cleanupJourneyConfig.steps.address;
    const stepData = {
      correspondenceAddress: {
        addressLine1: '123 Test Street',
        town: 'Test City',
        postcode: 'TE1 1ST',
      },
    };
    const allData = {
      choice: { isCorrespondenceAddress: 'yes' }, // Field is NOT required
      address: stepData,
    };

    const cleanedData = await cleanupEngine['cleanupConditionalData'](step, stepData, allData);

    // Should remove correspondenceAddress since isCorrespondenceAddress is 'yes'
    expect(cleanedData).toEqual({});
    expect(cleanedData.correspondenceAddress).toBeUndefined();
  });

  it('cleanupConditionalData preserves data when conditional field is required', async () => {
    const step = cleanupJourneyConfig.steps.address;
    const stepData = {
      correspondenceAddress: {
        addressLine1: '123 Test Street',
        town: 'Test City',
        postcode: 'TE1 1ST',
      },
    };
    const allData = {
      choice: { isCorrespondenceAddress: 'no' }, // Field IS required
      address: stepData,
    };

    const cleanedData = await cleanupEngine['cleanupConditionalData'](step, stepData, allData);

    // Should preserve correspondenceAddress since isCorrespondenceAddress is 'no'
    expect(cleanedData).toEqual(stepData);
    expect(cleanedData.correspondenceAddress).toEqual(stepData.correspondenceAddress);
  });

  it('cleanupConditionalData preserves data for static optional fields', async () => {
    const staticOptionalJourneyConfig = {
      meta: {
        name: 'Static Optional Test',
        description: 'Journey for testing static optional fields',
        version: '1.0.0',
      },
      steps: {
        optional: {
          id: 'optional',
          title: 'Optional Step',
          type: 'form',
          fields: {
            optionalField: {
              type: 'text',
              validate: { required: false }, // Static optional field
            },
          },
          next: 'confirmation',
        },
        confirmation: {
          id: 'confirmation',
          title: 'Complete',
          type: 'confirmation',
        },
      },
      config: { store: { type: 'memory' } },
    } as const;

    const staticEngine = new WizardEngine(staticOptionalJourneyConfig, 'static-optional-test');
    const step = staticOptionalJourneyConfig.steps.optional;
    const stepData = {
      optionalField: 'some value',
    };
    const allData = {
      optional: stepData,
    };

    const cleanedData = await staticEngine['cleanupConditionalData'](step, stepData, allData);

    // Should preserve data for static optional fields
    expect(cleanedData).toEqual(stepData);
    expect(cleanedData.optionalField).toBe('some value');
  });

  it('cleanupConditionalData handles errors gracefully', async () => {
    const errorJourneyConfig = {
      meta: {
        name: 'Error Test',
        description: 'Journey for testing error handling',
        version: '1.0.0',
      },
      steps: {
        error: {
          id: 'error',
          title: 'Error Step',
          type: 'form',
          fields: {
            errorField: {
              type: 'text',
              validate: {
                required: () => {
                  throw new Error('Test error');
                },
              },
            },
          },
          next: 'confirmation',
        },
        confirmation: {
          id: 'confirmation',
          title: 'Complete',
          type: 'confirmation',
        },
      },
      config: { store: { type: 'memory' } },
    } as const;

    const errorEngine = new WizardEngine(errorJourneyConfig, 'error-test');
    const step = errorJourneyConfig.steps.error;
    const stepData = {
      errorField: 'some value',
    };
    const allData = {
      error: stepData,
    };

    const cleanedData = await errorEngine['cleanupConditionalData'](step, stepData, allData);

    // Should preserve data when error occurs
    expect(cleanedData).toEqual(stepData);
    expect(cleanedData.errorField).toBe('some value');
  });

  it('buildSummaryRows shows all data as-is (no artificial hiding)', () => {
    // This test verifies that summary rows show the actual data without artificial hiding
    // The cleanup should happen at form submission time, not at display time

    const realWorldJourneyConfig = {
      meta: {
        name: 'Real World Test',
        description: 'Journey simulating the actual issue',
        version: '1.0.0',
      },
      steps: {
        correspondenceAddress: {
          id: 'correspondenceAddress',
          title: 'Your correspondence address',
          type: 'form',
          fields: {
            isCorrespondenceAddress: {
              type: 'radios',
              items: ['yes', 'no'],
              validate: { required: true },
            },
            correspondenceAddress: {
              type: 'address',
              label: 'Enter correspondence address',
              validate: {
                required: (stepData: Record<string, unknown>) => stepData.isCorrespondenceAddress === 'no',
              },
            },
          },
          next: 'summary',
        },
        summary: {
          id: 'summary',
          title: 'Summary',
          type: 'summary',
          next: 'confirmation',
        },
        confirmation: {
          id: 'confirmation',
          title: 'Complete',
          type: 'confirmation',
        },
      },
      config: { store: { type: 'memory' } },
    } as const;

    const realWorldEngine = new WizardEngine(realWorldJourneyConfig, 'real-world-test');

    // Simulate the scenario: user selected "Yes" but correspondenceAddress data exists
    const allData = {
      correspondenceAddress: {
        isCorrespondenceAddress: 'yes', // User selected "Yes"
        correspondenceAddress: {
          // But this data still exists
          addressLine1: '66 GREENTOP',
          town: 'PUDSEY',
          postcode: 'LS28 8JB',
        },
      },
    };

    const summaryRows = realWorldEngine['buildSummaryRows'](allData, makeNoopT(), 'en');

    // Should show BOTH rows because the data exists (cleanup should happen at submission time)
    expect(summaryRows).toHaveLength(2);

    // Should have a row for isCorrespondenceAddress
    const isCorrespondenceAddressRow = summaryRows.find(
      (row: { key: { text: string }; value: { text: string } }) => row.key.text === 'Your correspondence address'
    );
    expect(isCorrespondenceAddressRow).toBeDefined();
    expect(isCorrespondenceAddressRow!.value.text).toBe('yes');

    // Should also have a row for correspondenceAddress (because the data exists)
    const correspondenceAddressRow = summaryRows.find(
      (row: { key: { text: string }; value: { text: string } }) => row.key.text === 'Enter correspondence address'
    );
    expect(correspondenceAddressRow).toBeDefined();
  });

  it('form submission cleans up all steps with conditional fields', async () => {
    // This test verifies that when submitting a form, the cleanup logic runs on ALL steps
    // not just the current step, ensuring stale data is removed

    const formSubmissionJourneyConfig = {
      meta: {
        name: 'Form Submission Test',
        description: 'Journey for testing form submission cleanup',
        version: '1.0.0',
      },
      steps: {
        correspondenceAddress: {
          id: 'correspondenceAddress',
          title: 'Your correspondence address',
          type: 'form',
          fields: {
            isCorrespondenceAddress: {
              type: 'radios',
              items: ['yes', 'no'],
              validate: { required: true },
            },
            correspondenceAddress: {
              type: 'address',
              validate: {
                required: (stepData: Record<string, unknown>) => stepData.isCorrespondenceAddress === 'no',
              },
            },
          },
          next: 'summary',
        },
        summary: {
          id: 'summary',
          title: 'Summary',
          type: 'summary',
          next: 'confirmation',
        },
        confirmation: {
          id: 'confirmation',
          title: 'Complete',
          type: 'confirmation',
        },
      },
      config: { store: { type: 'memory' } },
    } as const;

    const formSubmissionEngine = new WizardEngine(formSubmissionJourneyConfig, 'form-submission-test');

    // Create a mock request and store
    const mockReq = { session: {} } as Request;
    const store = formSubmissionEngine['store'];

    // Save initial data with correspondenceAddress populated (from previous "no" selection)
    await store.save(mockReq, 'test-case', 0, {
      correspondenceAddress: {
        isCorrespondenceAddress: 'no', // Previously selected "No"
        correspondenceAddress: {
          // So this data was filled in
          addressLine1: '66 GREENTOP',
          town: 'PUDSEY',
          postcode: 'LS28 8JB',
        },
      },
    });

    // Verify initial data exists
    const { data: initialData } = await store.load(mockReq, 'test-case');
    expect(initialData.correspondenceAddress.correspondenceAddress).toBeDefined();
    expect(initialData.correspondenceAddress.correspondenceAddress.addressLine1).toBe('66 GREENTOP');

    // Simulate form submission where user changes to "Yes"
    const step = formSubmissionJourneyConfig.steps.correspondenceAddress;
    const validationResult = {
      success: true,
      data: {
        isCorrespondenceAddress: 'yes', // User now selects "Yes"
        // correspondenceAddress is not in the form data because it's not required
      },
    };

    // Apply the same cleanup logic that happens in form submission
    const { version, data: currentData } = await store.load(mockReq, 'test-case');

    // Clean up current step
    const cleanedCurrentStepData = await formSubmissionEngine['cleanupConditionalData'](
      step,
      validationResult.data,
      currentData
    );

    // Clean up all other steps (use original currentData, not the cleaned version)
    const allCleanedData = { ...currentData, [step.id]: cleanedCurrentStepData };
    let hasGlobalChanges = false;

    for (const [stepId, stepConfig] of Object.entries(formSubmissionJourneyConfig.steps)) {
      const typedStepConfig = stepConfig as StepConfig;
      if (typedStepConfig.type === 'summary' || typedStepConfig.type === 'confirmation') {
        continue;
      }
      if (!typedStepConfig.fields || Object.keys(typedStepConfig.fields).length === 0) {
        continue;
      }

      // For the current step being submitted, use the cleaned data; for other steps, use original data
      const stepData =
        stepId === step.id
          ? (allCleanedData[stepId] as Record<string, unknown>)
          : (currentData[stepId] as Record<string, unknown>);
      if (!stepData || Object.keys(stepData).length === 0) {
        continue;
      }

      // Always use allCleanedData so the required function sees the updated values
      const cleanedStepData = await formSubmissionEngine['cleanupConditionalData'](
        typedStepConfig,
        stepData,
        allCleanedData
      );

      // Check if cleanup removed any data (compare with original data, not the potentially already cleaned data)
      const originalStepData = currentData[stepId] as Record<string, unknown>;
      if (!originalStepData || Object.keys(cleanedStepData).length !== Object.keys(originalStepData).length) {
        const finalStepData = { ...cleanedStepData };
        if (originalStepData) {
          for (const key of Object.keys(originalStepData)) {
            if (!(key in cleanedStepData)) {
              finalStepData[key] = undefined;
            }
          }
        }
        allCleanedData[stepId] = finalStepData;
        hasGlobalChanges = true;
      }
    }

    // Save the cleaned data
    if (hasGlobalChanges) {
      let currentVersion = version;
      for (const [stepId, stepData] of Object.entries(allCleanedData)) {
        await store.save(mockReq, 'test-case', currentVersion, { [stepId]: stepData });
        currentVersion++;
      }
    }

    // Verify the data was actually removed from the store
    const { data: finalData } = await store.load(mockReq, 'test-case');
    expect(finalData.correspondenceAddress.correspondenceAddress).toBeUndefined();
    expect(finalData.correspondenceAddress.isCorrespondenceAddress).toBe('yes'); // This should still exist
  });
});

describe('WizardEngine - constructor caching', () => {
  const journeyConfig = {
    meta: { name: 'Cache Test Journey', description: 'Test caching', version: '1.0.0' },
    steps: {
      start: { id: 'start', title: 'Start', type: 'form', fields: { field1: { type: 'text' } } },
    },
    config: { store: { type: 'memory' } },
  };

  beforeEach(() => {
    // Clear the cache before each test
    WizardEngine.validatedJourneys.clear();
  });

  it('should use cached journey when caching is enabled and same slug is used', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const engine1 = new WizardEngine(journeyConfig, 'cache-test');
    const engine2 = new WizardEngine(journeyConfig, 'cache-test');

    // Both should use the same cached journey
    expect(engine1.journey).toBe(engine2.journey);

    process.env.NODE_ENV = originalEnv;
  });

  it('should not cache when NODE_ENV is test', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const engine1 = new WizardEngine(journeyConfig, 'no-cache-test');
    const engine2 = new WizardEngine(journeyConfig, 'no-cache-test');

    // Should not use cache in test mode
    expect(engine1.journey).not.toBe(engine2.journey);
    expect(engine1.journey).toEqual(engine2.journey);

    process.env.NODE_ENV = originalEnv;
  });

  it('should throw error with detailed message when journey validation fails', () => {
    const invalidConfig = {
      meta: { name: 'Invalid Journey' },
      steps: {},
    };

    expect(() => {
      new WizardEngine(invalidConfig, 'invalid-test');
    }).toThrow(/Invalid journey configuration/);
  });

  it('should include sourcePath in error message when provided', () => {
    const invalidConfig = {
      meta: { name: 'Invalid Journey' },
      steps: {},
    };

    expect(() => {
      new WizardEngine(invalidConfig, 'invalid-test', '/path/to/journey.ts');
    }).toThrow(/in file \/path\/to\/journey\.ts/);
  });
});

describe('WizardEngine - setStore error handling', () => {
  it('should throw error when store type is invalid', () => {
    const journeyConfig = {
      meta: { name: 'Test Journey', description: 'Test store', version: '1.0.0' },
      steps: {
        start: { id: 'start', title: 'Start', type: 'form', fields: {} },
      },
      config: { store: { type: 'invalid-store-type' } },
    };

    // The journey schema validation catches invalid store types before setStore is called
    expect(() => {
      new WizardEngine(journeyConfig, 'invalid-store-test');
    }).toThrow(/Invalid option: expected one of "session"\|"database"\|"redis"\|"memory"\|"ccd"/);
  });
});

describe('WizardEngine - resolveNext edge cases', () => {
  const journeyConfig = {
    meta: { name: 'Resolve Next Test', description: 'Test journey', version: '1.0.0' },
    steps: {
      start: {
        id: 'start',
        title: 'Start',
        type: 'form',
        fields: { field1: { type: 'text' } },
        next: 'conditional',
      },
      conditional: {
        id: 'conditional',
        title: 'Conditional',
        type: 'form',
        fields: { choice: { type: 'text' } },
        next: {
          when: (stepData: Record<string, unknown>) => (stepData.choice as string) === 'yes',
          goto: 'yesStep',
          else: 'noStep',
        },
      },
      yesStep: { id: 'yesStep', title: 'Yes', type: 'confirmation' },
      noStep: { id: 'noStep', title: 'No', type: 'confirmation' },
    },
    config: { store: { type: 'memory' } },
  };

  const engine = new WizardEngine(journeyConfig, 'resolve-next-test');

  it('should return step id when next is undefined', () => {
    // Create a step config without next property
    const stepWithoutNext: StepConfig = {
      id: 'noNext',
      title: 'No Next',
      type: 'confirmation',
    };
    expect(engine['resolveNext'](stepWithoutNext, {})).toBe('noNext');
  });

  it('should return else or step id when stepData is missing', () => {
    const conditionalStep = engine['journey'].steps.conditional;
    expect(engine['resolveNext'](conditionalStep, {})).toBe('noStep');
  });

  it('should handle error in when function and return else', () => {
    const conditionalStep = engine['journey'].steps.conditional;
    const stepWithError = {
      ...conditionalStep,
      next: {
        when: () => {
          throw new Error('Test error');
        },
        goto: 'yesStep',
        else: 'noStep',
      },
    };
    expect(engine['resolveNext'](stepWithError, { conditional: { choice: 'yes' } })).toBe('noStep');
  });
});

describe('WizardEngine - validateStepIdForRedirect', () => {
  const journeyConfig = {
    meta: { name: 'Validation Test', description: 'Test validation', version: '1.0.0' },
    steps: {
      validStep: {
        id: 'validStep',
        title: 'Valid',
        type: 'form',
        fields: {},
        next: 'step-with-dash',
      },
      'step-with-dash': {
        id: 'step-with-dash',
        title: 'With Dash',
        type: 'form',
        fields: {},
      },
    },
    config: { store: { type: 'memory' } },
  };

  const engine = new WizardEngine(journeyConfig, 'validation-test');

  it('should return null for empty stepId', () => {
    expect(engine['validateStepIdForRedirect']('')).toBeNull();
  });

  it('should return null for non-string stepId', () => {
    expect(engine['validateStepIdForRedirect'](null as unknown as string)).toBeNull();
    expect(engine['validateStepIdForRedirect'](undefined as unknown as string)).toBeNull();
  });

  it('should return null for stepId that does not exist', () => {
    expect(engine['validateStepIdForRedirect']('nonexistent')).toBeNull();
  });

  it('should return null for stepId with unsafe characters', () => {
    expect(engine['validateStepIdForRedirect']('step<script>')).toBeNull();
    expect(engine['validateStepIdForRedirect']('step/../')).toBeNull();
  });

  it('should return sanitized stepId for valid step', () => {
    expect(engine['validateStepIdForRedirect']('validStep')).toBe('validStep');
    expect(engine['validateStepIdForRedirect']('step-with-dash')).toBe('step-with-dash');
  });
});

describe('WizardEngine - resolveTemplatePath edge cases', () => {
  const journeyConfig = {
    meta: { name: 'Template Test', description: 'Test templates', version: '1.0.0' },
    steps: {
      withTemplate: {
        id: 'withTemplate',
        title: 'With Template',
        type: 'form',
        fields: {},
        template: 'custom/template',
        next: 'withoutTemplate',
      },
      withoutTemplate: {
        id: 'withoutTemplate',
        title: 'Without Template',
        type: 'form',
        fields: {},
        next: 'nonexistent',
      },
      nonexistent: {
        id: 'nonexistent',
        title: 'Nonexistent',
        type: 'form',
        fields: {},
        next: 'formStep',
      },
      formStep: {
        id: 'formStep',
        title: 'Form',
        type: 'form',
        fields: { field1: { type: 'text' } },
        next: 'emptyStep',
      },
      emptyStep: {
        id: 'emptyStep',
        title: 'Empty',
        type: 'form',
        fields: {},
        next: 'summaryStep',
      },
      summaryStep: {
        id: 'summaryStep',
        title: 'Summary',
        type: 'summary',
        fields: {},
        next: 'confirmationStep',
      },
      confirmationStep: {
        id: 'confirmationStep',
        title: 'Confirmation',
        type: 'confirmation',
        fields: {},
      },
    },
    config: { store: { type: 'memory' } },
  };

  const engine = new WizardEngine(journeyConfig, 'template-test');

  it('should return cached template path when available', async () => {
    const templatePath1 = await engine['resolveTemplatePath']('withTemplate');
    const templatePath2 = await engine['resolveTemplatePath']('withTemplate');
    expect(templatePath1).toBe(templatePath2);
    expect(templatePath1).toBe('custom/template');
  });

  it('should return stepId when step does not exist', async () => {
    const templatePath = await engine['resolveTemplatePath']('nonexistentStep');
    expect(templatePath).toBe('nonexistentStep');
  });

  it('should return explicit template when provided', async () => {
    const templatePath = await engine['resolveTemplatePath']('withTemplate');
    expect(templatePath).toBe('custom/template');
  });

  it('should return default template for summary type', async () => {
    const templatePath = await engine['resolveTemplatePath']('summaryStep');
    expect(templatePath).toBe('_defaults/summary');
  });

  it('should return form template for step with fields', async () => {
    const templatePath = await engine['resolveTemplatePath']('formStep');
    expect(templatePath).toBe('_defaults/form');
  });

  it('should return stepId as fallback for empty step', async () => {
    const templatePath = await engine['resolveTemplatePath']('emptyStep');
    expect(templatePath).toBe('emptyStep');
  });
});

describe('WizardEngine - buildSummaryCards', () => {
  const journeyConfig = {
    meta: { name: 'Summary Cards Test', description: 'Test summary cards', version: '1.0.0' },
    steps: {
      step1: {
        id: 'step1',
        title: 'Step 1',
        type: 'form',
        fields: {
          name: { type: 'text', label: 'Name' },
          dateOfBirth: { type: 'date', label: 'Date of Birth' },
          address: { type: 'address', label: 'Address' },
          choice: {
            type: 'radios',
            label: 'Choice',
            items: [
              { value: 'yes', text: 'Yes' },
              { value: 'no', text: 'No' },
            ],
          },
        },
        next: 'step2',
      },
      step2: {
        id: 'step2',
        title: 'Step 2',
        type: 'form',
        fields: {
          field2: { type: 'text', label: 'Field 2' },
        },
        next: 'summary',
      },
      summary: {
        id: 'summary',
        title: 'Summary',
        type: 'summary',
        fields: {},
        next: 'confirmation',
      },
      confirmation: {
        id: 'confirmation',
        title: 'Confirmation',
        type: 'confirmation',
        fields: {},
      },
    },
    config: { store: { type: 'memory' } },
  };

  const engine = new WizardEngine(journeyConfig, 'summary-cards-test');
  const t = makeNoopT();

  it('should build summary cards with grouped rows', () => {
    const allData = {
      step1: {
        name: 'John Doe',
        dateOfBirth: { day: '01', month: '01', year: '1990' },
        address: {
          addressLine1: '123 Main St',
          town: 'London',
          postcode: 'SW1A 1AA',
        },
        choice: 'yes',
      },
      step2: {
        field2: 'Value 2',
      },
    };

    const cards = engine['buildSummaryCards'](allData, t, 'en');

    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].card.title.text).toBe('Step 1');
    expect(cards[0].rows.length).toBeGreaterThan(0);
  });

  it('should skip steps with no data', () => {
    const allData = {
      step1: { name: 'John' },
    };

    const cards = engine['buildSummaryCards'](allData, t, 'en');
    const step2Card = cards.find((card: { card: { title: { text: string } } }) => card.card.title.text === 'Step 2');
    expect(step2Card).toBeUndefined();
  });

  it('should skip summary and confirmation step types', () => {
    const allData = {
      summary: {},
    };

    const cards = engine['buildSummaryCards'](allData, t, 'en');
    const summaryCard = cards.find((card: { card: { title: { text: string } } }) => card.card.title.text === 'Summary');
    expect(summaryCard).toBeUndefined();
  });

  it('should handle steps with empty fields', () => {
    const allData = {
      step1: {},
    };

    const cards = engine['buildSummaryCards'](allData, t, 'en');
    const step1Card = cards.find((card: { card: { title: { text: string } } }) => card.card.title.text === 'Step 1');
    expect(step1Card).toBeUndefined();
  });
});

describe('WizardEngine - findPreviousStep', () => {
  const journeyConfig = {
    meta: { name: 'Previous Step Test', description: 'Test previous step', version: '1.0.0' },
    steps: {
      start: {
        id: 'start',
        title: 'Start',
        type: 'form',
        fields: {},
        next: 'middle',
      },
      middle: {
        id: 'middle',
        title: 'Middle',
        type: 'form',
        fields: { choice: { type: 'text' } },
        next: {
          when: (stepData: Record<string, unknown>) => (stepData.choice as string) === 'yes',
          goto: 'end',
          else: 'other',
        },
      },
      other: { id: 'other', title: 'Other', type: 'confirmation' },
      end: { id: 'end', title: 'End', type: 'confirmation' },
    },
    config: { store: { type: 'memory' } },
  };

  const engine = new WizardEngine(journeyConfig, 'previous-step-test');

  it('should find previous step with direct next', () => {
    const previous = engine['findPreviousStep']('middle', {});
    expect(previous).toBe('start');
  });

  it('should find previous step with conditional next (true branch)', () => {
    const previous = engine['findPreviousStep']('end', {
      middle: { choice: 'yes' },
    });
    expect(previous).toBe('middle');
  });

  it('should find previous step with conditional next (false branch)', () => {
    const previous = engine['findPreviousStep']('other', {
      middle: { choice: 'no' },
    });
    expect(previous).toBe('middle');
  });

  it('should return null when no previous step found', () => {
    const previous = engine['findPreviousStep']('start', {});
    expect(previous).toBeNull();
  });

  it('should handle step with no next property', () => {
    // Since journey validation requires all steps to be reachable, we can't have
    // a step with no next property in a valid journey. However, findPreviousStep
    // logic skips steps without next properties when searching for previous steps.
    // This test verifies that findPreviousStep correctly finds previous steps
    // when they exist, even when some steps in the journey don't have next properties.
    const journeyWithNoNext = {
      meta: { name: 'No Next Test', description: 'Test no next', version: '1.0.0' },
      steps: {
        start: { id: 'start', title: 'Start', type: 'form', fields: {}, next: 'end' },
        end: { id: 'end', title: 'End', type: 'confirmation' },
      },
      config: { store: { type: 'memory' } },
    };
    const engineNoNext = new WizardEngine(journeyWithNoNext, 'no-next-test');
    // 'end' has 'start' as its previous step
    const previous = engineNoNext['findPreviousStep']('end', {});
    expect(previous).toBe('start');
  });
});
