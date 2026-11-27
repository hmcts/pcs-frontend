import { dateField, longTextField, textField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';
import { emailValidator } from '../formValues';

import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { NOTICE_METHODS, NOTICE_METHOD_DETAILS, type NoticeMethod } from '@services/citizenPossessionClaim.interface';

function detailsField(method: NoticeMethod, name: string): FormFieldConfig {
  const common = { errorMessage: `errors.${name}` };
  if (method === 'EMAIL') {
    return textField(name, {
      ...common,
      maxLength: FIELD_LIMITS.emailedTo,
      attributes: { type: 'email', spellcheck: false },
      validator: emailValidator('errors.emailedToInvalid'),
    });
  }
  if (method === 'PERSONALLY_HANDED') {
    return textField(name, { ...common, maxLength: FIELD_LIMITS.handedToName });
  }
  return longTextField(name, {
    ...common,
    required: true,
    maxLength: method === 'OTHER_ELECTRONIC' ? FIELD_LIMITS.otherElectronicDetails : FIELD_LIMITS.otherMethodDetails,
  });
}

function methodSubFields(method: NoticeMethod): Record<string, FormFieldConfig> {
  const { date, details } = NOTICE_METHOD_DETAILS[method];
  return {
    ...(details ? { [details]: detailsField(method, details) } : {}),
    [date]: dateField(date),
  };
}

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'notice-method',
  stepDir: __dirname,
  fields: [
    {
      name: 'noticeMethods',
      type: 'checkbox',
      required: true,
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: { label: 'question', hint: 'hint' },
      options: NOTICE_METHODS.map(method => ({
        value: method,
        translationKey: `options.${method}`,
        subFields: methodSubFields(method),
      })),
    },
  ],
});
