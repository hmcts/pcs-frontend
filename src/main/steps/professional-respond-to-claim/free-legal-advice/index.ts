import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFreeLegalAdviceBase, mapFromCcdEnum } from '../../common/freeLegalAdviceBase';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFreeLegalAdviceBase({
  flowConfig,
  customTemplate: `${__dirname}/freeLegalAdvice.njk`,
  journeyFolder: 'professionalRespondToClaim',
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
    subHeading1: 'subHeading1',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    bullet1: 'bullet1',
    bullet2: 'bullet2',
    subHeading2: 'subHeading2',
    paragraph3: 'paragraph3',
    paragraph4: 'paragraph4',
  },
  extendGetContent: async (req, formContent) => {
    // Read from CCD (fresh data from START callback via res.locals.validatedCase)
    // Same pattern as correspondence-address - no session dependency
    const caseData = req.res?.locals.validatedCase?.data;
    const existingAnswer = caseData?.possessionClaimResponse?.defendantResponses?.receivedFreeLegalAdvice; // Only prepopulate on GET (not on POST with validation errors)

    if (existingAnswer && !req.body?.hadLegalAdvice) {
      // Map CCD enum to frontend value
      const formValue = mapFromCcdEnum(existingAnswer);

      if (formValue) {
        // Prepopulate radio button from CCD data
        const radioField = formContent.fields.find(f => f.componentType === 'radios');
        if (radioField?.component?.items && Array.isArray(radioField.component.items)) {
          radioField.component.items = radioField.component.items.map((item: Record<string, unknown>) => ({
            ...item,
            checked: item.value === formValue,
          }));
        }
      }
    }
    return formContent;
  },
});
