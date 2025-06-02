import { createGetController } from 'app/controller/controllerFactory';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import common from '../../../assets/locales/en/common.json';
import type { Request, Response } from 'express';
import { ccdCaseService } from 'services/ccdCaseService';
import { validateForm } from 'app/controller/validation';
import { setFormData } from 'app/controller/sessionHelper';

const stepName = 'enter-address';

const content = {
  ...common,
  backUrl: '/steps/user-journey/enter-user-details',
};

const fields: FormFieldConfig[] = [
  { name: 'addressLine1', type: 'text', required: true, errorMessage: 'Enter address line 1' },
  { name: 'addressLine2', type: 'text', required: false },
  { name: 'addressLine3', type: 'text', required: false },
  { name: 'town', type: 'text', required: true, errorMessage: 'Enter the town or city' },
  { name: 'county', type: 'text', required: false },
  { name: 'postcode', type: 'text', required: true, errorMessage: 'Enter the postcode' },
  { name: 'country', type: 'text', required: true, errorMessage: 'Enter the country' },
];

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-address',
  name: stepName,
  view: 'steps/userJourney/enterAddress.njk',
  stepDir: __dirname,
  generateContent: () => content,
  getController: createGetController('steps/userJourney/enterAddress.njk', stepName, content),
   // postController: validateAndStoreForm(stepName, fields, '/steps/user-journey/summary', content),

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
