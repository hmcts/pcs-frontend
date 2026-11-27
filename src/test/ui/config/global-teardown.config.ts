import { deleteUploadedTestDocuments } from '../utils/common/deleteDocument.util';

async function globalTeardownConfig(): Promise<void> {
  await deleteUploadedTestDocuments();
}

export default globalTeardownConfig;
