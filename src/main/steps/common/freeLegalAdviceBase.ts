import { TranslationKeys } from '../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../interfaces/stepFormData.interface';
import { flowConfig } from '../respond-to-claim/flow.config';
import { createFormStep } from '@modules/steps';

export const mapToCcdEnum = (value?: string): string | undefined => {
  switch (value) {
    case 'yes':
      return 'YES';
    case 'no':
      return 'NO';
    case 'preferNotToSay':
      return 'PREFER_NOT_TO_SAY';
    default:
      return undefined;
  }
};

export const mapFromCcdEnum = (value?: string): string | undefined => {
  switch (value) {
    case 'YES':
      return 'yes';
    case 'NO':
      return 'no';
    case 'PREFER_NOT_TO_SAY':
      return 'preferNotToSay';
    default:
      return undefined;
  }
};

type FormBuilderConfig = Parameters<typeof createFormStep>[0];

export const createFreeLegalAdviceBase = (overrides: Partial<FormBuilderConfig>): StepDefinition => {
  return createFormStep({
    stepName: 'free-legal-advice',
    stepDir: __dirname,
    flowConfig,
    journeyFolder: 'respondToClaim',
    translationKeys:
      new Map<string, TranslationKeys>([
                       [ "citizen", {
                           pageTitle: 'pageTitle',
                           heading: 'heading',
                           caption: 'caption',
                           subHeading1: 'subHeading1',
                           paragraph1: 'paragraph1',
                           listItem1: 'listItem1',
                           listItem2: 'listItem2',
                           listItem3: 'listItem3',
                           paragraph2: 'paragraph2',
                           bullet1: 'bullet1',
                           bullet2: 'bullet2',
                           subHeading2: 'subHeading2',
                           paragraph3: 'paragraph3',
                           paragraph4: 'paragraph4',
                         }
                         ],
                         [ "professional", {
                           pageTitle: 'pageTitle',
                           heading: 'heading',
                           caption: 'caption',
                           subHeading1: 'subHeading1',
                           paragraph1: 'paragraph1',
                           paragraph2: 'paragraph2',
                           subHeading2: 'subHeading2',
                           paragraph3: 'paragraph3',
                           paragraph4: 'paragraph4',
                         }
                         ]
                     ]);,
    fields: [
      {
        name: 'hadLegalAdvice',
        type: 'radio',
        required: true,
        legendClasses: 'govuk-fieldset__legend--m',
        translationKey: { label: 'question' },
        options: [
          { value: 'yes', translationKey: 'options.yes' },
          { value: 'no', translationKey: 'options.no' },
          { divider: 'options.or' },
          { value: 'preferNotToSay', translationKey: 'options.preferNotToSay' },
        ],
      },
    ],
    ...overrides,
  });
};
