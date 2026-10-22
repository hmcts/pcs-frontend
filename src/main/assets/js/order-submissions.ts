import { ErrorSummary } from 'govuk-frontend';

type ValidationError = { id: string; message: string };

/** Update only the errors: the form, editor, hints and other page components stay mounted. */
function showErrors(form: HTMLFormElement, errors: ValidationError[], reloadUrl?: string): void {
  document.querySelector('.govuk-error-summary')?.remove();
  const oldErrors = Array.from(form.querySelectorAll<HTMLElement>('.govuk-error-message[id$="-error"]'));
  const oldIds = new Set(oldErrors.map(error => error.id));
  oldErrors.forEach(error => error.remove());
  form.querySelectorAll('.govuk-form-group--error').forEach(group => group.classList.remove('govuk-form-group--error'));
  form.querySelectorAll('[aria-describedby]').forEach(field => {
    const hints = field
      .getAttribute('aria-describedby')!
      .split(' ')
      .filter(id => !oldIds.has(id));
    if (hints.length) {
      field.setAttribute('aria-describedby', hints.join(' '));
    } else {
      field.removeAttribute('aria-describedby');
    }
  });
  form.querySelectorAll('.govuk-input--error, .govuk-select--error, .govuk-textarea--error').forEach(field => {
    field.classList.remove('govuk-input--error', 'govuk-select--error', 'govuk-textarea--error');
  });
  const summary = document.createElement('div');
  summary.className = 'govuk-error-summary';
  summary.dataset.module = 'govuk-error-summary';
  summary.innerHTML =
    '<div role="alert"><h2 class="govuk-error-summary__title">There is a problem</h2><div class="govuk-error-summary__body"><ul class="govuk-list govuk-error-summary__list"></ul></div></div>';
  const list = summary.querySelector('ul')!;
  for (const { id, message } of errors) {
    const target = document.getElementById(id);
    const item = document.createElement('li');
    const link = document.createElement(target && target !== form && form.contains(target) ? 'a' : 'span');
    link.textContent = message;
    if (link instanceof HTMLAnchorElement && target) {
      link.href = `#${id}`;
      link.addEventListener('click', () => {
        target.closest('[data-case-facts]')?.querySelector<HTMLButtonElement>('[aria-expanded="false"]')?.click();
        const panel = target.closest('.govuk-tabs__panel');
        if (panel) {
          document.querySelector<HTMLAnchorElement>(`[href="#${panel.id}"]`)?.click();
        }
      });
      const group = target.closest<HTMLElement>('[data-attendance-row], .govuk-form-group');
      if (group) {
        const error = document.createElement('p');
        error.className = 'govuk-error-message';
        error.id = `${id}-error`;
        error.innerHTML = '<span class="govuk-visually-hidden">Error:</span> ';
        error.append(message);
        group.classList.add('govuk-form-group--error');
        const host = group.querySelector('[data-attendance-controls], fieldset') ?? group;
        const legend = host.querySelector('legend');
        if (legend) {
          legend.after(error);
        } else {
          host.prepend(error);
        }
        host.querySelectorAll('input.govuk-input, select.govuk-select, textarea.govuk-textarea').forEach(field => {
          field.classList.add(`govuk-${field.tagName.toLowerCase()}--error`);
        });
        const field = group.querySelector('fieldset') ?? target;
        field.setAttribute('aria-describedby', `${field.getAttribute('aria-describedby') ?? ''} ${error.id}`.trim());
      }
    }
    item.append(link);
    list.append(item);
  }
  if (reloadUrl) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = reloadUrl;
    link.textContent = 'Reload the latest details (discards unsaved changes)';
    item.append(link);
    list.append(item);
  }
  form.closest('main')!.prepend(summary);
  new ErrorSummary(summary);
}

/** Order documents travel as JSON rather than JSON embedded in URL-encoded form fields. */
export function initOrderSubmissions(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-order-json]').forEach(form => {
    let submitting = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submitting) {
        return;
      }
      submitting = true;
      const buttons = Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"]:not(:disabled)'));
      try {
        const fields = new FormData(form);
        const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.name) {
          fields.append(submitter.name, submitter.value);
        }
        const body = Object.fromEntries(
          Array.from(new Set(fields.keys()), name => {
            const values = fields.getAll(name).map(String);
            return [name, values.length === 1 ? values[0] : values];
          })
        );
        buttons.forEach(button => (button.disabled = true));
        const response = await fetch(form.getAttribute('action') || window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          redirect: 'error',
        });
        const result = await response.json();
        if (response.ok && result.redirectUrl) {
          const target = new URL(result.redirectUrl, window.location.href);
          const samePage =
            target.origin === window.location.origin &&
            target.pathname === window.location.pathname &&
            target.search === window.location.search;
          window.location.assign(target.href);
          // Add/remove review dates need a fresh GET even when only the fragment changes.
          if (samePage) {
            window.location.reload();
          }
          return;
        }
        if ([400, 409, 422].includes(response.status) && Array.isArray(result.errors) && result.errors.length) {
          showErrors(form, result.errors, result.reloadUrl);
          // A stale event cannot be saved again until the user reloads its current version.
          if (result.reloadUrl) {
            return;
          }
        } else {
          throw new Error('Unexpected order response');
        }
      } catch {
        showErrors(form, [
          {
            id: form.id,
            message:
              'We could not confirm your submission. Check your connection and sign-in before trying again. Your answers are still on this page.',
          },
        ]);
      }
      submitting = false;
      buttons.forEach(button => (button.disabled = false));
    });
  });
}
