import { Logger } from '@hmcts/nodejs-logging';
import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { getFormData, setFormData } from '../../../app/controller/sessionHelper';
import { validateForm } from '../../../app/controller/validation';
import common from '../../../assets/locales/en/common.json';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { getAddressesByPostcode } from '../../../services/osPostcodeLookupService';

const logger = Logger.getLogger('steps/enter-address');

const stepName = 'enter-address';

const content = {
  ...common,
  backUrl: '/steps/user-journey/enter-user-details',
};

export const partialUkPostcodePattern = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9]?[A-Z]{0,2}$/i;

const postcodeRegex = new RegExp(partialUkPostcodePattern);

const fields: FormFieldConfig[] = [
  { name: 'addressLine1', type: 'text', required: true, errorMessage: 'Enter address line 1' },
  { name: 'addressLine2', type: 'text', required: false },
  { name: 'addressLine3', type: 'text', required: false },
  { name: 'town', type: 'text', required: true, errorMessage: 'Enter the town or city' },
  { name: 'county', type: 'text', required: false },
  {
    name: 'postcode',
    type: 'text',
    required: true,
    errorMessage: 'Enter the valid postcode',
    pattern: partialUkPostcodePattern.source,
  },
  { name: 'country', type: 'text', required: false, errorMessage: 'Enter the country' },
];

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-address',
  name: stepName,
  view: 'steps/userJourney/enterAddress.njk',
  stepDir: __dirname,
  generateContent: () => content,
  getController: createGetController('steps/userJourney/enterAddress.njk', stepName, content, req => {
    const savedData = getFormData(req, stepName);

    return {
      ...content,
      ...savedData,
      lookupPostcode: '',
      addressResults: null,
      selectedAddressIndex: null,
    };
  }),
  postController: {
    post: async (req: Request, res: Response) => {
      const { action, lookupPostcode, selectedAddressIndex } = req.body;
      logger.info(`[osPostcodeLookupService] Response data: ${JSON.stringify(req.body, null, 2)}`);

      if (action === 'find-address') {
        if (!lookupPostcode || !postcodeRegex.test(lookupPostcode.trim())) {
          return res.status(400).render('steps/userJourney/enterAddress.njk', {
            ...content,
            ...req.body,
            error: 'Enter a valid or partial UK postcode',
          });
        }

        try {
          const addressResults = await getAddressesByPostcode(lookupPostcode);

          if (addressResults.length === 0) {
            return res.status(404).render('steps/userJourney/enterAddress.njk', {
              ...content,
              ...req.body,
              error: 'No addresses found for that postcode',
            });
          }

          req.session.postcodeLookupResult = addressResults;
          return res.render('steps/userJourney/enterAddress.njk', {
            ...content,
            ...req.body,
            lookupPostcode,
            addressResults,
          });
        } catch {
          return res.status(500).render('steps/userJourney/enterAddress.njk', {
            ...content,
            ...req.body,
            lookupPostcode,
            error: 'There was a problem finding addresses. Please try again.',
          });
        }
      }

      if (action === 'select-address' && selectedAddressIndex !== undefined && req.session.postcodeLookupResult) {
        const index = parseInt(selectedAddressIndex, 10);
        const selected = req.session.postcodeLookupResult[index];

        if (selected) {
          setFormData(req, stepName, {
            selectedAddressIndex,
            addressLine1: selected.addressLine1,
            addressLine2: selected.addressLine2,
            addressLine3: selected.addressLine3,
            town: selected.town,
            county: selected.county,
            postcode: selected.postcode,
            country: selected.country,
          });

          return res.render('steps/userJourney/enterAddress.njk', {
            ...content,
            lookupPostcode,
            addressResults: req.session.postcodeLookupResult,
            selectedAddressIndex,
            addressLine1: selected.addressLine1,
            addressLine2: selected.addressLine2,
            addressLine3: selected.addressLine3,
            town: selected.town,
            county: selected.county,
            postcode: selected.postcode,
            country: selected.country,
          });
        }
      }

      if (action === 'submit-form') {
        if (req.body.postcode) {
          req.body.postcode = req.body.postcode
            .toUpperCase()
            .replace(/\s+/g, '')
            .replace(/(.{3})$/, ' $1')
            .trim();
        }
        const errors = validateForm(req, fields);

        if (Object.keys(errors).length > 0) {
          return res.status(400).render('steps/userJourney/enterAddress.njk', {
            ...content,
            ...req.body,
            error: Object.values(errors)[0],
          });
        }

        setFormData(req, stepName, req.body);
        const ccdCase = req.session.ccdCase;
        const user = req.session.user;

        if (ccdCase?.id && user?.accessToken) {
          const updatedCase = await ccdCaseService.updateCase(user.accessToken, {
            id: ccdCase.id,
            data: {
              ...ccdCase.data,
              propertyAddress: {
                AddressLine1: req.body.addressLine1,
                AddressLine2: req.body.addressLine2,
                AddressLine3: req.body.addressLine3,
                PostTown: req.body.town,
                County: req.body.county,
                PostCode: req.body.postcode,
                Country: req.body.country,
              },
            },
          });
          req.session.ccdCase = updatedCase;
        }

        res.redirect('/steps/user-journey/summary');
      }
    },
  },
};
