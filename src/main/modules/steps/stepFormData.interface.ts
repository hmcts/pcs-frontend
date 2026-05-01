import { Request, RequestHandler } from 'express';

import type { DocumentStorage } from '@modules/documents/storage';
import { GetController, type SupportedLang } from '@modules/steps';

export interface ErrorField {
  field: string;
  text: string;
}

export interface StepFormData {
  error?: ErrorField | string | undefined;
  answer?: string;
  choices?: string[] | string;
  [key: string]: unknown;
}

export interface StepDefinition {
  url: string;
  name: string;
  view: string;
  stepDir: string;
  getController: GetController | ((lang?: SupportedLang) => GetController);
  postController?: { post: RequestHandler };
  middleware?: RequestHandler[];
  showCancelButton?: boolean;
  // Storage adapter for upload steps — encapsulates where documents are persisted
  // (CCD draft for respond-to-claim, session for make-an-application).
  // Absent on every non-upload step. The upload handler refuses requests targeting
  // a step that does not declare this.
  documentStorage?: DocumentStorage;
  // Optional upload filename transform for journey-specific naming rules.
  uploadFilenameTransform?: (req: Request, originalName: string) => string;
}
