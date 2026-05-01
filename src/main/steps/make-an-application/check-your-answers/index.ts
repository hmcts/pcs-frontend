import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { createGetController, createStepNavigation, getFormData, getTranslationFunction } from '../../../modules/steps';
import { ccdCaseService } from '../../../services/ccdCaseService';
import { toYesNoEnum } from '../../utils';
import { MAKE_AN_APPLICATION_ROUTE, flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { CcdCollectionItem, CcdUploadedDocument, CitizenGenAppRequest } from '@services/ccdCase.interface';

const STEP_NAME = 'check-your-answers';
const stepNavigation = createStepNavigation(flowConfig);

function getTypeOfApplication(req: Request) {
  return getFormData(req, 'choose-an-application').typeOfApplication as string;
}

function isHearingInNext14Days(req: Request): 'yes' | 'no' | undefined {
  return getFormData(req, 'is-the-court-hearing-in-the-next-14-days').courtHearingInNext14Days as 'yes' | 'no';
}

function isHelpWithFeesNeeded(req: Request): 'yes' | 'no' | undefined {
  return getFormData(req, 'do-you-need-help-paying-the-fee').helpWithFeesNeeded as 'yes' | 'no';
}

function hasAlreadyAppliedForHwf(req: Request): 'yes' | 'no' | undefined {
  return getFormData(req, 'have-you-already-applied-for-help-with-fees').alreadyAppliedForHelp as 'yes' | 'no';
}

interface UploadedDocumentFormData {
  document_url: string;
  document_binary_url: string;
  document_filename: string;
  content_type?: string;
  size?: number;
}

function wantsToUploadDocuments(req: Request): 'YES' | 'NO' | undefined {
  return getFormData(req, 'do-you-want-to-upload-documents-to-support-your-application').uploadDocuments as
    | 'YES'
    | 'NO'
    | undefined;
}

function getUploadedDocuments(req: Request): CcdCollectionItem<CcdUploadedDocument>[] {
  const rawDocuments = getFormData(req, 'upload-documents-to-support-your-application').documents as
    | UploadedDocumentFormData[]
    | undefined;

  if (!rawDocuments?.length) {
    return [];
  }

  return rawDocuments.map(document => ({
    value: {
      document: {
        document_url: document.document_url,
        document_binary_url: document.document_binary_url,
        document_filename: document.document_filename,
      },
      contentType: document.content_type,
      size: document.size,
    },
  }));
}

export const step: StepDefinition = {
  url: `${MAKE_AN_APPLICATION_ROUTE}/check-your-answers`,
  name: STEP_NAME,
  view: 'make-an-application/check-your-answers/checkYourAnswers.njk',
  stepDir: __dirname,
  getController: () => {
    return createGetController(
      'make-an-application/check-your-answers/checkYourAnswers.njk',
      STEP_NAME,
      stepNavigation,
      (req: Request) => {
        const t: TFunction = getTranslationFunction(req, STEP_NAME, ['common']);

        const typeOfApplication = getTypeOfApplication(req);
        const hearingInNext14Days = isHearingInNext14Days(req);
        const helpWithFeesNeeded = isHelpWithFeesNeeded(req);
        const alreadyAppliedForHwf = hasAlreadyAppliedForHwf(req);
        const uploadDocumentsChoice = wantsToUploadDocuments(req);
        const uploadedDocuments = getUploadedDocuments(req);

        const summaryDataRows = [];

        summaryDataRows.push({
          key: {
            text: t('answers.typeOfApplication.label'),
          },
          value: {
            text: t(`answers.typeOfApplication.options.${typeOfApplication}`),
          },
          actions: {
            items: [
              {
                href: './choose-an-application',
                text: t('change'),
                visuallyHiddenText: t('answers.typeOfApplication.changeHint'),
              },
            ],
          },
        });

        if (hearingInNext14Days !== undefined) {
          summaryDataRows.push({
            key: {
              text: t('answers.hearingInNext14Days.label'),
            },
            value: {
              text: t(`options.${hearingInNext14Days}`),
            },
            actions: {
              items: [
                {
                  href: './is-the-court-hearing-in-the-next-14-days',
                  text: t('change'),
                  visuallyHiddenText: t('answers.hearingInNext14Days.changeHint'),
                },
              ],
            },
          });
        }

        if (helpWithFeesNeeded !== undefined) {
          summaryDataRows.push({
            key: {
              text: t('answers.helpWithFeesNeeded.label'),
            },
            value: {
              text: t(`answers.helpWithFeesNeeded.options.${helpWithFeesNeeded}`),
            },
            actions: {
              items: [
                {
                  href: './do-you-need-help-paying-the-fee',
                  text: t('change'),
                  visuallyHiddenText: t('answers.helpWithFeesNeeded.changeHint'),
                },
              ],
            },
          });
        }

        if (alreadyAppliedForHwf !== undefined) {
          summaryDataRows.push({
            key: {
              text: t('answers.alreadyAppliedForHwf.label'),
            },
            value: {
              text: t(`options.${alreadyAppliedForHwf}`),
            },
            actions: {
              items: [
                {
                  href: './have-you-already-applied-for-help-with-fees',
                  text: t('change'),
                  visuallyHiddenText: t('answers.alreadyAppliedForHwf.changeHint'),
                },
              ],
            },
          });
        }

        if (uploadDocumentsChoice !== undefined) {
          summaryDataRows.push({
            key: {
              text: t('answers.uploadDocumentsWanted.label'),
            },
            value: {
              text: t(`answers.uploadDocumentsWanted.options.${uploadDocumentsChoice}`),
            },
            actions: {
              items: [
                {
                  href: './do-you-want-to-upload-documents-to-support-your-application',
                  text: t('change'),
                  visuallyHiddenText: t('answers.uploadDocumentsWanted.changeHint'),
                },
              ],
            },
          });
        }

        if (uploadDocumentsChoice === 'YES' && uploadedDocuments.length > 0) {
          summaryDataRows.push({
            key: {
              text: t('answers.uploadedDocuments.label'),
            },
            value: {
              html: uploadedDocuments.map(document => document.value.document.document_filename).join('<br>'),
            },
            actions: {
              items: [
                {
                  href: './upload-documents-to-support-your-application',
                  text: t('change'),
                  visuallyHiddenText: t('answers.uploadedDocuments.changeHint'),
                },
              ],
            },
          });
        }

        return {
          summaryData: {
            rows: summaryDataRows,
          },
        };
      },
      'makeAnApplication'
    );
  },
  postController: {
    post: async (req: Request, res: Response) => {
      const formData = req.session.formData;

      const ccdCase = res.locals.validatedCase;
      if (!ccdCase) {
        throw Error('No existing case details in session');
      }

      if (!formData) {
        throw Error('No existing formData in session');
      }

      const hearingInNext14Days = isHearingInNext14Days(req);
      const helpWithFeesNeeded = isHelpWithFeesNeeded(req);
      const alreadyAppliedForHwf = hasAlreadyAppliedForHwf(req);
      const uploadDocumentsChoice = wantsToUploadDocuments(req);
      const uploadedDocuments = getUploadedDocuments(req);

      const citizenGenAppRequest: CitizenGenAppRequest = {
        applicationType: formData['choose-an-application']['typeOfApplication'],
        within14Days: hearingInNext14Days ? toYesNoEnum(hearingInNext14Days) : undefined,
        needHwf: helpWithFeesNeeded ? toYesNoEnum(helpWithFeesNeeded) : undefined,
        appliedForHwf: alreadyAppliedForHwf ? toYesNoEnum(alreadyAppliedForHwf) : undefined,
        hwfReference: getFormData(req, 'have-you-already-applied-for-help-with-fees')[
          'alreadyAppliedForHelp.hwfReference'
        ] as string,
        documents: uploadDocumentsChoice === 'YES' && uploadedDocuments.length > 0 ? uploadedDocuments : undefined,
      };

      await ccdCaseService.submitGeneralApplication(req.session?.user?.accessToken, {
        id: ccdCase.id,
        data: {
          citizenGenAppRequest,
        },
      });

      delete req.session.formData;

      const redirectPath = await stepNavigation.getNextStepUrl(req, STEP_NAME, req.body);

      if (!redirectPath) {
        return res.status(500).send('Unable to determine next step');
      }

      res.redirect(303, redirectPath);
    },
  },
};
