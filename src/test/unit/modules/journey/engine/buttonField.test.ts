const { WizardEngine } = require('../../../../../main/modules/journey/engine/engine');

jest.mock('../../../../../main/app/utils/loadTranslations', () => ({
  loadTranslations: () => ({}), // empty map => keys don't resolve => t() returns the key
}));

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

    // Test that the field is processed correctly
    const context = engine['buildJourneyContext'](step, 'test-case', {});
    const buttonField = context.step.fields?.submitButton;

    expect(buttonField).toBeDefined();
    expect(buttonField?.type).toBe('button');
    expect(buttonField?.text).toBe('buttons.continue');
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
              text: 'Submit Form',
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

    const context = engine['buildJourneyContext'](step, 'test-case', {});
    const buttonField = Object.values(context.step.fields ?? {})[0] as Record<string, unknown>;

    expect(buttonField).toBeDefined();
    expect(buttonField?.type).toBe('button');
    expect(buttonField?.text).toBe('Submit Form');
    expect(buttonField?.attributes).toEqual({
      type: 'submit',
      class: 'govuk-button--secondary',
    });
  });
});
