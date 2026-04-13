import type { Request } from 'express';
import { TFunction } from 'i18next';

import type { SummaryListRow } from '../../../interfaces/govukComponents.interface';

import VisibleFormDataView from './visibleFormDataView';

export type SummaryFieldData = {
  stepName: string;
  fieldValue: string;
  fieldLabel: string;
  changeHint: string;
};

function createSummaryListRow(summaryFieldConfig: SummaryFieldData, t: TFunction): SummaryListRow {
  return {
    key: {
      text: summaryFieldConfig.fieldLabel,
    },
    value: {
      text: summaryFieldConfig.fieldValue,
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
        t
      )
    );
  }
  return summaryListRows;
}
