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

// MOJ multi-file-upload error pattern (https://design-patterns.service.justice.gov.uk/components/multi-file-upload/):
// - Page-level error summary at the top of the grid column / main, linking to the file input.
// - Inline govuk-error-message inside the input's form-group, with form-group--error and aria-describedby on the input.

function getPageAnchor(): HTMLElement {
  return (
    document.querySelector<HTMLElement>('.govuk-grid-column-two-thirds') ??
    document.querySelector<HTMLElement>('main') ??
    document.body
  );
}

function getFileInput(container: HTMLElement): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>('.moj-multi-file-upload__input');
}

function getOrCreateErrorSummary(title: string): HTMLDivElement {
  const anchor = getPageAnchor();
  let summary = anchor.querySelector<HTMLDivElement>(':scope > .govuk-error-summary');
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
  anchor.insertBefore(summary, anchor.firstChild);
  return summary;
}

function setInlineFieldError(container: HTMLElement, message: string): void {
  const fileInput = getFileInput(container);
  if (!fileInput) {
    return;
  }
  const formGroup = fileInput.closest<HTMLElement>('.govuk-form-group');
  if (!formGroup) {
    return;
  }

  formGroup.classList.add('govuk-form-group--error');
  const errorId = `${fileInput.id}-error`;
  let errorEl = formGroup.querySelector<HTMLParagraphElement>(`#${CSS.escape(errorId)}`);
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.id = errorId;
    errorEl.className = 'govuk-error-message';
    // Anchor inside the form-group, immediately before the dropzone (or input,
    // pre-MOJ-init). MOJ's setupDropzone() moves the input INTO a runtime-created
    // .moj-multi-file-upload__dropzone, so insertBefore(input) post-init would
    // put the error inside the dropzone box — wrong place visually. Insert
    // before the dropzone wrapper instead so the error sits between label and
    // dashed box, matching the MOJ design pattern.
    const anchor = formGroup.querySelector<HTMLElement>('.moj-multi-file-upload__dropzone') ?? fileInput;
    anchor.parentNode?.insertBefore(errorEl, anchor);
  }
  errorEl.innerHTML = '<span class="govuk-visually-hidden">Error:</span> ';
  errorEl.appendChild(document.createTextNode(message));

  const ids = (fileInput.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!ids.includes(errorId)) {
    ids.push(errorId);
    fileInput.setAttribute('aria-describedby', ids.join(' '));
  }
}

function clearInlineFieldError(container: HTMLElement): void {
  const fileInput = getFileInput(container);
  if (!fileInput) {
    return;
  }
  const formGroup = fileInput.closest<HTMLElement>('.govuk-form-group');
  if (!formGroup) {
    return;
  }
  formGroup.classList.remove('govuk-form-group--error');
  const errorId = `${fileInput.id}-error`;
  formGroup.querySelector(`#${CSS.escape(errorId)}`)?.remove();

  const ids = (fileInput.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== errorId);
  if (ids.length === 0) {
    fileInput.removeAttribute('aria-describedby');
  } else {
    fileInput.setAttribute('aria-describedby', ids.join(' '));
  }
}

function showErrorSummary(container: HTMLElement, message: string, title = 'There is a problem'): void {
  const summary = getOrCreateErrorSummary(title);
  const list = summary.querySelector<HTMLUListElement>('.govuk-error-summary__list');
  if (list) {
    list.innerHTML = '';
    const li = document.createElement('li');
    const a = document.createElement('a');
    const fileInput = getFileInput(container);
    a.href = fileInput ? `#${fileInput.id}` : '#';
    a.textContent = message;
    li.appendChild(a);
    list.appendChild(li);
  }
  summary.hidden = false;
  setInlineFieldError(container, message);
}

function clearErrorSummary(container: HTMLElement): void {
  const anchor = getPageAnchor();
  const summary = anchor.querySelector<HTMLDivElement>(':scope > .govuk-error-summary');
  if (summary) {
    const list = summary.querySelector<HTMLUListElement>('.govuk-error-summary__list');
    if (list) {
      list.innerHTML = '';
    }
    summary.hidden = true;
  }
  clearInlineFieldError(container);
}

function removeFailedRows(container: HTMLElement): void {
  container.querySelectorAll('.moj-multi-file-upload__row--error, .moj-multi-file-upload__error').forEach(el => {
    const row = el.closest('.moj-multi-file-upload__row');
    (row ?? el).remove();
  });
}

function hasVisibleError(container: HTMLElement): boolean {
  const fileInput = getFileInput(container);
  const formGroup = fileInput?.closest<HTMLElement>('.govuk-form-group');
  if (formGroup?.classList.contains('govuk-form-group--error')) {
    return true;
  }
  const summary = getPageAnchor().querySelector<HTMLDivElement>(':scope > .govuk-error-summary');
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

  const instance = new MultiFileUpload(container, {
    uploadUrl,
    deleteUrl,
    hooks: {
      entryHook: (_upload: InstanceType<typeof MultiFileUpload>, file: File) => {
        clearErrorSummary(container);
        // Mirror server's validateFileType precedence:
        //   1. blocked media (AC04)         → wrong-type message
        //   2. extension not in allowlist   → wrong-type message
        //   3. file too large               → too-large message
        // Pre-flight here saves the round-trip; server still validates as defence in depth.
        if (isBlockedExtension(file.name)) {
          showErrorSummary(container, wrongTypeMessage, errorSummaryTitle);
          throw new Error('blocked');
        }
        if (!isAllowedExtension(file.name)) {
          showErrorSummary(container, wrongTypeMessage, errorSummaryTitle);
          throw new Error('invalid_type');
        }
        if (file.size > maxBytes) {
          showErrorSummary(container, tooLargeMessage, errorSummaryTitle);
          throw new Error('too_large');
        }
      },

      exitHook: (_upload: InstanceType<typeof MultiFileUpload>, _file: File, xhr: XMLHttpRequest) => {
        clearErrorSummary(container);
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
        removeFailedRows(container);

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
        // Per AC04/AC05: show the error-summary banner only for AC-defined messages
        // returned by the server (wrongType / tooLarge as structured JSON).
        // Non-AC failures (abort, network drop, CDAM unreachable, 5xx) leave the MOJ
        // row-level "Upload failed" indicator as the sole signal — no misleading banner.
        try {
          const response = typeof xhr.response === 'object' ? xhr.response : JSON.parse(xhr.responseText);
          if (response?.error?.message) {
            showErrorSummary(container, response.error.message, errorSummaryTitle);
            removeFailedRows(container);
          }
        } catch {
          // No structured server message — leave the row-level "Upload failed" alone
        }
      },

      deleteHook: (_upload: InstanceType<typeof MultiFileUpload>, _file: File | undefined, xhr: XMLHttpRequest) => {
        if (xhr.status === 409) {
          // Stale index — another delete already shifted the list. Reload so
          // the page rebuilds from the current draft state and the user can retry.
          window.location.reload();
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          clearErrorSummary(container);
          try {
            const response = typeof xhr.response === 'object' ? xhr.response : JSON.parse(xhr.responseText);
            if (response?.success) {
              rebuildHiddenInputs(hiddenContainer, container);
            }
          } catch {
            // Cleanup failed
          }
        } else {
          showErrorSummary(container, deleteFailedMessage, errorSummaryTitle);
        }
      },
    },
  });
  uploadInstances.set(container, instance);

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
