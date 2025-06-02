import { createGetController, validateAndStoreForm } from 'app/controller/controllerFactory';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import common from '../../../assets/locales/en/common.json';
import type { Request, Response } from 'express';
import { ccdCaseService } from 'services/ccdCaseService';
import { validateForm } from 'app/controller/validation';
import { setFormData, getFormData } from 'app/controller/sessionHelper';

const stepName = 'enter-user-details';

const content = { ...common };

const fields: FormFieldConfig[] = [
  { name: 'applicantForename', type: 'text', required: true, errorMessage: 'Enter your first name' },
  { name: 'applicantSurname', type: 'text', required: true, errorMessage: 'Enter your last name' }
];

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-user-details',
  name: stepName,
  view: 'steps/userJourney/enterUserDetails.njk',
  stepDir: __dirname,
  generateContent: () => content,
  getController: createGetController(
    'steps/userJourney/enterUserDetails.njk',
    stepName,
    content,
    req => {
      const savedData = getFormData(req, stepName);
      return {
        ...content,
        ...savedData,
      };
    }
  ),
//  postController: validateAndStoreForm(stepName, fields, '/steps/user-journey/enter-address', content)
postController: {
    post: async (req: Request, res: Response) => {
      const errors = validateForm(req, fields);

      if (Object.keys(errors).length > 0) {
        return res.status(400).render('steps/userJourney/enterAddress.njk', {
          ...content,
          ...req.body,
          error: Object.values(errors)[0],
        });
      }

      // Store form data in session
      setFormData(req, stepName, req.body);

      // CCD Case Update
      const ccdCase = req.session.ccdCase;
      const user = req.session.user;

      if (ccdCase?.id && user?.accessToken) {
        await ccdCaseService.updateCase(user,
          {
          id: ccdCase.id,
          data: {
            ...ccdCase.data,
             applicantAddress: {
              AddressLine1: req.body.addressLine1,
              AddressLine2: req.body.addressLine2,
              AddressLine3: req.body.addressLine3,
              PostTown: req.body.town,
              County: req.body.county,
              PostCode: req.body.postcode,
              Country: req.body.country
            }
          }
        });
      }

      res.redirect('/steps/user-journey/summary');
    }
  }
};
