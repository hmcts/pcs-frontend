import { RadioItems } from '../../../utils/fieldComponentTypes.interface';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CcdCollectionItem, CcdDefendantParty } from '@services/ccdCase.interface';

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
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    contactUs: 'contactUs',
    detailsHeading: 'detailsHeading',
  },
  extendGetContent: async (req, formContent) => {
    const allLinkedDefendants: CcdCollectionItem<CcdDefendantParty>[] | undefined = req.res?.locals?.validatedCase?.allLinkedDefendants;

    const radio = formContent.fields.find(f => f.componentType === 'radios') as RadioItems | undefined;

    addRadioButtonForAllLinkedDefendants(allLinkedDefendants, radio);

    return {
      ...formContent,
    };
  },
  fields: [
    {
      name: 'selectDefendant',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'selectDefendantLabel',
      },
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l govuk-!-margin-bottom-6',
      options: [],
    },
  ],
});

function addRadioButtonForAllLinkedDefendants(
  allLinkedDefendants: CcdCollectionItem<CcdDefendantParty>[] | undefined,
  radio: RadioItems | undefined
) {
  if (radio?.component) {
    allLinkedDefendants?.forEach(defendant => {
      radio.component.items.push({
        value: defendant.id,
        text: defendant.value.firstName + ' ' + defendant.value.lastName,
      });
    });
  }
}
