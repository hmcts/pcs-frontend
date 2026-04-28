import type { Request } from 'express';

import { getClaimantName } from '../../utils/getClaimantName';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCounterClaim, PossessionClaimResponse } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-against-who',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterClaimAgainstWho.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  fields: [
    {
      name: 'counterClaimAgainst',
      type: 'checkbox',
      required: true,
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'heading',
        hint: 'checkboxHint',
      },
      errorMessage: 'errors.counterClaimAgainst.required',
    },
  ],
  extendGetContent: (req: Request, formContent) => {
    const claimantName = getClaimantName(req);
    const caseData = req.res?.locals?.validatedCase?.data;
    const saved = caseData?.possessionClaimResponse?.defendantResponses?.counterClaim?.counterClaimAgainst ?? [];

    const checkboxItems = [{ value: claimantName, text: claimantName, checked: saved.includes(claimantName) }];

    const [field] = formContent.fields;
    if (!field) {return {};}
    return { fields: [{ ...field, component: { ...field.component, items: checkboxItems } }] };
  },
  getInitialFormData: req => {
    const saved =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim
        ?.counterClaimAgainst;
    if (!saved?.length) {return {};}
    return { counterClaimAgainst: saved };
  },
  beforeRedirect: async req => {
    const raw = req.body?.counterClaimAgainst;

    const counterClaimAgainst: string[] = Array.isArray(raw) ? raw : [raw];
    const counterClaim: CcdCounterClaim = { counterClaimAgainst };
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
