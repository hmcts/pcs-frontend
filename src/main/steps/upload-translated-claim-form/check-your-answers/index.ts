import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { toCaseReference16 } from '@utils/caseReference';
import type { Request } from 'express';
import type { TFunction } from 'i18next';
import { createFormStep, getTranslationFunction } from '@modules/steps';
import { getCaseTitleData } from '../../utils/getCaseTitleData';
import { flowConfig } from '../flow.config';
import { buildSummaryListRows } from './summaryListRowFactory';
// import VisibleFormDataView from './visibleFormDataView';
import { submitEvent } from '@services/ccdCaseService';
import VisibleFormDataView from './visibleFormDataView';

// TODO: Put journeyName into common file?
const STEP_NAME = 'check-your-answers';
const JOURNEY_NAME = 'uploadTranslatedClaimForm';

export const step: StepDefinition = createFormStep({
  stepName: STEP_NAME,
  journeyFolder: JOURNEY_NAME,
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/checkYourAnswers.njk`,
  fields: [
  ],
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading'
  },
  extendGetContent: async (req: Request) => {
    const t: TFunction = getTranslationFunction(req);

    return {
      summaryData: {
        rows: await buildSummaryListRows(req, t),
      },
      ...getCaseTitleData(req)
    };
  },
  beforeRedirect: async (req: Request) => {
    const ccdCase = req.res?.locals.validatedCase;
    if (!ccdCase) {
      throw Error('No existing case details in session');
    }

    const visibleFormData = new VisibleFormDataView(req);
    const uploadedDocs = await visibleFormData.getUploadedDocuments();

    const eventData = {
      id: ccdCase.id,
      data: {
        translatedDocuments: uploadedDocs,
      },
    };
    await submitEvent(req.session?.user?.accessToken, "ext:uploadTranslatedClaimForm", eventData)


    //
    // clearFormData(req);
    const caseRef = toCaseReference16(req.params?.caseReference);
    if (caseRef && req.session.uploadedDocs?.[caseRef]) {
      delete req.session.uploadedDocs[caseRef]['upload-documents']; // TODO: Move this into storage.ts?
    }
    // clearApplicationId(req);
    //
  },
});
