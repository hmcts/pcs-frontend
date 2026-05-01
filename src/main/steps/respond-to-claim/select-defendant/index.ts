import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CcdDefendantItem } from '@services/ccdCase.interface';


export const step: StepDefinition = createFormStep({
  stepName: 'select-defendant',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  customTemplate: `${__dirname}/selectDefendant.njk`,
  beforeRedirect: async req => {
    const selectedDefendant = req.body?.selectDefendant as string | undefined; // the radio button

    if (!selectedDefendant) {
      return;
    }

    req.session.clientContext = {
      selectedPartyId: selectedDefendant
    };
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    contactUs: 'contactUs',
  },
  getInitialFormData: (req: Request) => {
    // figure out laters
    return {};
  },
  extendGetContent: async (req, formContent) => {
    const allDefendants: CcdDefendantItem[] | undefined = req.res?.locals?.validatedCase?.allDefendants;
    
   const radio = formContent.fields.find(f => f.componentType === 'radios') as RadioItems | undefined;
     
    addRadioButtonForAllDefendants(allDefendants, radio);    

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

function addRadioButtonForAllDefendants(allDefendants: CcdDefendantItem[] | undefined, radio: RadioItems | undefined) {
      if (radio?.component) {
        allDefendants?.forEach(defendant => {
        radio.component.items.push({
          value: defendant.id,
          text: defendant.value.firstName + " " + defendant.value.lastName
        });          
        })          
    }   
}

type RadioItems = {
  component: {
    items: {
      text: string;
      value: string;
    }[];
  };
};