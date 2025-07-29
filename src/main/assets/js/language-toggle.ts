export function initLanguageToggle(): void {
  document.querySelectorAll('.language-toggle').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const lang = (this as HTMLElement).getAttribute('data-lang');
      const form = document.querySelector('form');

      if (!lang) {
        return;
      }

      if (!form) {
        window.location.href = `${window.location.pathname}?lang=${encodeURIComponent(lang)}`;
        return;
      }

      form.querySelectorAll('input[name="action"], input[name="nextLang"]').forEach(el => el.remove());

      const actionInput = document.createElement('input');
      actionInput.type = 'hidden';
      actionInput.name = 'action';
      actionInput.value = 'save-and-switch-lang';
      form.appendChild(actionInput);

      const langInput = document.createElement('input');
      langInput.type = 'hidden';
      langInput.name = 'nextLang';
      langInput.value = lang;
      form.appendChild(langInput);

      form.submit();
    });
  });
}
