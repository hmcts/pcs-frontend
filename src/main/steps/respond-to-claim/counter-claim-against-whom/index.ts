import type { Request } from 'express';

import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCounterClaim, PossessionClaimResponse } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'counter-claim-against-whom',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterClaimAgainstWhom.njk`,
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
    const data = req.res?.locals?.validatedCase?.data;
    const alreadySaved = data?.possessionClaimResponse?.defendantResponses?.counterClaim?.counterClaimAgainst ?? [];
    const submitted = req.body?.counterClaimAgainst;
    const checkedIds: string[] = submitted
      ? Array.isArray(submitted)
        ? submitted
        : [submitted]
      : alreadySaved.map(p => p.id);
    const defendants = (data?.allDefendants ?? []).filter(
      p => p.id !== data?.possessionClaimResponse?.currentDefendantPartyId
    );
    const orderedParties = [...(data?.allClaimants ?? []), ...defendants];

    const checkboxItems = orderedParties
      .filter(p => p.value?.orgName || p.value?.firstName || p.value?.lastName)
      .map(p => {
        const displayName = [p.value?.orgName, p.value?.firstName, p.value?.lastName]
          .join(' ')
          .trim();
        return { value: p.id, text: displayName, checked: checkedIds.includes(p.id) };
      });

    const [field] = formContent.fields;
    if (!field) {
      return {};
    }
    return { fields: [{ ...field, component: { ...field.component, items: checkboxItems } }] };
  },
  beforeRedirect: async req => {
    const raw = req.body?.counterClaimAgainst;
    const submittedIds: string[] = Array.isArray(raw) ? raw : [raw];
    const data = req.res?.locals?.validatedCase?.data;
    const allParties = [...(data?.allClaimants ?? []), ...(data?.allDefendants ?? [])];

    const counterClaimAgainst = submittedIds.flatMap(id => {
      const party = allParties.find(p => p.id === id);
      return party ? [party] : [];
    });

    const counterClaim: CcdCounterClaim = { counterClaimAgainst };
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
