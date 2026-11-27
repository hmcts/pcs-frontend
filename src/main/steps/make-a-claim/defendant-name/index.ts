import { readClaim } from '../claimDraft';
import { defendantAddressAnswered, itemIndexFromQuery } from '../claimMapping';
import { textField, yesNoQuestion } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'defendant-name',
  stepDir: __dirname,
  fields: [
    yesNoQuestion('nameKnown', {
      subFields: {
        yes: {
          firstName: textField('firstName', {
            maxLength: FIELD_LIMITS.defendantFirstName,
            errorMessage: 'errors.firstName',
          }),
          lastName: textField('lastName', {
            maxLength: FIELD_LIMITS.defendantLastName,
            errorMessage: 'errors.lastName',
          }),
        },
      },
    }),
  ],
  extendGetContent: (req, formContent) => {
    if (itemIndexFromQuery(req) === 0) {
      return { next: '' };
    }
    const question = formContent.fields?.find(field => field.name === 'nameKnown')?.component as
      { hint?: unknown } | undefined;
    if (question) {
      delete question.hint;
    }
    const t = getTranslationFunction(req);
    return {
      next: t('nextDefendant'),
      pageTitle: t('nextPageTitle'),
      backUrl: getStepUrl('additional-defendants', flowConfig, req.res?.locals.validatedCase?.id),
    };
  },
  keepsOwnRedirectOnReturn: req =>
    !defendantAddressAnswered(readClaim(req).defendants?.[itemIndexFromQuery(req)]?.value),
  resolveRedirectAfterPost: async req => {
    const index = itemIndexFromQuery(req);
    const url = getStepUrl('defendant-address', flowConfig, req.res?.locals.validatedCase?.id);
    return index > 0 ? `${url}?index=${index}` : undefined;
  },
});
