import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page3',
  type: 'form',
  fields: {
    claimantType: {
      type: 'radios',
      fieldset: {
        legend: {
          text: 'claimantTypeLegend', // ⬅️ comes from locales
          isPageHeading: true,
          classes: 'govuk-fieldset__legend--l',
        },
      },
      options: [
        { value: 'individual', text: 'claimantTypeIndividual' }, // ⬅️ from locales
        { value: 'organisation', text: 'claimantTypeOrganisation' },
      ],
      validate: {
        required: true,
        customMessage: 'claimantTypeError', // ⬅️ from locales
      },
    },
    continueButton: {
      type: 'button',
      attributes: {
        type: 'submit',
      },
    },
  },
  next: {
    when: (stepData: Record<string, unknown>) => stepData['claimantType'] === 'individual',
    goto: 'page4-individual',
    else: 'page4-organisation',
  },
};

export default step;
