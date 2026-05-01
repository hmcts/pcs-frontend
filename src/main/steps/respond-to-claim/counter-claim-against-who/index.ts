import type { Request } from 'express';

import { getClaimantName } from '../../utils/getClaimantName';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdClaimParty, CcdCounterClaim, PossessionClaimResponse } from '@services/ccdCase.interface';

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
    const response = req.res?.locals?.validatedCase?.data?.possessionClaimResponse;
    const alreadySaved = response?.defendantResponses?.counterClaim?.counterClaimAgainst ?? [];
    const submitted = req.body?.counterClaimAgainst;
    const checkedIds: string[] = submitted
      ? Array.isArray(submitted)
        ? submitted
        : [submitted]
      : alreadySaved.map(p => p.id);
    const parties = (response?.claimParties ?? []).filter(p => p.id !== response?.currentDefendantPartyId);
    const claimant = parties.find(p => p.value?.orgName === claimantName);
    const orderedParties = claimant ? [claimant, ...parties.filter(p => p !== claimant)] : parties;

    const checkboxItems = orderedParties
      .map(p => {
        const displayName = [p.value?.orgName, p.value?.firstName, p.value?.lastName]
          .filter(w => w && w.toLowerCase() !== 'null')
          .join(' ')
          .trim();
        return { value: p.id, text: displayName, checked: checkedIds.includes(p.id) };
      })
      .filter(item => item.text);

    const [field] = formContent.fields;
    if (!field) {
      return {};
    }
    return { fields: [{ ...field, component: { ...field.component, items: checkboxItems } }] };
  },
  beforeRedirect: async req => {
    const raw = req.body?.counterClaimAgainst;
    const submittedIds: string[] = Array.isArray(raw) ? raw : [raw];
    const allParties = req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.claimParties ?? [];

    const counterClaimAgainst: CcdClaimParty[] = submittedIds
      .map(id => allParties.find(p => p.id === id))
      .filter(p => p !== undefined);

    const counterClaim: CcdCounterClaim = { counterClaimAgainst };
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
