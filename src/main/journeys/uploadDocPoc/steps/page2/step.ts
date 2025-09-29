import { StepDraft } from '../../../../modules/journey/engine/schema';

const step: StepDraft = {
  id: 'page2',
  title: 'Upload Document',
  type: 'form',
  fields: {
    caseReference: {
      type: 'text',
      label: {
        text: 'Case Reference',
        classes: 'govuk-label--m',
      },
      value: 'TEST-CASE-12345', // hardcoded case ref
      attributes: {
        readonly: true,
      },
    },
    upload: {
      type: 'file',
      label: {
        text: 'Choose a file to upload',
        classes: 'govuk-label--m',
      },
      hint: {
        text: 'Select a document to upload to this case',
      },
      validate: {
        required: true,
        customMessage: 'Please select a file to upload',
      },
    },
    continueButton: {
      type: 'button',
      text: 'Upload Document',
      attributes: {
        type: 'submit',
      },
    },
  },
};

export default step;
