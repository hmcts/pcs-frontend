import { isBlockedExtension } from '@utils/documentUploadValidation';

const GENERIC_UPLOAD_FAILED_MESSAGE = 'The selected file could not be uploaded – try again';
const GENERIC_DELETE_FAILED_MESSAGE = 'The file could not be removed – try again';

interface UploadedDocument {
  document_url: string;
  document_binary_url: string;
  document_filename: string;
  content_type?: string;
  size?: number;
}

interface UploadResponse {
  success: boolean;
  document?: UploadedDocument;
  error?: string;
  message?: string;
}

function getCsrfToken(): string {
  const input = document.querySelector<HTMLInputElement>('input[name="_csrf"]');
  return input?.value || '';
}

function createFileRow(doc: UploadedDocument, deleteButtonText: string): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'govuk-summary-list__row moj-multi-file-upload__row';
  row.dataset.documentUrl = doc.document_url;

  const dt = document.createElement('dt');
  dt.className = 'govuk-summary-list__key moj-multi-file-upload__filename';
  dt.textContent = doc.document_filename;

  const dd = document.createElement('dd');
  dd.className = 'govuk-summary-list__actions moj-multi-file-upload__actions';

  const deleteLink = document.createElement('a');
  deleteLink.className = 'govuk-link moj-multi-file-upload__delete';
  deleteLink.href = '#';

  const hiddenSpan = document.createElement('span');
  hiddenSpan.className = 'govuk-visually-hidden';
  hiddenSpan.textContent = ` ${doc.document_filename}`;

  deleteLink.textContent = deleteButtonText;
  deleteLink.appendChild(hiddenSpan);
  dd.appendChild(deleteLink);

  row.appendChild(dt);
  row.appendChild(dd);

  return row;
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
  summary.setAttribute('aria-labelledby', 'upload-document-error-summary-title');
  summary.innerHTML = `
    <h2 class="govuk-error-summary__title" id="upload-document-error-summary-title">There is a problem</h2>
    <div class="govuk-error-summary__body">
      <ul class="govuk-list govuk-error-summary__list"></ul>
    </div>
  `;
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

function hasVisibleUploadError(container: HTMLElement): boolean {
  const errorEl = container.querySelector<HTMLParagraphElement>('.moj-multi-file-upload__error');
  if (!errorEl || errorEl.hidden) {
    return false;
  }
  return (errorEl.textContent || '').trim().length > 0;
}

function createHiddenInput(doc: UploadedDocument): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'uploadedDocuments[]';
  input.value = JSON.stringify(doc);
  input.dataset.documentUrl = doc.document_url;
  return input;
}

function showUploadError(container: HTMLElement, message: string): void {
  let errorEl = container.querySelector<HTMLParagraphElement>('.moj-multi-file-upload__error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'govuk-error-message moj-multi-file-upload__error';
    const uploadSection = container.querySelector('.moj-multi-file-upload__upload');
    if (uploadSection) {
      uploadSection.insertBefore(errorEl, uploadSection.firstChild);
    }
  }
  errorEl.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${message}`;
  errorEl.hidden = false;
}

function clearUploadError(container: HTMLElement): void {
  const errorEl = container.querySelector<HTMLParagraphElement>('.moj-multi-file-upload__error');
  if (errorEl) {
    errorEl.hidden = true;
  }
}

function updateFilesAddedVisibility(container: HTMLElement): void {
  const filesSection = container.querySelector<HTMLDivElement>('.moj-multi-file__uploaded-files');
  const fileList = container.querySelector<HTMLDListElement>('.moj-multi-file-upload__list');
  if (filesSection && fileList) {
    const hasFiles = fileList.querySelectorAll('.moj-multi-file-upload__row').length > 0;
    filesSection.classList.toggle('moj-hidden', !hasFiles);
  }
}

function setButtonLoading(button: HTMLButtonElement, loading: boolean): void {
  button.disabled = loading;
  if (loading) {
    button.setAttribute('aria-busy', 'true');
  } else {
    button.removeAttribute('aria-busy');
  }
}

async function uploadFile(uploadUrl: string, file: File, csrfToken: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('documents', file);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
    headers: {
      'x-csrf-token': csrfToken,
    },
  });

  let body: UploadResponse = { success: false };
  try {
    body = (await response.json()) as UploadResponse;
  } catch {
    body = { success: false, message: GENERIC_UPLOAD_FAILED_MESSAGE };
  }

  if (!response.ok) {
    return {
      success: false,
      error: body.error,
      message: body.message || GENERIC_UPLOAD_FAILED_MESSAGE,
    };
  }

  return body;
}

async function deleteFile(deleteUrl: string, documentUrl: string, csrfToken: string): Promise<{ success: boolean }> {
  const response = await fetch(deleteUrl, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ documentUrl }),
  });

  try {
    return (await response.json()) as { success: boolean };
  } catch {
    return { success: false };
  }
}

function initContainer(container: HTMLElement): void {
  const uploadUrl = container.dataset.uploadUrl;
  const deleteUrl = container.dataset.deleteUrl;

  if (!uploadUrl || !deleteUrl) {
    return;
  }

  const fileInput = container.querySelector<HTMLInputElement>('.moj-multi-file-upload__input');
  const uploadButton = container.querySelector<HTMLButtonElement>('.moj-multi-file-upload__button');
  const fileList = container.querySelector<HTMLDListElement>('.moj-multi-file-upload__list');
  const hiddenContainer = document.getElementById('uploaded-documents-container');

  if (!fileInput || !uploadButton || !fileList || !hiddenContainer) {
    return;
  }
  const form = container.closest('form');
  if (!form) {
    return;
  }

  const maxFileSizeMb = parseInt(container.dataset.maxFileSizeMb || '1024', 10);
  const wrongTypeMessage = container.dataset.errorWrongType || '';
  const tooLargeMessage = container.dataset.errorFileTooLarge || '';
  const deleteFailedMessage = container.dataset.errorDelete || '';

  const deleteButtonText =
    container.closest('form')?.querySelector<HTMLElement>('[data-delete-text]')?.dataset.deleteText || 'Remove';

  const getDeleteText = (): string => {
    const existingDeleteLink = fileList.querySelector<HTMLAnchorElement>('.moj-multi-file-upload__delete');
    if (existingDeleteLink) {
      return existingDeleteLink.childNodes[0]?.textContent?.trim() || deleteButtonText;
    }
    return deleteButtonText;
  };

  const maxBytes = maxFileSizeMb * 1024 * 1024;

  uploadButton.addEventListener('click', async () => {
    const files = fileInput.files;
    if (!files || files.length === 0) {
      return;
    }

    clearUploadError(container);
    clearErrorSummary(form);
    setButtonLoading(uploadButton, true);

    const csrfToken = getCsrfToken();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (isBlockedExtension(file.name)) {
        showUploadError(container, wrongTypeMessage);
        showErrorSummary(form, wrongTypeMessage);
        continue;
      }

      if (file.size > maxBytes) {
        showUploadError(container, tooLargeMessage);
        showErrorSummary(form, tooLargeMessage);
        continue;
      }

      try {
        const result = await uploadFile(uploadUrl, file, csrfToken);

        if (result.success && result.document) {
          clearUploadError(container);
          clearErrorSummary(form);
          const documentWithFilename: UploadedDocument = {
            ...result.document,
            // Fallback for non-CDAM/stub environments that return URLs without filename
            document_filename: result.document.document_filename || file.name,
          };
          const row = createFileRow(documentWithFilename, getDeleteText());
          fileList.appendChild(row);

          const hiddenInput = createHiddenInput(documentWithFilename);
          hiddenContainer.appendChild(hiddenInput);

          updateFilesAddedVisibility(container);
        } else {
          const message = result.message || wrongTypeMessage;
          showUploadError(container, message);
          showErrorSummary(form, message);
        }
      } catch {
        showUploadError(container, wrongTypeMessage);
        showErrorSummary(form, wrongTypeMessage);
      }
    }

    fileInput.value = '';
    setButtonLoading(uploadButton, false);
  });

  fileList.addEventListener('click', async (event: Event) => {
    const target = event.target as HTMLElement;
    const deleteLink = target.closest<HTMLAnchorElement>('.moj-multi-file-upload__delete');
    if (!deleteLink) {
      return;
    }

    event.preventDefault();

    const row = deleteLink.closest<HTMLDivElement>('.moj-multi-file-upload__row');
    if (!row) {
      return;
    }

    const documentUrl = row.dataset.documentUrl;
    if (!documentUrl) {
      return;
    }

    const csrfToken = getCsrfToken();

    try {
      const result = await deleteFile(deleteUrl, documentUrl, csrfToken);
      if (result.success) {
        clearUploadError(container);
        clearErrorSummary(form);
        row.remove();

        const hiddenInput = hiddenContainer.querySelector<HTMLInputElement>(
          `input[data-document-url="${CSS.escape(documentUrl)}"]`
        );
        if (hiddenInput) {
          hiddenInput.remove();
        }

        updateFilesAddedVisibility(container);
      } else {
        const message = deleteFailedMessage || GENERIC_DELETE_FAILED_MESSAGE;
        showUploadError(container, message);
        showErrorSummary(form, message);
      }
    } catch {
      const message = deleteFailedMessage || GENERIC_DELETE_FAILED_MESSAGE;
      showUploadError(container, message);
      showErrorSummary(form, message);
    }
  });

  // Prevent continue/save while an upload error is visible.
  form.addEventListener('submit', event => {
    if (!hasVisibleUploadError(container)) {
      return;
    }
    event.preventDefault();
    const errorText = (container.querySelector('.moj-multi-file-upload__error')?.textContent || '')
      .replace('Error:', '')
      .trim();
    if (errorText) {
      showErrorSummary(form, errorText);
    }
    const summary = form.querySelector<HTMLDivElement>('.govuk-error-summary');
    summary?.focus();
  });
}

export function initMultiFileUpload(): void {
  const containers = document.querySelectorAll<HTMLElement>('[data-module="moj-multi-file-upload"]');
  containers.forEach(initContainer);
}
