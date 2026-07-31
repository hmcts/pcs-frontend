import { Request } from 'express';

import { RadioItems } from '../../../utils/fieldComponentTypes.interface';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CcdCollectionItem, CcdDefendantParty } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'select-defendant',
  stepDir: __dirname,
  customTemplate: `${__dirname}/selectDefendant.njk`,
  beforeRedirect: async req => {
    const selectedDefendant = req.body?.selectDefendant as string | undefined;

    if (!selectedDefendant) {
      return;
    }

    req.session.clientContext = {
      selectedPartyId: selectedDefendant,
    };

    // getExistingDraftData as we need this to determine if the selected defendant has a draft response
    // (see doesDefendantHaveDraftResponse)
    await getExistingDraftData(req);
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    detailsHeading: 'detailsHeading',
  },
  extendGetContent: async (req, formContent) => {
    const allLinkedDefendants: CcdCollectionItem<CcdDefendantParty>[] | undefined =
      req.res?.locals?.validatedCase?.allLinkedDefendants;

    const radio = formContent.fields.find(f => f.name === 'selectDefendant') as RadioItems | undefined;

    addRadioButtonForAllLinkedDefendants(allLinkedDefendants, radio, req.session.clientContext?.selectedPartyId);

    return formContent;
  },
  fields: [
    {
      name: 'selectDefendant',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-!-font-weight-bold govuk-!-font-size-24',
      translationKey: {
        label: 'selectDefendantLabel',
      },
      isPageHeading: true,
    },
  ],
});

async function getExistingDraftData(req: Request) : Promise<void> {
  const accessToken = req.session?.user?.accessToken || '';
  const caseId = req.res?.locals.validatedCase?.id || '';

  const data = await ccdCaseService.getExistingCaseData(accessToken, caseId, req.session?.clientContext);
  if (req.res?.locals) {
    req.res.locals.selectedDefendantResponses = data.case_details?.case_data?.possessionClaimResponse?.defendantResponses || {};
  }
}

function addRadioButtonForAllLinkedDefendants(
  allLinkedDefendants: CcdCollectionItem<CcdDefendantParty>[] | undefined,
  radio: RadioItems | undefined,
  partyId?: string
) {
  if (radio?.component) {
    allLinkedDefendants?.forEach(defendant => {
      radio.component.items.push({
        value: defendant.id,
        text: defendant.value.firstName + ' ' + defendant.value.lastName,
        checked: partyId !== null && defendant.id === partyId,
      });
    });
  }
}
