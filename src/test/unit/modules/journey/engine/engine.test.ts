import fs from 'fs';
import path from 'path';

import type { Request } from 'express';

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

const makeReq = () =>
  ({
    app: { locals: { launchDarklyClient: { variation: variationMock } } },
    session: { user: { uid: 'u123', name: 'Test' } },
  }) as unknown as Request;

// Minimal Express request stub for memoryStore tests that do not need LD data
const reqStub = {} as unknown as { session?: Record<string, unknown> };

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
    const noopT = (k: unknown) => (typeof k === 'string' ? k : String(k));
    const rows = engine['buildSummaryRows']({ start: { field1: 'abc' }, mid: { choice: 'y' } }, noopT, 'en');
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
      'en'
    );

    const dobItems = (ctx.step.fields?.dob as unknown as FieldConfig).items;
    expect(dobItems).toHaveLength(3);
    expect((ctx.step.fields?.submit as unknown as FieldConfig).text).toBe('buttons.continue');
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
    const noopT = (k: unknown) => (typeof k === 'string' ? k : String(k));
    const rows = engine['buildSummaryRows'](
      {
        start: { name: 'Alice' },
        details: { dob: { day: '01', month: '02', year: '2000' }, pets: ['Dog', 'Cat'] },
      },
      noopT,
      'en'
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const combinedTexts = rows.map((r: unknown) => (r as { value: { text: string } }).value.text).join(' ');
    expect(combinedTexts).toContain('1 February 2000');
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
    const noopT = (k: unknown) => (typeof k === 'string' ? k : String(k));
    const rows = engine['buildSummaryRows']({ start: { name: 'Alice' } }, noopT, 'en');
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
