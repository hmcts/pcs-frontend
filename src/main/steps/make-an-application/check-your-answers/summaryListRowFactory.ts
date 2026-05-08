import escapeHTML from 'escape-html';
import type { Request } from 'express';
import { TFunction } from 'i18next';

import VisibleFormDataView from './visibleFormDataView';

export type SummaryFieldData = {
  stepName: string;
  fieldValue: string;
  fieldLabel: string;
  changeHint: string;
};

export type SummaryListRow = {
  key: {
    text: string;
  };
  value: {
    text?: string;
    html?: string;
  };
  actions: {
    items: SummaryListRowAction[];
  };
};

export type SummaryListRowAction = {
  href: string;
  text: string;
  visuallyHiddenText: string;
};

function createSummaryListRow(
  summaryFieldConfig: SummaryFieldData,
  t: TFunction,
  keepLineBreaks: boolean = false
): SummaryListRow {
  return {
    key: {
      text: summaryFieldConfig.fieldLabel,
    },
    value: {
      ...(keepLineBreaks
        ? {
            html: escapeHTML(summaryFieldConfig.fieldValue).replace(/\n/g, '<br>'),
          }
        : {
            text: summaryFieldConfig.fieldValue,
          }),
    },
    actions: {
      items: [
        {
          href: `./${summaryFieldConfig.stepName}`,
          text: t('change'),
          visuallyHiddenText: summaryFieldConfig.changeHint,
        },
      ],
    },
  };
}

export function buildSummaryListRows(req: Request, t: TFunction): SummaryListRow[] {
  const summaryListRows: SummaryListRow[] = [];

  const visibleFormData = new VisibleFormDataView(req);

  const applicationTypeField = visibleFormData.getApplicationTypeField();
  if (applicationTypeField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: applicationTypeField.stepName,
          fieldLabel: t('answers.typeOfApplication.label'),
          fieldValue: t(`answers.typeOfApplication.options.${applicationTypeField.fieldValue}`),
          changeHint: t('answers.typeOfApplication.changeHint'),
        },
        t
      )
    );
  }

  const hearingInNext14DaysField = visibleFormData.getHearingInNext14DaysField();
  if (hearingInNext14DaysField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: hearingInNext14DaysField.stepName,
          fieldLabel: t('answers.hearingInNext14Days.label'),
          fieldValue: t(`options.${hearingInNext14DaysField.fieldValue}`),
          changeHint: t('answers.hearingInNext14Days.changeHint'),
        },
        t
      )
    );
  }

  const helpWithFeesNeededField = visibleFormData.getHelpWithFeesNeededField();
  if (helpWithFeesNeededField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: helpWithFeesNeededField.stepName,
          fieldLabel: t('answers.helpWithFeesNeeded.label'),
          fieldValue: t(`answers.helpWithFeesNeeded.options.${helpWithFeesNeededField.fieldValue}`),
          changeHint: t('answers.helpWithFeesNeeded.changeHint'),
        },
        t
      )
    );
  }

  const alreadyAppliedForHwfField = visibleFormData.getAlreadyAppliedForHwfField();
  if (alreadyAppliedForHwfField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: alreadyAppliedForHwfField.stepName,
          fieldLabel: t('answers.alreadyAppliedForHwf.label'),
          fieldValue: t(`options.${alreadyAppliedForHwfField.fieldValue}`),
          changeHint: t('answers.alreadyAppliedForHwf.changeHint'),
        },
        t
      )
    );
  }

  const hwfReferenceField = visibleFormData.getHwfReferenceField();
  if (hwfReferenceField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: hwfReferenceField.stepName,
          fieldLabel: t('answers.hwfReference.label'),
          fieldValue: hwfReferenceField.fieldValue,
          changeHint: t('answers.hwfReference.changeHint'),
        },
        t
      )
    );
  }

  const otherPartiesAgreedField = visibleFormData.getOtherPartiesAgreedField();
  if (otherPartiesAgreedField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: otherPartiesAgreedField.stepName,
          fieldLabel: t('answers.otherPartiesAgreed.label'),
          fieldValue: t(`options.${otherPartiesAgreedField.fieldValue}`),
          changeHint: t('answers.otherPartiesAgreed.changeHint'),
        },
        t
      )
    );
  }

  const anyReasonsNotToShareField = visibleFormData.getAnyReasonsNotToShareField();
  if (anyReasonsNotToShareField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: anyReasonsNotToShareField.stepName,
          fieldLabel: t('answers.anyReasonNotToShare.label'),
          fieldValue: t(`options.${anyReasonsNotToShareField.fieldValue}`),
          changeHint: t('answers.anyReasonNotToShare.changeHint'),
        },
        t
      )
    );
  }

  const reasonForNotSharingField = visibleFormData.getReasonForNotSharingField();
  if (reasonForNotSharingField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: reasonForNotSharingField.stepName,
          fieldLabel: t('answers.reasonForNotSharing.label'),
          fieldValue: reasonForNotSharingField.fieldValue,
          changeHint: t('answers.reasonForNotSharing.changeHint'),
        },
        t,
        true
      )
    );
  }

  const whatOrderWantedField = visibleFormData.getWhatOrderWantedField();
  if (whatOrderWantedField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: whatOrderWantedField.stepName,
          fieldLabel: t('answers.whatOrderWanted.label'),
          fieldValue: whatOrderWantedField.fieldValue,
          changeHint: t('answers.whatOrderWanted.changeHint'),
        },
        t,
        true
      )
    );
  }

  const hasSupportingDocumentsField = visibleFormData.getHasSupportingDocuments();
  if (hasSupportingDocumentsField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: hasSupportingDocumentsField.stepName,
          fieldLabel: t('answers.hasSupportingDocuments.label'),
          fieldValue: t(`options.${hasSupportingDocumentsField.fieldValue}`),
          changeHint: t('answers.hasSupportingDocuments.changeHint'),
        },
        t
      )
    );
  }

  const whichLanguageField = visibleFormData.getWhichLanguageField();
  if (whichLanguageField) {
    summaryListRows.push(
      createSummaryListRow(
        {
          stepName: whichLanguageField.stepName,
          fieldLabel: t('answers.whichLanguage.label'),
          fieldValue: t(`answers.whichLanguage.options.${whichLanguageField.fieldValue}`),
          changeHint: t('answers.whichLanguage.changeHint'),
        },
        t
      )
    );
  }

  return summaryListRows;
}
