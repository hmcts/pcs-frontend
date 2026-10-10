import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { createFormStep, getFormData } from '../../../modules/steps';
import { flowConfig } from '../flow.config';
import { getApplicationId, setApplicationId } from '../session';

import { BuiltFormContent } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { RELEASE_1B_ENABLED } from '@utils/respondToClaimFlags';

const isRelease1bEnabled = (req: Request): Promise<boolean> => getLaunchDarklyFlag(req, RELEASE_1B_ENABLED, false);

function removeSuspendOption(formContent: BuiltFormContent): void {
  const typeOfApplicationField = formContent.fields.find(field => field.name === 'typeOfApplication');
  const radioComponent = typeOfApplicationField?.component as { items?: { value?: string }[] } | undefined;
  if (radioComponent?.items) {
    radioComponent.items = radioComponent.items.filter(item => item.value !== 'SUSPEND');
  }
}

export const step: StepDefinition = createFormStep({
  stepName: 'choose-an-application',
  journeyFolder: 'makeAnApplication',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/chooseAnApplication.njk`,
  fields: [
    {
      name: 'typeOfApplication',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'SUSPEND',
          translationKey: 'options.suspend.label',
          hint: 'options.suspend.hint',
        },
        {
          value: 'ADJOURN',
          translationKey: 'options.adjourn.label',
          hint: 'options.adjourn.hint',
        },
        {
          value: 'SET_ASIDE',
          translationKey: 'options.setAside.label',
          hint: 'options.setAside.hint',
        },
        { value: 'SOMETHING_ELSE', translationKey: 'options.somethingElse.label', hint: 'options.somethingElse.hint' },
      ],
    },
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    noticeText: 'noticeText',
    noticeTextByPost: 'noticeTextByPost',
    readTheGuidance: 'noticeTextList.readTheGuidance',
    fillInTheForm: 'noticeTextList.fillInTheForm',
    findYourLocalCourt: 'noticeTextList.findYourLocalCourt',
    sendTheFormToTheCourt: 'noticeTextList.sendTheFormToTheCourt',
  },
  beforeGet: async (req: Request) => {
    if (!getApplicationId(req)) {
      setApplicationId(req, uuidv4());
    }
  },
  extendGetContent: async (req: Request, formContent: BuiltFormContent) => {
    if (!(await isRelease1bEnabled(req))) {
      removeSuspendOption(formContent);
    }

    return {};
  },
  beforeRedirect: async (req: Request) => {
    if (getFormData(req, 'choose-an-application').typeOfApplication === 'SUSPEND' && !(await isRelease1bEnabled(req))) {
      throw new Error('Suspend general applications are not enabled');
    }
  },
});
