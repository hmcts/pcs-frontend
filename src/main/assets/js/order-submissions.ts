/** Order pages send JSON so the WAF does not mistake a document inside a form value for SQL. */
export function initOrderSubmissions(beforeReplace: () => void = () => {}): void {
  document.querySelectorAll<HTMLFormElement>('form[data-order-json]').forEach(form => {
    let submitting = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submitting) {
        return;
      }
      submitting = true;
      const buttons = Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"]'));
      const enabledButtons = buttons.filter(button => !button.disabled);
      try {
        const fields = new FormData(form);
        const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.name) {
          fields.append(submitter.name, submitter.value);
        }
        const body: Record<string, string | string[]> = {};
        // Checkbox groups have repeated names; Object.fromEntries would silently discard selections.
        for (const name of new Set(fields.keys())) {
          const values = fields.getAll(name).map(String);
          body[name] = values.length === 1 ? values[0] : values;
        }
        enabledButtons.forEach(button => (button.disabled = true));
        const response = await fetch(form.getAttribute('action') || window.location.href, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          redirect: 'error',
        });
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const { redirectUrl } = await response.json();
          if (typeof redirectUrl === 'string' && redirectUrl) {
            const target = new URL(redirectUrl, window.location.href);
            const samePage =
              target.origin === window.location.origin &&
              target.pathname === window.location.pathname &&
              target.search === window.location.search;
            window.location.assign(redirectUrl);
            // Adding a review date redirects to this page with a fragment. Fetch has changed the
            // session, so a fragment-only navigation must also reload the newly rendered fields.
            if (samePage) {
              window.location.reload();
            }
            return;
          }
        }
        // Reuse the server's validation/conflict page and its normal scripts, including the editor.
        if ([400, 409, 422].includes(response.status) && response.headers.get('content-type')?.includes('text/html')) {
          const html = await response.text();
          if (new DOMParser().parseFromString(html, 'text/html').querySelector('form[data-order-json]')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            beforeReplace();
            document.open();
            document.write(html);
            document.close();
            return;
          }
        }
        throw new Error('Order submission failed');
      } catch {
        // Keep the answers and edited document when the connection, session or gateway fails.
        let message = form.querySelector<HTMLElement>('[data-order-submit-error]');
        if (!message) {
          message = document.createElement('p');
          message.dataset.orderSubmitError = '';
          message.className = 'govuk-error-message';
          message.setAttribute('role', 'alert');
          message.tabIndex = -1;
          form.prepend(message);
        }
        message.textContent =
          'We could not confirm your submission. Your answers are still on this page. Check your connection and sign-in before trying again.';
        message.focus();
        submitting = false;
        enabledButtons.forEach(button => (button.disabled = false));
      }
    });
  });
}
