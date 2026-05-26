import type { Request } from 'express';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-against-whom',
  stepDir: __dirname,
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
    const checkedIds: (string | undefined)[] = submitted
      ? Array.isArray(submitted)
        ? submitted
        : [submitted]
      : alreadySaved.map(p => p.id);
    const defendants = (data?.allDefendants ?? []).filter(
      p => p.id !== data?.possessionClaimResponse?.currentDefendantPartyId
    );
    const orderedParties = [...(data?.allClaimants ?? []), ...defendants].filter(p => p.id);

    const checkboxItems = orderedParties
      .filter(p => p.value?.orgName || p.value?.firstName || p.value?.lastName)
      .map(p => {
        const displayName = [p.value?.orgName, p.value?.firstName, p.value?.lastName].join(' ').trim();
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

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.counterClaim = response.defendantResponses.counterClaim ?? {};

    if (counterClaimAgainst.length > 0) {
      response.defendantResponses.counterClaim.counterClaimAgainst = counterClaimAgainst;
    } else {
      delete response.defendantResponses.counterClaim.counterClaimAgainst;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
