import { NOTICE_METHOD_DETAILS } from '../claimMapping';
import { dateField, longTextField, textField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { NOTICE_METHODS, type NoticeMethod } from '@services/citizenPossessionClaim.interface';

function detailsField(method: NoticeMethod, name: string): FormFieldConfig {
  const common = { errorMessage: `errors.${name}` };
  if (method === 'EMAIL') {
    return textField(name, { ...common, maxLength: 100, attributes: { type: 'email', spellcheck: false } });
  }
  if (method === 'PERSONALLY_HANDED') {
    return textField(name, { ...common, maxLength: 100 });
  }
  return longTextField(name, { ...common, required: true, maxLength: 300 });
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
