import type { TFunction } from 'i18next';

import { applyUploadValidationToComponent } from '@modules/steps/formBuilder';

const MB = 1024 * 1024;

const t = ((key: string, params?: Record<string, unknown>) => {
  if (!params || Object.keys(params).length === 0) {
    return key;
  }
  const paramString = Object.entries(params)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(',');
  return `${key}(${paramString})`;
}) as unknown as TFunction;

describe('applyUploadValidationToComponent', () => {
  it('does nothing when opts is undefined', () => {
    const component: Record<string, unknown> = { uploadUrl: '/upload' };
    applyUploadValidationToComponent(component, undefined, t);
    expect(component).toEqual({ uploadUrl: '/upload' });
  });

  it('wires filename length + translated error when maxFilenameLength is set', () => {
    const component: Record<string, unknown> = {};
    applyUploadValidationToComponent(component, { maxFilenameLength: 255 }, t);
    expect(component.maxFilenameLength).toBe(255);
    expect(component.errorFilenameTooLong).toBe('common:errors.documentUpload.filenameTooLong(maxLength=255)');
  });

  it('wires document cap (MB) + translated error when maxDocumentBytes is set', () => {
    const component: Record<string, unknown> = {};
    applyUploadValidationToComponent(component, { maxDocumentBytes: 1024 * MB }, t);
    expect(component.maxDocumentMB).toBe(1024);
    expect(component.errorFileTooLargeDocument).toBe('common:errors.documentUpload.fileTooLargeDocument(maxSize=1024)');
  });

  it('wires media cap (MB) + translated error when maxMediaBytes is set', () => {
    const component: Record<string, unknown> = {};
    applyUploadValidationToComponent(component, { maxMediaBytes: 500 * MB }, t);
    expect(component.maxMediaMB).toBe(500);
    expect(component.errorFileTooLargeMedia).toBe('common:errors.documentUpload.fileTooLargeMedia(maxSize=500)');
  });

  it('skips each branch independently when its option is omitted', () => {
    const component: Record<string, unknown> = {};
    applyUploadValidationToComponent(component, { maxFilenameLength: 100 }, t);
    expect(component.maxDocumentMB).toBeUndefined();
    expect(component.maxMediaMB).toBeUndefined();
    expect(component.errorFileTooLargeDocument).toBeUndefined();
    expect(component.errorFileTooLargeMedia).toBeUndefined();
  });

  it('wires all three when full opts are provided (case-tasks profile)', () => {
    const component: Record<string, unknown> = {};
    applyUploadValidationToComponent(
      component,
      { maxFilenameLength: 255, maxDocumentBytes: 1024 * MB, maxMediaBytes: 500 * MB },
      t
    );
    expect(component.maxFilenameLength).toBe(255);
    expect(component.maxDocumentMB).toBe(1024);
    expect(component.maxMediaMB).toBe(500);
  });
});
