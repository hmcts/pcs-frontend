import { MultiFileUpload } from '@ministryofjustice/frontend';

import { isAllowedExtension, isBlockedExtension } from '@utils/fileExtensionValidation';

const uploadInstances = new WeakMap<HTMLElement, MultiFileUpload>();

interface DisplayDocument {
  index: number;
  document_filename: string;
  content_type?: string;
  size?: number;
}

function getCsrfToken(): string {
  return document.querySelector<HTMLInputElement>('input[name="_csrf"]')?.value || '';
}

function getOrCreateErrorSummary(form: HTMLFormElement, title: string): HTMLDivElement {
  let summary = form.querySelector<HTMLDivElement>('.govuk-error-summary');
  if (summary) {
    return summary;
  }

  summary = document.createElement('div');
  summary.className = 'govuk-error-summary';
  summary.dataset.module = 'govuk-error-summary';
  summary.setAttribute('role', 'alert');
  summary.setAttribute('tabindex', '-1');
  summary.setAttribute('aria-labelledby', 'upload-error-summary-title');
  summary.innerHTML = `
    <h2 class="govuk-error-summary__title" id="upload-error-summary-title">${title}</h2>
    <div class="govuk-error-summary__body">
      <ul class="govuk-list govuk-error-summary__list"></ul>
    </div>`;
  form.insertBefore(summary, form.firstChild);
  return summary;
}

function showErrorSummary(form: HTMLFormElement, message: string, title = 'There is a problem'): void {
  const summary = getOrCreateErrorSummary(form, title);
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

  const maxFileSizeMb = Number.parseInt(container.dataset.maxFileSizeMb || '1024', 10);
  const maxBytes = maxFileSizeMb * 1024 * 1024;
  const wrongTypeMessage = container.dataset.errorWrongType || '';
  const tooLargeMessage = container.dataset.errorFileTooLarge || '';
  const deleteFailedMessage = container.dataset.errorDelete || '';
  const errorSummaryTitle = container.dataset.errorSummaryTitle || 'There is a problem';
  const deleteButtonText = container.dataset.deleteButtonText || 'Remove';

  // Serialization queue — MOJ's uploadFiles fires uploads in parallel which causes
  // a lost-update race on the server (read-modify-write of defendantDocuments).
  // We resolve a per-file promise when exitHook/errorHook fires so we can await
  // each upload before starting the next.
  const fileCompletionResolvers = new Map<File, () => void>();
  const resolveFileCompletion = (file: File): void => {
    const resolver = fileCompletionResolvers.get(file);
    if (resolver) {
      fileCompletionResolvers.delete(file);
      resolver();
    }
  };

  const instance = new MultiFileUpload(container, {
    uploadUrl,
    deleteUrl,
    hooks: {
      entryHook: (_upload: InstanceType<typeof MultiFileUpload>, file: File) => {
        clearErrorSummary(form);
        // Mirror server's validateFileType precedence:
        //   1. blocked media (AC04)         → wrong-type message
        //   2. extension not in allowlist   → wrong-type message
        //   3. file too large               → too-large message
        // Pre-flight here saves the round-trip; server still validates as defence in depth.
        if (isBlockedExtension(file.name)) {
          showErrorSummary(form, wrongTypeMessage, errorSummaryTitle);
          throw new Error('blocked');
        }
        if (!isAllowedExtension(file.name)) {
          showErrorSummary(form, wrongTypeMessage, errorSummaryTitle);
          throw new Error('invalid_type');
        }
        if (file.size > maxBytes) {
          showErrorSummary(form, tooLargeMessage, errorSummaryTitle);
          throw new Error('too_large');
        }
      },

      exitHook: (_upload: InstanceType<typeof MultiFileUpload>, file: File, xhr: XMLHttpRequest) => {
        clearErrorSummary(form);
        resolveFileCompletion(file);
        try {
          const response = typeof xhr.response === 'object' ? xhr.response : JSON.parse(xhr.responseText);
          const doc: DisplayDocument | undefined = response?.document;
          if (doc && typeof doc.index === 'number') {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'uploadedDocuments[]';
            input.value = JSON.stringify(doc);
            input.dataset.documentIndex = String(doc.index);
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

      errorHook: (_upload: InstanceType<typeof MultiFileUpload>, file: File, xhr: XMLHttpRequest) => {
        resolveFileCompletion(file);
        // Per AC04/AC05: show the error-summary banner only for AC-defined messages
        // returned by the server (wrongType / tooLarge as structured JSON).
        // Non-AC failures (abort, network drop, CDAM unreachable, 5xx) leave the MOJ
        // row-level "Upload failed" indicator as the sole signal — no misleading banner.
        try {
          const response = typeof xhr.response === 'object' ? xhr.response : JSON.parse(xhr.responseText);
          if (response?.error?.message) {
            showErrorSummary(form, response.error.message, errorSummaryTitle);
          }
        } catch {
          // No structured server message — leave the row-level "Upload failed" alone
        }
      },

      deleteHook: (_upload: InstanceType<typeof MultiFileUpload>, _file: File | undefined, xhr: XMLHttpRequest) => {
        if (xhr.status >= 200 && xhr.status < 300) {
          clearErrorSummary(form);
          // Remove hidden input by index - reindex remaining inputs
          try {
            const response = typeof xhr.response === 'object' ? xhr.response : JSON.parse(xhr.responseText);
            if (response?.success) {
              // Rebuild hidden inputs from remaining file rows
              rebuildHiddenInputs(hiddenContainer, container);
            }
          } catch {
            // Cleanup failed
          }
        } else {
          showErrorSummary(form, deleteFailedMessage, errorSummaryTitle);
        }
      },
    },
  });
  uploadInstances.set(container, instance);

  // Serialize uploads — MOJ's default uploadFiles is parallel, which causes a
  // lost-update race on defendantDocuments. A single global promise chain ensures
  // every file (whether part of the same selection or added mid-upload) waits for
  // the previous file's completion before starting. exitHook/errorHook resolve the
  // per-file promise via fileCompletionResolvers; entryHook may throw before XHR
  // fires — catch and resolve so the queue moves on.
  // MOJ's TypeScript declarations don't expose uploadFile/uploadFiles publicly,
  // but they exist on the runtime class — cast via the runtime instance.
  const mojInstance = instance as unknown as {
    uploadFile?: (file: File) => void;
    uploadFiles?: (files: FileList | File[]) => void | Promise<void>;
  };
  if (typeof mojInstance.uploadFile === 'function') {
    const originalUploadFile = mojInstance.uploadFile.bind(mojInstance);
    let uploadQueue: Promise<unknown> = Promise.resolve();
    mojInstance.uploadFiles = function (files: FileList | File[]): Promise<void> {
      uploadQueue = uploadQueue.then(async () => {
        for (const file of Array.from(files)) {
          await new Promise<void>(resolve => {
            fileCompletionResolvers.set(file, resolve);
            try {
              originalUploadFile(file);
            } catch {
              resolveFileCompletion(file);
            }
          });
        }
      });
      return uploadQueue as Promise<void>;
    };
  }

  // MOJ injects a <label for="documents"> styled as a button inside the dropzone. A label
  // with no matching control (or with a duplicate for= reference) triggers WAVE "Orphaned
  // form label". Replace the element with a real <button> so semantics are correct and no
  // label rule fires. MOJ replaces the <input> with a clone after every upload, so the
  // click handler uses a live querySelector rather than a cached reference.
  const dropzone = container.querySelector('.moj-multi-file-upload__dropzone');
  const duplicateLabel = dropzone?.querySelector<HTMLLabelElement>('label.govuk-button--secondary');
  if (duplicateLabel) {
    const chooseFilesButton = document.createElement('button');
    chooseFilesButton.type = 'button';
    chooseFilesButton.className = duplicateLabel.className;
    chooseFilesButton.textContent = duplicateLabel.textContent?.trim() || 'Choose files';
    chooseFilesButton.addEventListener('click', event => {
      event.preventDefault();
      container.querySelector<HTMLInputElement>('.moj-multi-file-upload__input')?.click();
    });
    duplicateLabel.replaceWith(chooseFilesButton);
  }

  form.addEventListener('submit', event => {
    if (!hasVisibleError(container)) {
      return;
    }
    event.preventDefault();
    const summary = form.querySelector<HTMLDivElement>('.govuk-error-summary');
    summary?.focus();
  });
}

function rebuildHiddenInputs(hiddenContainer: HTMLElement, uploadContainer: HTMLElement): void {
  // Remove all existing hidden inputs
  hiddenContainer.querySelectorAll<HTMLInputElement>('input[name="uploadedDocuments[]"]').forEach(input => {
    input.remove();
  });

  // Rebuild from remaining file rows in the MOJ component
  const rows = uploadContainer.querySelectorAll('.moj-multi-file-upload__row:not(.moj-multi-file-upload__row--error)');
  rows.forEach((row, index) => {
    const filenameEl = row.querySelector('.moj-multi-file-upload__filename');
    if (filenameEl) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'uploadedDocuments[]';
      input.value = JSON.stringify({ index, document_filename: filenameEl.textContent?.trim() || '' });
      input.dataset.documentIndex = String(index);
      hiddenContainer.appendChild(input);
    }
  });
}

export function initMultiFileUpload(): void {
  const containers = document.querySelectorAll<HTMLElement>('[data-module="moj-multi-file-upload"]');
  if (containers.length === 0) {
    return;
  }
  installCsrfInterceptor();
  containers.forEach(initContainer);
}
