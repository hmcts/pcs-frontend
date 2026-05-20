import type { Request } from 'express';

import type { DocumentStorage } from '@modules/documents/storage';
import type { BuiltFormContent } from '@modules/steps/formBuilder/formFieldConfig.interface';

/** Hidden MOJ multifile inputs post as uploadedDocuments[]; map back for error re-render. */
export function parseUploadedDocumentsFromBody(body: Record<string, unknown>): Record<string, unknown>[] {
  const raw = body['uploadedDocuments[]'];
  if (raw === undefined || raw === null) {
    return [];
  }
  const entries = Array.isArray(raw) ? raw : [raw];
  const parsed: Record<string, unknown>[] = [];
  for (const entry of entries) {
    if (typeof entry !== 'string') {
      continue;
    }
    try {
      const doc = JSON.parse(entry) as unknown;
      if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
        parsed.push(doc as Record<string, unknown>);
      }
    } catch {
      // ignore malformed hidden input
    }
  }
  return parsed;
}

/**
 * Wires uploadUrl/deleteUrl onto the file field component from req.originalUrl.
 * Used on GET and on POST validation error re-render when documentStorage is set.
 */
export function wireFileUploadUrls(
  formContent: BuiltFormContent,
  req: Request,
  documentStorage: DocumentStorage | undefined
): void {
  if (!documentStorage) {
    return;
  }
  const fileField = formContent.fields?.find(f => f.componentType === 'fileUpload');
  if (!fileField?.component) {
    return;
  }
  const urlBase = req.originalUrl.split('?')[0];
  fileField.component.uploadUrl = `${urlBase}/upload`;
  fileField.component.deleteUrl = `${urlBase}/delete`;
}

/**
 * POST validation error path only: wire URLs and restore previously uploaded documents
 * from hidden inputs so the MOJ multi-file-upload client can enhance the page.
 */
export function wireFileUploadOnPostError(
  formContent: BuiltFormContent,
  req: Request,
  documentStorage: DocumentStorage | undefined
): void {
  wireFileUploadUrls(formContent, req, documentStorage);
  if (!documentStorage) {
    return;
  }
  const fileField = formContent.fields?.find(f => f.componentType === 'fileUpload');
  if (!fileField?.component) {
    return;
  }
  const body = req.body as Record<string, unknown>;
  fileField.component.value = parseUploadedDocumentsFromBody(body);
}
