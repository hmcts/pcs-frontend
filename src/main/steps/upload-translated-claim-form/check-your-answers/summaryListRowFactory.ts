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

// function createSummaryListRow(
//   summaryFieldConfig: SummaryFieldData,
//   t: TFunction,
//   keepLineBreaks: boolean = false
// ): SummaryListRow {
//   return {
//     key: {
//       text: summaryFieldConfig.fieldLabel,
//     },
//     value: {
//       ...(keepLineBreaks
//         ? {
//             html: escapeHTML(summaryFieldConfig.fieldValue).replace(/\n/g, '<br>'),
//           }
//         : {
//             text: summaryFieldConfig.fieldValue,
//           }),
//     },
//     actions: {
//       items: [
//         {
//           href: `./${summaryFieldConfig.stepName}`,
//           text: t('change'),
//           visuallyHiddenText: summaryFieldConfig.changeHint,
//         },
//       ],
//     },
//   };
// }

export async function buildSummaryListRows(req: Request, t: TFunction): Promise<SummaryListRow[]> {
  const summaryListRows: SummaryListRow[] = [];

  const visibleFormData = new VisibleFormDataView(req);

  const uploadedDocuments = await visibleFormData.getUploadedDocuments();

  summaryListRows.push({
    key: {
      text: t('answers.uploadedDocuments.label'),
    },
    value: {
      html: uploadedDocuments.map(document => document.value.document.document_filename).join('<br>'),
    },
    actions: {
      items: [
        {
          href: './upload-documents',
          text: t('change'),
          visuallyHiddenText: t('answers.uploadedDocuments.changeHint'),
        },
      ],
    },
  });

  return summaryListRows;
}
