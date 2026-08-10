import type { Request } from 'express';

import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { startPcq } from '@services/pcq/startPcq';

export const step: StepDefinition = createFormStep({
  stepName: 'reasonable-adjustments-triage',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/reasonableAdjustmentsTriage.njk`,
  // Declining support (reasonableAdjustmentsChoice=skip) hands the citizen to PCQ. The
  // "Continue to the questions" button launches Your Support instead and is wired up separately.
  beforeRedirect: async (req: Request) => {
    if (req.body?.reasonableAdjustmentsChoice !== 'skip') {
      return;
    }

    const redirectUrl = await startPcq(req);
    if (redirectUrl) {
      req.res?.redirect(303, redirectUrl); // postHandler short-circuits on res.headersSent
    }
    // A null URL means PCQ is unavailable or already answered — fall through to the normal next
    // step so an optional questionnaire can never block the citizen's response.
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    askingForReasonableAdjustmentHeading: 'askingForReasonableAdjustmentHeading',
    askingForReasonableAdjustmentParagraph1: 'askingForReasonableAdjustmentParagraph1',
    askingForReasonableAdjustmentParagraph2: 'askingForReasonableAdjustmentParagraph2',
    askingForReasonableAdjustmentParagraph3: 'askingForReasonableAdjustmentParagraph3',
    askingForReasonableAdjustmentParagraph4: 'askingForReasonableAdjustmentParagraph4',
    askingForSomethingElseHeading: 'askingForSomethingElseHeading',
    askingForSomethingElseParagraph1: 'askingForSomethingElseParagraph1',
    askingForSomethingElseParagraph2: 'askingForSomethingElseParagraph2',
    askingForSomethingElseParagraph3: 'askingForSomethingElseParagraph3',
    contactByEmailHeading: 'contactByEmailHeading',
    contactByEmailParagraph1Prefix: 'contactByEmailParagraph1Prefix',
    contactByEmailParagraph1LinkText: 'contactByEmailParagraph1LinkText',
    contactByEmailParagraph1Suffix: 'contactByEmailParagraph1Suffix',
    contactByEmailParagraph2: 'contactByEmailParagraph2',
    contactByPhoneHeading: 'contactByPhoneHeading',
    contactByPhoneParagraph1: 'contactByPhoneParagraph1',
    contactByPhoneParagraph2: 'contactByPhoneParagraph2',
    contactByPhoneParagraph3: 'contactByPhoneParagraph3',
    askingForReasonableAdjustmentListItem1: 'askingForReasonableAdjustmentListItem1',
    askingForReasonableAdjustmentListItem2: 'askingForReasonableAdjustmentListItem2',
    askingForReasonableAdjustmentListItem3: 'askingForReasonableAdjustmentListItem3',
    askingForReasonableAdjustmentListItem4: 'askingForReasonableAdjustmentListItem4',
    askingForSomethingElseListItem1: 'askingForSomethingElseListItem1',
    askingForSomethingElseListItem2: 'askingForSomethingElseListItem2',
    askingForSomethingElseListItem3: 'askingForSomethingElseListItem3',
    raQuestionsButton: 'raQuestionsButton',
    progressButton: 'progressButton',
  },
  fields: [],
});
