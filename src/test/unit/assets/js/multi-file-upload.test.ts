/**
 * @jest-environment jest-environment-jsdom
 */

jest.mock('@ministryofjustice/frontend', () => ({
  MultiFileUpload: jest.fn(),
}));

import { initMultiFileUpload } from '../../../../main/assets/js/multi-file-upload';

const MockedMultiFileUpload = (
  jest.requireMock('@ministryofjustice/frontend') as {
    MultiFileUpload: jest.Mock;
  }
).MultiFileUpload;

/** Shapes match `multi-file-upload.ts` hook implementations (MOJ passes extra args per d.ts). */
interface CapturedHooks {
  entryHook: (upload: unknown, file: File) => void;
  exitHook: (upload: unknown, file: File, xhr: XMLHttpRequest, textStatus: string) => void;
  errorHook: (upload: unknown, file: File, xhr: XMLHttpRequest, textStatus: string, error: Error) => void;
  deleteHook: (upload: unknown, file: File | undefined, xhr: XMLHttpRequest, textStatus: string) => void;
}

function getRequiredHooks(): CapturedHooks {
  const config = MockedMultiFileUpload.mock.calls[0]?.[1] as { hooks?: Partial<CapturedHooks> } | undefined;
  const hooks = config?.hooks;
  if (!hooks?.entryHook || !hooks?.exitHook || !hooks?.errorHook || !hooks?.deleteHook) {
    throw new Error('Expected MultiFileUpload to be constructed with all hooks');
  }
  return hooks as CapturedHooks;
}

function buildFormHtml(overrides?: {
  uploadUrl?: string;
  deleteUrl?: string;
  maxFileSizeMb?: string;
  includeHiddenContainer?: boolean;
  includeCsrf?: boolean;
}): void {
  const uploadUrl = overrides?.uploadUrl ?? '/case/upload';
  const deleteUrl = overrides?.deleteUrl ?? '/case/delete';
  const maxFileSizeMb = overrides?.maxFileSizeMb ?? '1024';
  const hidden = overrides?.includeHiddenContainer === false ? '' : '<div id="uploaded-documents-container"></div>';
  const csrf = overrides?.includeCsrf === false ? '' : '<input type="hidden" name="_csrf" value="test-csrf-token" />';

  document.body.innerHTML = `
    <form id="test-form">
      ${csrf}
      ${hidden}
      <div
        data-module="moj-multi-file-upload"
        data-upload-url="${uploadUrl}"
        data-delete-url="${deleteUrl}"
        data-max-file-size-mb="${maxFileSizeMb}"
        data-error-wrong-type="Wrong type message"
        data-error-file-too-large="Too large message"
        data-error-delete="Delete failed message"
      ></div>
    </form>
  `;
}

describe('initMultiFileUpload', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    MockedMultiFileUpload.mockClear();
    (global as { CSS?: { escape?: (value: string) => string } }).CSS = {
      escape: (value: string) => value,
    };
  });

  it('does not construct MultiFileUpload when upload URL is missing', () => {
    buildFormHtml({ uploadUrl: '' });
    initMultiFileUpload();
    expect(MockedMultiFileUpload).not.toHaveBeenCalled();
  });

  it('does not construct MultiFileUpload when delete URL is missing', () => {
    buildFormHtml({ deleteUrl: '' });
    initMultiFileUpload();
    expect(MockedMultiFileUpload).not.toHaveBeenCalled();
  });

  it('does not construct MultiFileUpload when hidden documents container is missing', () => {
    buildFormHtml({ includeHiddenContainer: false });
    initMultiFileUpload();
    expect(MockedMultiFileUpload).not.toHaveBeenCalled();
  });

  it('constructs MultiFileUpload with upload and delete URLs when DOM is valid', () => {
    buildFormHtml();
    initMultiFileUpload();

    expect(MockedMultiFileUpload).toHaveBeenCalledTimes(1);
    const [container, config] = MockedMultiFileUpload.mock.calls[0]!;
    expect(container).toBeInstanceOf(HTMLElement);
    expect(config?.uploadUrl).toBe('/case/upload');
    expect(config?.deleteUrl).toBe('/case/delete');
    expect(config?.hooks).toMatchObject({
      entryHook: expect.any(Function),
      exitHook: expect.any(Function),
      errorHook: expect.any(Function),
      deleteHook: expect.any(Function),
    });
  });

  it('entryHook shows error summary and throws when extension is blocked', () => {
    buildFormHtml();
    initMultiFileUpload();
    const hooks = getRequiredHooks();

    const file = new File(['x'], 'blocked.mp4', { type: 'video/mp4' });

    expect(() => hooks.entryHook(null as never, file)).toThrow('blocked');

    const summary = document.querySelector('.govuk-error-summary');
    expect(summary).not.toBeNull();
    expect((summary as HTMLElement).hidden).toBe(false);
    expect(summary?.textContent).toContain('Wrong type message');
  });

  it('entryHook shows error summary and throws when file exceeds max size', () => {
    buildFormHtml({ maxFileSizeMb: '1' });
    initMultiFileUpload();
    const hooks = getRequiredHooks();

    const oversized = new File([new Uint8Array(2 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' });

    expect(() => hooks.entryHook(null as never, oversized)).toThrow('too_large');

    const summary = document.querySelector('.govuk-error-summary');
    expect(summary?.textContent).toContain('Too large message');
  });

  it('exitHook appends a hidden input when upload response contains a document', () => {
    buildFormHtml();
    initMultiFileUpload();
    const hooks = getRequiredHooks();

    const xhr = {
      response: {
        document: {
          document_url: 'https://example.com/doc',
          document_binary_url: 'https://example.com/bin',
          document_filename: 'a.pdf',
        },
      },
      responseText: '',
    } as unknown as XMLHttpRequest;

    hooks.exitHook(null as never, new File([], 'a.pdf'), xhr, 'success');

    const hidden = document.querySelectorAll('input[name="uploadedDocuments[]"]');
    expect(hidden).toHaveLength(1);
    expect((hidden[0] as HTMLInputElement).dataset.documentUrl).toBe('https://example.com/doc');
  });

  it('exitHook ignores malformed JSON without throwing', () => {
    buildFormHtml();
    initMultiFileUpload();
    const hooks = getRequiredHooks();

    const xhr = {
      response: null,
      responseText: 'not-json',
    } as unknown as XMLHttpRequest;

    expect(() => hooks.exitHook(null as never, new File([], 'a.pdf'), xhr, 'success')).not.toThrow();
    expect(document.querySelectorAll('input[name="uploadedDocuments[]"]')).toHaveLength(0);
  });

  it('errorHook shows server error message when present', () => {
    buildFormHtml();
    initMultiFileUpload();
    const hooks = getRequiredHooks();

    const xhr = {
      response: { error: { message: 'Server says no' } },
      responseText: '',
    } as unknown as XMLHttpRequest;

    hooks.errorHook(null as never, new File([], 'a.pdf'), xhr, 'error', new Error('upload failed'));

    expect(document.querySelector('.govuk-error-summary')?.textContent).toContain('Server says no');
  });

  it('errorHook falls back to wrong-type message when JSON is invalid', () => {
    buildFormHtml();
    initMultiFileUpload();
    const hooks = getRequiredHooks();

    const xhr = {
      response: null,
      responseText: '%%%',
    } as unknown as XMLHttpRequest;

    hooks.errorHook(null as never, new File([], 'a.pdf'), xhr, 'error', new Error('parse'));

    expect(document.querySelector('.govuk-error-summary')?.textContent).toContain('Wrong type message');
  });

  it('deleteHook removes matching hidden input on success', () => {
    buildFormHtml();
    initMultiFileUpload();
    const hooks = getRequiredHooks();

    const hiddenContainer = document.getElementById('uploaded-documents-container')!;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'uploadedDocuments[]';
    input.dataset.documentUrl = 'https://example.com/remove-me';
    hiddenContainer.appendChild(input);

    const xhr = {
      status: 204,
      response: { documentUrl: 'https://example.com/remove-me' },
      responseText: '',
    } as unknown as XMLHttpRequest;

    hooks.deleteHook(null as never, undefined, xhr, 'success');

    expect(hiddenContainer.querySelector('input')).toBeNull();
  });

  it('deleteHook shows delete failed message on non-success status', () => {
    buildFormHtml();
    initMultiFileUpload();
    const hooks = getRequiredHooks();

    const xhr = {
      status: 500,
      response: null,
      responseText: '{}',
    } as unknown as XMLHttpRequest;

    hooks.deleteHook(null as never, undefined, xhr, 'error');

    expect(document.querySelector('.govuk-error-summary')?.textContent).toContain('Delete failed message');
  });

  it('prevents form submit and focuses error summary when upload error is visible', () => {
    buildFormHtml();
    initMultiFileUpload();

    const container = document.querySelector('[data-module="moj-multi-file-upload"]')!;
    const errorSpan = document.createElement('span');
    errorSpan.className = 'moj-multi-file-upload__error';
    errorSpan.textContent = 'Something went wrong';
    container.appendChild(errorSpan);

    const form = document.getElementById('test-form') as HTMLFormElement;
    const summary = document.createElement('div');
    summary.className = 'govuk-error-summary';
    summary.hidden = true;
    form.insertBefore(summary, form.firstChild);
    const focusSpy = jest.spyOn(summary, 'focus');

    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const prevented = !form.dispatchEvent(submitEvent);

    expect(prevented).toBe(true);
    expect(focusSpy).toHaveBeenCalled();
  });

  it('does not prevent submit when no visible upload error', () => {
    buildFormHtml();
    initMultiFileUpload();

    const form = document.getElementById('test-form') as HTMLFormElement;
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const prevented = !form.dispatchEvent(submitEvent);

    expect(prevented).toBe(false);
  });

  it('adds CSRF header to upload and delete XHR requests after init', () => {
    buildFormHtml();
    initMultiFileUpload();

    const setRequestHeader = jest.fn();
    const xhr = new XMLHttpRequest();
    xhr.setRequestHeader = setRequestHeader;

    xhr.open('POST', '/foo/upload');
    xhr.send();

    expect(setRequestHeader).toHaveBeenCalledWith('x-csrf-token', 'test-csrf-token');

    const xhr2 = new XMLHttpRequest();
    xhr2.setRequestHeader = jest.fn();
    xhr2.open('POST', '/bar/delete');
    xhr2.send();

    expect(xhr2.setRequestHeader).toHaveBeenCalledWith('x-csrf-token', 'test-csrf-token');
  });
});
