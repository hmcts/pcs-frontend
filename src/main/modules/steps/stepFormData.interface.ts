import { RequestHandler } from 'express';

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
  // CCD field path for upload steps (e.g. ['possessionClaimResponse','defendantResponses','defendantDocuments']).
  // Drives documentProxy.ts read/write and is paired with JourneyConfig.draftEvent.
  uploadDocsPath?: readonly string[];
}
