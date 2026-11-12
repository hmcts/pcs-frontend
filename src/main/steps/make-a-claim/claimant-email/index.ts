import type { Request } from 'express';

import { accountEmailOf, usableAccountEmailOf } from '../claimMapping';
import { textField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';
import { emailValidator } from '../formValues';

import { getTranslationFunction } from '@modules/steps';
import type { BuiltFormContent } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'claimant-email',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('useAccountEmail', {
      subFields: {
        no: {
          emailAddress: textField('emailAddress', {
            maxLength: FIELD_LIMITS.emailAddress,
            errorMessage: 'errors.emailAddress',
            attributes: { autocomplete: 'email', spellcheck: false, type: 'email' },
            validator: emailValidator('errors.emailAddressInvalid'),
          }),
        },
      },
    }),
  ],
  extendGetContent: (req: Request, formContent: BuiltFormContent) => {
    if (!accountEmailOf(req) || usableAccountEmailOf(req)) {
      return { accountEmail: accountEmailOf(req) ?? '' };
    }
    const t = getTranslationFunction(req);
    const question = formContent.fields?.find(field => field.name === 'useAccountEmail')?.component as
      { fieldset?: { legend?: { text?: string } }; items?: { value?: string; text?: string }[] } | undefined;
    if (question?.items) {
      question.items = question.items
        .filter(item => item.value === 'no')
        .map(item => ({ ...item, text: t('accountEmailTooLong.option') }));
    }
    if (question?.fieldset?.legend) {
      question.fieldset.legend.text = t('accountEmailTooLong.question');
    }
    return {
      accountEmail: accountEmailOf(req),
      inset: t('accountEmailTooLong.explanation', { limit: FIELD_LIMITS.emailAddress }),
    };
  },
});
