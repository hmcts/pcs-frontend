import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { renderWithErrors } from '../../../app/controller/errorHandling';
import { getAllFormData, getFormData, setFormData, validateForm } from '../../../app/controller/formHelpers';
import {
  type SupportedLang,
  type TranslationContent,
  createGenerateContent,
  getValidatedLanguage,
} from '../../../app/utils/i18n';
import { stepNavigation } from '../../../app/utils/stepFlow';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { getAddressesByPostcode } from '../../../services/osPostcodeLookupService';

const stepName = 'enter-address';
const generateContent = createGenerateContent(stepName, 'userJourney');

export const partialUkPostcodePattern = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9]?[A-Z]{0,2}$/i;
const postcodeRegex = new RegExp(partialUkPostcodePattern);

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = (t.errors as Record<string, string>) || {};
  return [
    { name: 'addressLine1', type: 'text', required: true, errorMessage: errors.addressLine1 || 'Enter address line 1' },
    { name: 'addressLine2', type: 'text', required: false },
    { name: 'addressLine3', type: 'text', required: false },
    { name: 'town', type: 'text', required: true, errorMessage: errors.town || 'Enter the town or city' },
    { name: 'county', type: 'text', required: false },
    {
      name: 'postcode',
      type: 'text',
      required: true,
      errorMessage: errors.postcode || 'Enter the valid postcode',
      pattern: partialUkPostcodePattern.source,
    },
    { name: 'country', type: 'text', required: false },
  ];
};

export const step: StepDefinition = {
  url: '/steps/user-journey/enter-address',
  name: stepName,
  view: 'steps/userJourney/enterAddress.njk',
  stepDir: __dirname,
  generateContent,
  getController: () => {
    return createGetController('steps/userJourney/enterAddress.njk', stepName, generateContent, (req, _content) => {
      const savedData = getFormData(req, stepName);
      const lookupPostcode = req.session.lookupPostcode || '';
      const addressResults = req.session.postcodeLookupResult || null;
      const lookupError = req.session.lookupError || undefined;

      delete req.session.lookupPostcode;
      delete req.session.lookupError;

      return {
        ...savedData,
        lookupPostcode,
        addressResults,
        lookupError,
        selectedAddressIndex: savedData?.selectedAddressIndex || null,
      };
    });
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const { action, lookupPostcode, selectedAddressIndex } = req.body;
      const lang: SupportedLang = getValidatedLanguage(req);
      const content = generateContent(lang);

      const enterAddressPath = stepNavigation.getStepUrl(stepName);

      // 🔹 Handle Find Address
      if (action === 'find-address') {
        if (!lookupPostcode || !postcodeRegex.test(lookupPostcode.trim())) {
          req.session.lookupPostcode = lookupPostcode;
          const errors = (content.errors as Record<string, string>) || {};
          req.session.lookupError = {
            field: 'lookupPostcode',
            text: errors.invalidPostcode || 'Enter a valid or partial UK postcode',
          };
          return res.redirect(303, `${enterAddressPath}?lookup=1`);
        }

        try {
          const addressResults = await getAddressesByPostcode(lookupPostcode);

          if (addressResults.length === 0) {
            req.session.lookupPostcode = lookupPostcode;
            const errors = (content.errors as Record<string, string>) || {};
            req.session.lookupError = {
              field: 'lookupPostcode',
              text: errors.noAddressesFound || 'No addresses found for that postcode',
            };

            return res.redirect(303, `${enterAddressPath}?lookup=1`);
          }

          req.session.lookupPostcode = lookupPostcode;
          req.session.postcodeLookupResult = addressResults;
          return res.redirect(303, `${enterAddressPath}?lookup=1`);
        } catch {
          req.session.lookupPostcode = lookupPostcode;
          const errors = (content.errors as Record<string, string>) || {};
          req.session.lookupError = {
            field: 'lookupPostcode',
            text: errors.addressLookupFailed || 'There was a problem finding addresses. Please try again.',
          };
          return res.redirect(303, `${enterAddressPath}?lookup=1`);
        }
      }

      // 🔹 Handle Selecting an Address
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
        }

        return res.redirect(303, enterAddressPath);
      }

      // 🔹 Handle Final Submission
      if (action === 'submit-form') {
        if (req.body.postcode) {
          req.body.postcode = req.body.postcode
            .toUpperCase()
            .replace(/\s+/g, '')
            .replace(/(.{3})$/, ' $1')
            .trim();
        }

        const fields = getFields(content);
        const errors = validateForm(req, fields, undefined, getAllFormData(req));

        if (Object.keys(errors).length > 0) {
          return renderWithErrors(req, res, 'steps/userJourney/enterAddress.njk', errors, {
            ...content,
            addressResults: req.session.postcodeLookupResult || null,
            backUrl: '/steps/user-journey/enter-user-details',
          });
        }

        setFormData(req, stepName, req.body);
        const ccdCase = req.session.ccdCase;
        const user = req.session.user;

        if (ccdCase?.id && user?.accessToken) {
          req.session.ccdCase = await ccdCaseService.updateCase(user.accessToken, {
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
        }

        const redirectPath = stepNavigation.getNextStepUrl(req, stepName, req.body);

        if (!redirectPath) {
          return res.status(500).send('Unable to determine next step');
        }

        return res.redirect(303, redirectPath);
      }
      return res.redirect(303, enterAddressPath);
    },
  },
};
