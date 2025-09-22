import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'correspondenceAddress',
  type: 'form',
  title: 'Your correspondence address',
  description:
    'Your correspondence address is your postal address. Treetops Housing were asked to provide this so we could send you the claim documents by post.',
  fields: {
    isCorrespondenceAddress: {
      type: 'radios',
      classes: 'govuk-radios--inline',
      fieldset: {
        legend: {
          text: 'Is this your correspondence address?',
          classes: 'govuk-fieldset__legend--m',
        },
      },
      items: [
        {
          value: 'yes',
          text: 'Yes',
        },
        {
          value: 'no',
          text: 'No',
          conditional: {
            html: '',
          },
        },
      ],
      validate: {
        required: true,
      },
    },
    correspondenceAddress: {
      type: 'address',
      label: {
        text: 'Enter correspondence address',
      },
      lookupText: "What's your correspondence address?",
      hint: {
        text: 'This is the address we will send the claim documents to.',
      },
      validate: {
        required: true,
      },
    },
    continueButton: {
      type: 'button',
      text: 'Save and continue',
      classes: 'govuk-button',
      attributes: {
        type: 'submit',
      },
    },
    saveForLaterButton: {
      type: 'button',
      text: 'Save for later',
      classes: 'govuk-button govuk-button--secondary',
      attributes: {
        type: 'submit',
        name: '_saveForLater',
        value: 'true',
      },
    },
  },
  next: 'summary',
};

export default step;
