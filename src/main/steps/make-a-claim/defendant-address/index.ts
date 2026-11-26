import type { Request } from 'express';

import { formatCcdAddress } from '../../utils/ccdAddress';
import { ADDRESS_TEMPLATE, addressContent, addressFields } from '../addressFields';
import { readClaim } from '../claimDraft';
import { itemIndexFromQuery, propertyAddressOf } from '../claimMapping';
import { radioQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { defendantDisplayName } from '../summary';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

function defendantNameForQuestion(req: Request): string {
  const defendant = readClaim(req).defendants?.[itemIndexFromQuery(req)]?.value;
  return defendant?.nameKnown === 'YES'
    ? defendantDisplayName(defendant, req)
    : getTranslationFunction(req)('theDefendant');
}

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'defendant-address',
  stepDir: __dirname,
  customTemplate: ADDRESS_TEMPLATE,
  fields: [
    radioQuestion('sameAsProperty', ['yes', 'no']),
    ...addressFields('defendant', formData => formData.sameAsProperty === 'no'),
  ],
  extendGetContent: (req, formContent) => ({
    ...addressContent(req, 'defendant', formContent, {
      enterPostcode: getTranslationFunction(req)('finder.label'),
      enterManually: getTranslationFunction(req)('finder.enterManually'),
    }),
    addressQuestion: 'sameAsProperty',
    defendantName: defendantNameForQuestion(req),
    propertyAddress: formatCcdAddress(propertyAddressOf(req)),
    ...(itemIndexFromQuery(req) > 0
      ? {
          backUrl: `${getStepUrl('defendant-name', flowConfig, req.res?.locals.validatedCase?.id)}?index=${itemIndexFromQuery(req)}`,
        }
      : {}),
  }),
  keepsOwnRedirectOnReturn: () => false,
  resolveRedirectAfterPost: async req =>
    itemIndexFromQuery(req) > 0
      ? getStepUrl('additional-defendants', flowConfig, req.res?.locals.validatedCase?.id)
      : undefined,
});
