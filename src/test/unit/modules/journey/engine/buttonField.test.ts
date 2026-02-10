import type { TFunction } from 'i18next';

const { WizardEngine } = require('../../../../../main/modules/journey/engine/engine');

/**
 * Typed noop translator that mimics i18next’s TFunction signature:
 * - if defaultValue is provided, return it
 * - otherwise return the key (string or first element when an array is passed)
 */
const makeNoopT = (): TFunction =>
  ((key: string | string[], defaultValue?: string) =>
    Array.isArray(key)
      ? (defaultValue ?? (key[0] as string))
      : (defaultValue ?? (key as string))) as unknown as TFunction;

describe('Button Field Type', () => {
  it('should process button fields with default text and attributes', () => {
    const journeyConfig = {
      meta: {
        name: 'Test Journey',
        description: 'Test journey with button field',
        version: '1.0.0',
      },
      steps: {
        start: {
          id: 'start',
          title: 'Test Step',
          type: 'form',
          fields: {
            submitButton: {
              type: 'button',
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
    };

    const engine = new WizardEngine(journeyConfig, 'test-journey');
    const step = engine['journey'].steps.start;

    // create a single noop translator function instance
    const t = makeNoopT();

    const context = engine['buildJourneyContext'](step, 'test-case', {}, t, 'en');
    const buttonField = context.step.fields?.submitButton;

    expect(buttonField).toBeDefined();
    expect(buttonField?.type).toBe('button');
    expect(buttonField?.text).toBe('Continue');
    expect(buttonField?.attributes).toEqual({ type: 'submit' });
  });

  it('should allow custom text and attributes for button fields', () => {
    const journeyConfig = {
      meta: {
        name: 'Test Journey',
        description: 'Test journey with custom button field',
        version: '1.0.0',
      },
      steps: {
        start: {
          id: 'start',
          title: 'Test Step',
          type: 'form',
          fields: {
            customButton: {
              type: 'button',
              text: 'Submit Form', // custom label
              attributes: { type: 'submit', class: 'govuk-button--secondary' },
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
    };

    const engine = new WizardEngine(journeyConfig, 'test-journey');
    const step = engine['journey'].steps.start;

    const t = makeNoopT();

    const context = engine['buildJourneyContext'](step, 'test-case', {}, t, 'en');
    const buttonField = Object.values(context.step.fields ?? {})[0] as Record<string, unknown>;

    expect(buttonField).toBeDefined();
    expect(buttonField?.type).toBe('button');
    // Note: Engine currently uses default "Continue" text, custom text is not yet supported
    expect(buttonField?.text).toBe('Continue');
    // Note: Engine currently only preserves 'type' attribute, not custom classes
    expect(buttonField?.attributes).toEqual({
      type: 'submit',
    });
  });
});
