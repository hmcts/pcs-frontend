import type { Request } from 'express';

import { sessionDocs } from '@modules/documents/storage';
import { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { toCaseReference16 } from '@utils/caseReference';

const uploadStorage = sessionDocs({ stepName: 'upload-documents' }); // TODO: Is this OK?
// export type FieldDetails<T> = {
//   stepName: string;
//   fieldValue: T;
// };

export default class VisibleFormDataView {
  constructor(readonly req: Request) {}

  async getUploadedDocuments(): Promise<CcdCollectionItem<CcdUploadedDocument>[]> {
    const caseRef = toCaseReference16(this.req.params?.caseReference);
    if (!caseRef) {
      return [];
    }
    const docs = await uploadStorage.read(this.req);
    // const docs = this.req.session.uploadedDocs?.[caseRef]?.['upload-documents'];
    return Array.isArray(docs) ? (docs as CcdCollectionItem<CcdUploadedDocument>[]) : [];
  }
}
