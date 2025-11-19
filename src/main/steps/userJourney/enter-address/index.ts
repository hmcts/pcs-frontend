import type { Request, Response } from 'express';

import { createGetController } from '../../../app/controller/controllerFactory';
import { getFormData, setFormData } from '../../../app/controller/sessionHelper';
import { validateForm } from '../../../app/controller/validation';
import { createGenerateContent } from '../../../app/utils/createGenerateContent';
import { SupportedLang, getValidatedLanguage } from '../../../app/utils/getValidatedLanguage';
import type { TranslationContent } from '../../../app/utils/loadTranslations';
import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { getAddressesByPostcode } from '../../../services/osPostcodeLookupService';

const stepName = 'enter-address';
const generateContent = createGenerateContent(stepName, 'userJourney');

export const partialUkPostcodePattern = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9]?[A-Z]{0,2}$/i;
const postcodeRegex = new RegExp(partialUkPostcodePattern);

const getFields = (t: TranslationContent = {}): FormFieldConfig[] => {
  const errors = t.errors || {};
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
    return createGetController('steps/userJourney/enterAddress.njk', stepName, generateContent('en'), req => {
      const lang = getValidatedLanguage(req);
      const content = generateContent(lang);
      const savedData = getFormData(req, stepName);
      const lookupPostcode = req.session.lookupPostcode || '';
      const addressResults = req.session.postcodeLookupResult || null;
      const error = req.session.lookupError || undefined;

      delete req.session.lookupPostcode;
      delete req.session.lookupError;

      return {
        ...content,
        ...savedData,
        lookupPostcode,
        addressResults,
        error,
        selectedAddressIndex: savedData?.selectedAddressIndex || null,
        backUrl: '/steps/user-journey/enter-user-details',
      };
    });
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const { action, lookupPostcode, selectedAddressIndex } = req.body;
      const lang: SupportedLang = getValidatedLanguage(req);
      const content = generateContent(lang);

      const enterAddressPath = '/steps/user-journey/enter-address' as const;
      const summaryPath = '/steps/user-journey/summary' as const;

      // 🔹 Handle Find Address
      if (action === 'find-address') {
        if (!lookupPostcode || !postcodeRegex.test(lookupPostcode.trim())) {
          req.session.lookupPostcode = lookupPostcode;
          req.session.lookupError = {
            field: 'lookupPostcode',
            text: content.errors?.invalidPostcode || 'Enter a valid or partial UK postcode',
          };
          return res.redirect(303, `${enterAddressPath}?lookup=1`);
        }

        try {
          const addressResults = await getAddressesByPostcode(lookupPostcode);

          if (addressResults.length === 0) {
            req.session.lookupPostcode = lookupPostcode;
            req.session.lookupError = {
              field: 'lookupPostcode',
              text: content.errors?.noAddressesFound || 'No addresses found for that postcode',
            };

            return res.redirect(303, `${enterAddressPath}?lookup=1`);
          }

          req.session.lookupPostcode = lookupPostcode;
          req.session.postcodeLookupResult = addressResults;
          return res.redirect(303, `${enterAddressPath}?lookup=1`);
        } catch {
          req.session.lookupPostcode = lookupPostcode;

          req.session.lookupError = {
            field: 'lookupPostcode',
            text: content.errors?.addressLookupFailed || 'There was a problem finding addresses. Please try again.',
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
        const errors = validateForm(req, fields);

        if (Object.keys(errors).length > 0) {
          const firstField = Object.keys(errors)[0];
          return res.status(400).render('steps/userJourney/enterAddress.njk', {
            ...content,
            ...req.body,
            error: {
              field: firstField,
              text: errors[firstField],
            },
            errorSummaryTitle: content.errorSummaryTitle,
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
        return res.redirect(303, summaryPath);
      }
      return res.redirect(303, enterAddressPath);
    },
  },
};
