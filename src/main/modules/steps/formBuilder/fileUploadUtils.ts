import type { Request } from 'express';

import { type DocumentStorage, toDisplayDocuments } from '@modules/documents/storage';
import type { BuiltFormContent } from '@modules/steps/formBuilder/formFieldConfig.interface';
import { decodeBase64UrlJson } from '@utils/base64Json';

/**
 * Parses already-uploaded document metadata from POST `req.body`, not from multipart file parts.
 *
 * Actual files are uploaded by multer on the step's AJAX `/upload` route; successful uploads are
 * written into hidden `<input name="uploadedDocuments[]">` fields (base64url-encoded JSON) by the
 * MOJ script. The values are encoded so Azure Front Door's WAF doesn't false-positive on raw JSON
 * as SQL injection. On "Save and continue" those arrive as ordinary form fields — not as `req.files`.
 * This helper decodes them so validation-error re-renders can restore the file list.
 */
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
    const doc = decodeBase64UrlJson(entry);
    if (doc) {
      parsed.push(doc);
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
 * When POST has no parsed uploadedDocuments[] but CCD still has documents (e.g. after
 * client rebuildHiddenInputs missed server-rendered rows), inject hidden-field values
 * into req.body so validation sees the same list as the draft.
 */
export async function hydrateUploadedDocumentsFromBody(
  req: Request,
  documentStorage: DocumentStorage | undefined
): Promise<void> {
  if (!documentStorage) {
    return;
  }
  const body = req.body as Record<string, unknown>;
  if (parseUploadedDocumentsFromBody(body).length > 0) {
    return;
  }
  const displayDocs = toDisplayDocuments(await documentStorage.read(req));
  if (displayDocs.length === 0) {
    return;
  }
  body['uploadedDocuments[]'] = displayDocs.map(doc => JSON.stringify(doc));
}

/**
 * POST validation error path only: wire URLs and restore previously uploaded documents
 * from hidden inputs (or CCD when the body is empty) so the MOJ multi-file-upload
 * client can enhance the page.
 */
export async function wireFileUploadOnPostError(
  formContent: BuiltFormContent,
  req: Request,
  documentStorage: DocumentStorage | undefined
): Promise<void> {
  wireFileUploadUrls(formContent, req, documentStorage);
  if (!documentStorage) {
    return;
  }
  const fileField = formContent.fields?.find(f => f.componentType === 'fileUpload');
  if (!fileField?.component) {
    return;
  }
  const body = req.body as Record<string, unknown>;
  const parsed = parseUploadedDocumentsFromBody(body);
  fileField.component.value = parsed.length > 0 ? parsed : toDisplayDocuments(await documentStorage.read(req));
}
