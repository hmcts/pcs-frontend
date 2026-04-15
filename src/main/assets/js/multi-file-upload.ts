import { MultiFileUpload } from '@ministryofjustice/frontend';

import { isBlockedExtension } from '@utils/documentUploadValidation';

interface DocumentMeta {
  document_url: string;
  document_binary_url: string;
  document_filename: string;
  content_type?: string;
  size?: number;
}

function getCsrfToken(): string {
  return document.querySelector<HTMLInputElement>('input[name="_csrf"]')?.value || '';
}

function getOrCreateErrorSummary(form: HTMLFormElement): HTMLDivElement {
  let summary = form.querySelector<HTMLDivElement>('.govuk-error-summary');
  if (summary) {
    return summary;
  }

  summary = document.createElement('div');
  summary.className = 'govuk-error-summary';
  summary.setAttribute('data-module', 'govuk-error-summary');
  summary.setAttribute('role', 'alert');
  summary.setAttribute('tabindex', '-1');
  summary.setAttribute('aria-labelledby', 'upload-error-summary-title');
  summary.innerHTML = `
    <h2 class="govuk-error-summary__title" id="upload-error-summary-title">There is a problem</h2>
    <div class="govuk-error-summary__body">
      <ul class="govuk-list govuk-error-summary__list"></ul>
    </div>`;
  form.insertBefore(summary, form.firstChild);
  return summary;
}

function showErrorSummary(form: HTMLFormElement, message: string): void {
  const summary = getOrCreateErrorSummary(form);
  const list = summary.querySelector<HTMLUListElement>('.govuk-error-summary__list');
  if (!list) {
    return;
  }
  list.innerHTML = '';
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = '#documents';
  a.textContent = message;
  li.appendChild(a);
  list.appendChild(li);
  summary.hidden = false;
}

function clearErrorSummary(form: HTMLFormElement): void {
  const summary = form.querySelector<HTMLDivElement>('.govuk-error-summary');
  if (!summary) {
    return;
  }
  const list = summary.querySelector<HTMLUListElement>('.govuk-error-summary__list');
  if (list) {
    list.innerHTML = '';
  }
  summary.hidden = true;
}

function hasVisibleError(container: HTMLElement): boolean {
  const form = container.closest('form');
  if (!form) {
    return false;
  }
  const summary = form.querySelector<HTMLDivElement>('.govuk-error-summary');
  return !!summary && !summary.hidden;
}

function installCsrfInterceptor(): void {
  const needsCsrf = new WeakSet<XMLHttpRequest>();

  const originalOpen = XMLHttpRequest.prototype.open as (method: string, url: string | URL, ...rest: unknown[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (XMLHttpRequest.prototype as any).open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const urlStr = String(url);
    if (urlStr.includes('/upload') || urlStr.includes('/delete')) {
      needsCsrf.add(this);
    }
    return originalOpen.call(this, method, url, ...rest);
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    if (needsCsrf.has(this)) {
      this.setRequestHeader('x-csrf-token', getCsrfToken());
      needsCsrf.delete(this);
    }
    return originalSend.call(this, body);
  };
}

function initContainer(container: HTMLElement): void {
  const uploadUrl = container.dataset.uploadUrl;
  const deleteUrl = container.dataset.deleteUrl;
  if (!uploadUrl || !deleteUrl) {
    return;
  }

  const form = container.closest<HTMLFormElement>('form');
  if (!form) {
    return;
  }

  const hiddenContainer = document.getElementById('uploaded-documents-container');
  if (!hiddenContainer) {
    return;
  }

  const maxFileSizeMb = parseInt(container.dataset.maxFileSizeMb || '1024', 10);
  const maxBytes = maxFileSizeMb * 1024 * 1024;
  const wrongTypeMessage = container.dataset.errorWrongType || '';
  const tooLargeMessage = container.dataset.errorFileTooLarge || '';
  const deleteFailedMessage = container.dataset.errorDelete || '';
  const deleteButtonText = container.dataset.deleteButtonText || 'Remove';

  new MultiFileUpload(container, {
    uploadUrl,
    deleteUrl,
    hooks: {
      entryHook: (_upload: InstanceType<typeof MultiFileUpload>, file: File) => {
        clearErrorSummary(form);
        if (isBlockedExtension(file.name)) {
          showErrorSummary(form, wrongTypeMessage);
          throw new Error('blocked');
        }
        if (file.size > maxBytes) {
          showErrorSummary(form, tooLargeMessage);
          throw new Error('too_large');
        }
      },

      exitHook: (_upload: InstanceType<typeof MultiFileUpload>, _file: File, xhr: XMLHttpRequest) => {
        clearErrorSummary(form);
        try {
          const response = typeof xhr.response === 'object' ? xhr.response : JSON.parse(xhr.responseText);
          const doc: DocumentMeta | undefined = response?.document;
          if (doc?.document_url) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'uploadedDocuments[]';
            input.value = JSON.stringify(doc);
            input.dataset.documentUrl = doc.document_url;
            hiddenContainer.appendChild(input);
          }
        } catch {
          // Response parsing failed; hidden input not created
        }

        // Clear any failed upload rows (MOJ keeps them in the list)
        container.querySelectorAll('.moj-multi-file-upload__row--error, .moj-multi-file-upload__error').forEach(el => {
          const row = el.closest('.moj-multi-file-upload__row');
          if (row) {
            row.remove();
          } else {
            el.remove();
          }
        });

        // MOJ component creates delete buttons with "Delete" text -- patch to match translation
        container.querySelectorAll<HTMLButtonElement>('.moj-multi-file-upload__delete').forEach(btn => {
          const hiddenSpan = btn.querySelector('.govuk-visually-hidden');
          const filename = hiddenSpan?.textContent || '';
          btn.textContent = '';
          btn.appendChild(document.createTextNode(deleteButtonText + ' '));
          if (filename) {
            const span = document.createElement('span');
            span.className = 'govuk-visually-hidden';
            span.textContent = filename;
            btn.appendChild(span);
          }
        });
      },

      errorHook: (_upload: InstanceType<typeof MultiFileUpload>, _file: File, xhr: XMLHttpRequest) => {
        let message = wrongTypeMessage;
        try {
          const response = typeof xhr.response === 'object' ? xhr.response : JSON.parse(xhr.responseText);
          if (response?.error?.message) {
            message = response.error.message;
          }
        } catch {
          // Use default message
        }
        showErrorSummary(form, message);
      },

      deleteHook: (_upload: InstanceType<typeof MultiFileUpload>, _file: File | undefined, xhr: XMLHttpRequest) => {
        if (xhr.status >= 200 && xhr.status < 300) {
          clearErrorSummary(form);
          try {
            const response = typeof xhr.response === 'object' ? xhr.response : JSON.parse(xhr.responseText);
            const deletedUrl: string | undefined = response?.documentUrl;
            if (deletedUrl) {
              const input = hiddenContainer.querySelector<HTMLInputElement>(
                `input[data-document-url="${CSS.escape(deletedUrl)}"]`
              );
              if (input) {
                input.remove();
              }
            }
          } catch {
            // Cleanup failed; hidden input may remain
          }
        } else {
          showErrorSummary(form, deleteFailedMessage);
        }
      },
    },
  });

  form.addEventListener('submit', event => {
    if (!hasVisibleError(container)) {
      return;
    }
    event.preventDefault();
    const summary = form.querySelector<HTMLDivElement>('.govuk-error-summary');
    summary?.focus();
  });
}

export function initMultiFileUpload(): void {
  installCsrfInterceptor();
  document.querySelectorAll<HTMLElement>('[data-module="moj-multi-file-upload"]').forEach(initContainer);
}
