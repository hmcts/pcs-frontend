import fs from 'fs';
import path from 'path';

const MANIFEST_PATH = path.join(__dirname, '../../.auth/test-documents.json');

export async function deleteUploadedTestDocuments(): Promise<void> {
  if (fs.existsSync(MANIFEST_PATH)) {
    fs.unlinkSync(MANIFEST_PATH);
  }
}
