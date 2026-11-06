import type { Request } from 'express';

import { formatCcdAddress } from '../../utils/ccdAddress';
import { ADDRESS_TEMPLATE, addressContent, addressFields } from '../addressFields';
import { readClaim } from '../claimDraft';
import { defendantIndexOf, propertyAddressOf } from '../claimMapping';
import { yesNoQuestion } from '../fieldBuilders';
import { flowConfig } from '../flow.config';
import { createMakeAClaimStep } from '../formStep';
import { defendantDisplayName } from '../summary';

import { getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

function defendantNameForQuestion(req: Request): string {
  const defendant = readClaim(req).defendants?.[defendantIndexOf(req)]?.value;
  return defendant?.nameKnown === 'YES'
    ? defendantDisplayName(defendant, req)
    : getTranslationFunction(req)('theDefendant');
}

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'defendant-address',
  stepDir: __dirname,
  customTemplate: ADDRESS_TEMPLATE,
  fields: [
    yesNoQuestion('sameAsProperty'),
    ...addressFields('defendant', formData => formData.sameAsProperty === 'no'),
  ],
  extendGetContent: req => ({
    ...addressContent(req, 'defendant'),
    addressQuestion: 'sameAsProperty',
    defendantName: defendantNameForQuestion(req),
    propertyAddress: formatCcdAddress(propertyAddressOf(req)),
  }),
  resolveRedirectAfterPost: async req =>
    defendantIndexOf(req) > 0
      ? getStepUrl('additional-defendants', flowConfig, req.res?.locals.validatedCase?.id)
      : undefined,
});
