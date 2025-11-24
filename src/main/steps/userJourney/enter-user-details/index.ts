import type { Request } from 'express';

import { createFormStep } from '../../../app/utils/formBuilder';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { ccdCaseService } from '../../../services/ccdCaseService';

export const step: StepDefinition = createFormStep({
  stepName: 'enter-user-details',
  journeyFolder: 'userJourney',
  stepDir: __dirname,
  fields: [
    {
      name: 'applicantForename',
      type: 'text',
      required: true,
      translationKey: {
        label: 'firstNameLabel', // Uses 'firstNameLabel' from enterUserDetails.json
      },
      attributes: {
        maxlength: 50,
      },
    },
    {
      name: 'applicantSurname',
      type: 'text',
      required: true,
      translationKey: {
        label: 'lastNameLabel', // Uses 'lastNameLabel' from enterUserDetails.json
      },
      attributes: {
        maxlength: 50,
      },
    },
  ],
  beforeRedirect: async (req: Request) => {
    const ccdCase = req.session.ccdCase;
    const user = req.session.user;

    if (ccdCase?.id) {
      req.session.ccdCase = await ccdCaseService.updateCase(user?.accessToken, {
        id: ccdCase.id,
        data: {
          ...ccdCase.data,
          applicantForename: req.body.applicantForename,
          applicantSurname: req.body.applicantSurname,
        },
      });
    } else {
      req.session.ccdCase = await ccdCaseService.createCase(user?.accessToken, {
        applicantForename: req.body.applicantForename,
        applicantSurname: req.body.applicantSurname,
      });
    }
  },
});
