import config from 'config';
import FormData from 'form-data';

import { Classification, DocumentManagementFile, UploadedFiles } from '../../interfaces/documentManagement.interface';
import { http } from '../../modules/http';

interface UserDetails {
  accessToken: string;
  id: string;
  email?: string;
}

interface CaseDocumentManagementResponse {
  documents: DocumentManagementFile[];
}

export class CaseDocumentManagementClient {
  BASE_URL: string = config.get('services.cdam.url');
  private user?: UserDetails;

  constructor(user?: UserDetails) {
    this.user = user;
  }

  async create({
    files,
    classification,
  }: {
    files: UploadedFiles;
    classification: Classification;
  }): Promise<DocumentManagementFile[]> {
    const formData = new FormData();
    formData.append('caseTypeId', config.get('caseType'));
    formData.append('jurisdictionId', config.get('jurisdiction'));
    formData.append('classification', classification);

    for (const [, file] of Object.entries(files)) {
      const uploadedFile = Array.isArray(file) ? file[0] : file;
      formData.append('files', uploadedFile.data, uploadedFile.name);
    }

    const headers: Record<string, string> = {
      ...formData.getHeaders(),
    };

    if (this.user) {
      headers.Authorization = `Bearer ${this.user.accessToken}`;
      headers['user-id'] = this.user.id;
    }

    const response = await http.post<CaseDocumentManagementResponse>(`${this.BASE_URL}/cases/documents`, formData, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: config.get<number>('uploadTimeout'),
    });
    return response.data?.documents || [];
  }
}
