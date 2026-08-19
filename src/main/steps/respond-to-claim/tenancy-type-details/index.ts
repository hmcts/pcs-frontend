import type { Request } from 'express';

import { Logger } from '../../../modules/logger';
import { getTranslationFunction } from '../../../modules/steps';
import { fromYesNoNotSureEnum, isWalesProperty, toYesNoNotSureEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { isRelease12Enabled } from '../../utils/isRelease12Enabled';
import { isLegalRepresentativeUser } from '../../utils/userRole';
import { createRespondToClaimFormStep } from '../formStep';

import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ccdCaseService } from '@services/ccdCaseService';
import { findCaseDocumentById } from '@utils/documentUtils';

const logger = Logger.getLogger('tenancyTypeDetails');

export function getTenancyDocumentInfo(validatedCase?: unknown): {
  isDocumentUploaded: boolean;
  documentId?: string;
} {
  const caseData =
    (validatedCase as { data?: Record<string, unknown> })?.data ?? (validatedCase as Record<string, unknown>) ?? {};

  const detailsTabTenancyDocs = (caseData?.detailsTab_TenancyLicenceDetails as Record<string, unknown>)
    ?.tenancyLicenceDocuments;
  const detailsTabOccupationDocs = (caseData?.detailsTab_OccupationContractLicenceDetails as Record<string, unknown>)
    ?.documents;
  const tenancyLicenceDocs = caseData?.tenancy_LicenceDocuments || caseData?.tenancyLicenceDocuments;
  const occupationDocs = caseData?.occupationContractDocuments || caseData?.occupationLicenceDocuments;
  const allDocs = caseData?.allDocuments;
  const claimantDocs = caseData?.claimantDocuments;

  const collections = [
    detailsTabTenancyDocs,
    detailsTabOccupationDocs,
    tenancyLicenceDocs,
    occupationDocs,
    allDocs,
    claimantDocs,
  ];

  for (const collection of collections) {
    const items = Array.isArray(collection) ? collection : collection ? [collection] : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const rec = item as Record<string, unknown>;
      const val = (rec.value as Record<string, unknown>) ?? rec;
      const docObj = (val.document as Record<string, unknown>) ?? val;

      const url = (docObj.document_url ||
        docObj.document_binary_url ||
        val.document_url ||
        val.document_binary_url ||
        rec.document_url ||
        rec.document_binary_url) as string | undefined;

      const urlId = url ? url.split('/documents/')[1]?.split('/')[0] : undefined;
      const id = (rec.id as string) || (val.id as string) || (docObj.id as string) || urlId;

      if (id) {
        const downloadable = findCaseDocumentById(caseData, id);
        if (!downloadable?.binaryUrl) {
          continue;
        }
        return { isDocumentUploaded: true, documentId: downloadable.id };
      }
    }
  }

  return { isDocumentUploaded: false };
}

// Testing builds
const fieldsConfig: FormFieldConfig[] = [
  {
    name: 'tenancyTypeConfirm',
    type: 'radio',
    required: true,
    legendClasses: 'govuk-fieldset__legend--m govuk-heading-m',
    translationKey: {
      label: 'legend',
    },
    options: [
      {
        value: 'yes',
        translationKey: 'yes',
      },
      {
        value: 'no',
        translationKey: 'no',
        subFields: {
          correctType: {
            name: 'correctType',
            type: 'text',
            required: true,
            errorMessage: 'errors.requiredText',
            classes: 'govuk-input--width-two-thirds',
            labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
            maxLength: 60,
            translationKey: {
              label: 'correctTypeLabel',
            },
          },
        },
      },
      {
        divider: 'or',
      },
      {
        value: 'notSure',
        translationKey: 'notSure',
      },
    ],
  },
];

const STEP_NAME = 'tenancy-type-details';

const TENANCY_TYPE_TO_TEXT: Record<string, string> = {
  ASSURED_TENANCY: 'an assured',
  SECURE_TENANCY: 'a secure',
  INTRODUCTORY_TENANCY: 'an introductory',
  FLEXIBLE_TENANCY: 'a flexible',
  DEMOTED_TENANCY: 'a demoted',
  OTHER: 'other',
};

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: STEP_NAME,
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.tenancyTypeConfirmation),
  stepDir: __dirname,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    insetText: 'insetText',
    saveAndContinue: 'saveAndContinue',
    saveForLater: 'saveForLater',
    detailsHeading: 'detailsHeading',
    tenancyType: 'tenancyType',
    tenancyTypeOther: 'tenancyTypeOther',
    tenancyAgreementDocumentLinkText: 'tenancyAgreementDocumentLinkText',
  },
  customTemplate: 'respond-to-claim/tenancy-type-details/tenancyTypeDetails.njk',
  fields: fieldsConfig,
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals.validatedCase?.data;
    const existingTenancyTypeConfirmation =
      caseData?.possessionClaimResponse?.defendantResponses?.tenancyTypeConfirmation;
    const existingCorrectedTenancyType = caseData?.possessionClaimResponse?.defendantResponses?.tenancyType;

    const formValue = fromYesNoNotSureEnum(existingTenancyTypeConfirmation);
    if (!formValue) {
      return {};
    }

    const initial: Record<string, unknown> = { tenancyTypeConfirm: formValue };
    if (existingTenancyTypeConfirmation === 'NO' && existingCorrectedTenancyType) {
      initial['tenancyTypeConfirm.correctType'] = existingCorrectedTenancyType;
    }
    return initial;
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const tenancyTypeConfirm = req.body?.tenancyTypeConfirm as string | undefined;
    const enumValue = toYesNoNotSureEnum(tenancyTypeConfirm);

    if (enumValue) {
      response.defendantResponses.tenancyTypeConfirmation = enumValue;

      if (tenancyTypeConfirm === 'no') {
        const correctedType = (
          (req.body?.['tenancyTypeConfirm.correctType'] as string | undefined) ||
          (req.body?.correctType as string | undefined)
        )?.trim();
        if (correctedType) {
          response.defendantResponses.tenancyType = correctedType;
        } else {
          delete response.defendantResponses.tenancyType;
        }
      } else {
        delete response.defendantResponses.tenancyType;
      }
    } else {
      delete response.defendantResponses.tenancyTypeConfirmation;
      delete response.defendantResponses.tenancyType;
    }

    await saveDraftDefendantResponse(req, response);
  },
  extendGetContent: async (req, formContent) => {
    const existingTenancyTypeConfirmation =
      req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.tenancyTypeConfirmation;
    const existingCorrectedTenancyType = req.res?.locals.validatedCase?.data?.possessionClaimResponse
      ?.defendantResponses?.tenancyType as string;
    const tenancyTypeConfirm =
      (req.body?.tenancyTypeConfirm as string) || fromYesNoNotSureEnum(existingTenancyTypeConfirmation) || '';
    const correctType =
      (req.body?.['tenancyTypeConfirm.correctType'] as string) ||
      (req.body?.correctType as string) ||
      (tenancyTypeConfirm === 'no' ? existingCorrectedTenancyType : '') ||
      '';
    const claimantName = req.res?.locals.validatedCase?.claimantName;
    const caseData = req.res?.locals.validatedCase?.data;
    const walesProperty = isWalesProperty(caseData);
    const orgName = req.res?.locals.validatedCase?.orgName;
    const tenancyTypeOfTenancyLicence = caseData?.tenancy_TypeOfTenancyLicence as string;
    const occupationLicenceTypeWales = caseData?.occupationLicenceTypeWales;
    // Wales: flat keys from OccupationLicenceDetailsWales.
    const otherTenancyTypeDetails = walesProperty
      ? caseData?.otherLicenceTypeDetails
      : caseData?.tenancy_DetailsOfOtherTypeOfTenancyLicence;
    // England: tenancy_* (TenancyLicenceDetails).
    const tenancyTypeAgreementType = TENANCY_TYPE_TO_TEXT[tenancyTypeOfTenancyLicence];
    const senderName = isLegalRepresentativeUser(req) ? claimantName : orgName;
    const release12Enabled = isRelease12Enabled(req);

    const t = getTranslationFunction(req);
    let tenancyType: unknown;
    if (walesProperty) {
      if (occupationLicenceTypeWales === 'OTHER') {
        tenancyType = t('tenancyTypeOther', { otherTenancyTypeDetails });
      } else if (occupationLicenceTypeWales === 'STANDARD_CONTRACT') {
        tenancyType = t('tenancyTypeWalesStandard');
      } else if (occupationLicenceTypeWales === 'SECURE_CONTRACT') {
        tenancyType = t('tenancyTypeWalesSecure');
      } else {
        tenancyType = formContent.tenancyType;
      }
    } else {
      tenancyType = tenancyTypeOfTenancyLicence === 'OTHER' ? formContent.tenancyTypeOther : formContent.tenancyType;
    }

    let { isDocumentUploaded, documentId } = getTenancyDocumentInfo(req.res?.locals.validatedCase);

    if (!isDocumentUploaded) {
      try {
        const accessToken = req.session?.user?.accessToken;
        const rawCaseReference = req.params?.caseReference;
        const caseReference = Array.isArray(rawCaseReference) ? rawCaseReference[0] : rawCaseReference;
        if (accessToken && caseReference) {
          const fullCase = await ccdCaseService.getCaseById(accessToken, caseReference);
          const fullCaseDocInfo = getTenancyDocumentInfo(fullCase);
          if (fullCaseDocInfo.isDocumentUploaded && fullCaseDocInfo.documentId) {
            isDocumentUploaded = true;
            documentId = fullCaseDocInfo.documentId;
          }
        }
      } catch (err) {
        logger.warn('[tenancyTypeDetails] Failed to fetch full case for tenancy document', { error: err });
      }
    }

    const tenancyDocument = isDocumentUploaded && documentId ? { id: documentId } : '';

    return {
      ...formContent,
      senderName,
      tenancyType,
      organisationName: orgName,
      orgname: orgName,
      otherTenancyTypeDetails,
      tenancyTypeAgreementType,
      tenancyTypeConfirm,
      correctType,
      tenancyDocument,
      isRelease12Enabled: release12Enabled,
    };
  },
});
