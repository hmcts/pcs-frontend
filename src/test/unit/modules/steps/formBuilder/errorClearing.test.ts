/**
 * @jest-environment jsdom
 */

import { initFormErrorClearing } from '../../../../../main/modules/steps/formBuilder/errorClearing';

describe('Form Error Clearing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('initFormErrorClearing', () => {
    it('should clear error when user types valid content in text input with error clearing enabled', () => {
      document.body.innerHTML = `
        <div class="govuk-form-group govuk-form-group--error">
          <label class="govuk-label" for="test-field">Test Field</label>
          <p class="govuk-error-message">
            <span class="govuk-visually-hidden">Error:</span> Enter a value
          </p>
          <input class="govuk-input govuk-input--error" id="test-field" type="text" value="" data-enable-error-clearing="true">
        </div>
      `;

      initFormErrorClearing();

      const input = document.getElementById('test-field') as HTMLInputElement;
      const formGroup = input.closest('.govuk-form-group');
      const errorMessage = formGroup?.querySelector('.govuk-error-message');

      expect(formGroup?.classList.contains('govuk-form-group--error')).toBe(true);
      expect(errorMessage).not.toBeNull();

      input.value = 'valid content';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(formGroup?.classList.contains('govuk-form-group--error')).toBe(false);
      expect(formGroup?.querySelector('.govuk-error-message')).toBeNull();
      expect(input.classList.contains('govuk-input--error')).toBe(false);
    });

    it('should NOT clear error when field does not have error clearing enabled', () => {
      document.body.innerHTML = `
        <div class="govuk-form-group govuk-form-group--error">
          <label class="govuk-label" for="test-field">Test Field</label>
          <p class="govuk-error-message">
            <span class="govuk-visually-hidden">Error:</span> Enter a value
          </p>
          <input class="govuk-input govuk-input--error" id="test-field" type="text" value="">
        </div>
      `;

      initFormErrorClearing();

      const input = document.getElementById('test-field') as HTMLInputElement;
      const formGroup = input.closest('.govuk-form-group');

      input.value = 'valid content';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Error should still be present because error clearing is not enabled
      expect(formGroup?.classList.contains('govuk-form-group--error')).toBe(true);
      expect(formGroup?.querySelector('.govuk-error-message')).not.toBeNull();
    });

    it('should NOT clear error when user types only whitespace', () => {
      document.body.innerHTML = `
        <div class="govuk-form-group govuk-form-group--error">
          <label class="govuk-label" for="test-field">Test Field</label>
          <p class="govuk-error-message">
            <span class="govuk-visually-hidden">Error:</span> Enter a value
          </p>
          <input class="govuk-input govuk-input--error" id="test-field" type="text" value="" data-enable-error-clearing="true">
        </div>
      `;

      initFormErrorClearing();

      const input = document.getElementById('test-field') as HTMLInputElement;
      const formGroup = input.closest('.govuk-form-group');

      input.value = '   ';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(formGroup?.classList.contains('govuk-form-group--error')).toBe(true);
      expect(formGroup?.querySelector('.govuk-error-message')).not.toBeNull();
    });

    it('should clear error when user types valid content in textarea', () => {
      document.body.innerHTML = `
        <div class="govuk-form-group govuk-form-group--error">
          <label class="govuk-label" for="details">Details</label>
          <p class="govuk-error-message">
            <span class="govuk-visually-hidden">Error:</span> Enter the parts of the claim you do not agree with
          </p>
          <textarea class="govuk-textarea govuk-textarea--error" id="details" rows="5" data-enable-error-clearing="true"></textarea>
        </div>
      `;

      initFormErrorClearing();

      const textarea = document.getElementById('details') as HTMLTextAreaElement;
      const formGroup = textarea.closest('.govuk-form-group');

      textarea.value = 'I disagree with the claim amount';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      expect(formGroup?.classList.contains('govuk-form-group--error')).toBe(false);
      expect(formGroup?.querySelector('.govuk-error-message')).toBeNull();
      expect(textarea.classList.contains('govuk-textarea--error')).toBe(false);
    });

    it('should clear error from character count component', () => {
      document.body.innerHTML = `
        <div class="govuk-character-count govuk-character-count--error" data-module="govuk-character-count">
          <div class="govuk-form-group govuk-form-group--error">
            <label class="govuk-label" for="dispute-details">Dispute Details</label>
            <p class="govuk-error-message">
              <span class="govuk-visually-hidden">Error:</span> Enter the parts of the claim you do not agree with
            </p>
            <textarea class="govuk-textarea govuk-textarea--error" id="dispute-details" rows="5" data-enable-error-clearing="true"></textarea>
          </div>
        </div>
      `;

      initFormErrorClearing();

      const textarea = document.getElementById('dispute-details') as HTMLTextAreaElement;
      const formGroup = textarea.closest('.govuk-form-group');
      const characterCount = document.querySelector('.govuk-character-count');

      textarea.value = 'Valid dispute details';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      expect(formGroup?.classList.contains('govuk-form-group--error')).toBe(false);
      expect(characterCount?.classList.contains('govuk-character-count--error')).toBe(false);
    });

    it('should remove error from error summary when field error is cleared', () => {
      document.body.innerHTML = `
        <div class="govuk-error-summary">
          <h2 class="govuk-error-summary__title">There is a problem</h2>
          <div class="govuk-error-summary__body">
            <ul class="govuk-list govuk-error-summary__list">
              <li><a href="#test-field">Enter a value</a></li>
            </ul>
          </div>
        </div>
        <div class="govuk-form-group govuk-form-group--error">
          <label class="govuk-label" for="test-field">Test Field</label>
          <p class="govuk-error-message">
            <span class="govuk-visually-hidden">Error:</span> Enter a value
          </p>
          <input class="govuk-input govuk-input--error" id="test-field" type="text" value="" data-enable-error-clearing="true">
        </div>
      `;

      initFormErrorClearing();

      const input = document.getElementById('test-field') as HTMLInputElement;
      const errorSummary = document.querySelector('.govuk-error-summary');

      expect(errorSummary?.querySelector('a[href="#test-field"]')).not.toBeNull();

      input.value = 'valid content';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(errorSummary?.querySelector('a[href="#test-field"]')).toBeNull();
    });

    it('should remove entire error summary when last error is cleared', () => {
      document.body.innerHTML = `
        <div class="govuk-error-summary">
          <h2 class="govuk-error-summary__title">There is a problem</h2>
          <div class="govuk-error-summary__body">
            <ul class="govuk-list govuk-error-summary__list">
              <li><a href="#test-field">Enter a value</a></li>
            </ul>
          </div>
        </div>
        <div class="govuk-form-group govuk-form-group--error">
          <label class="govuk-label" for="test-field">Test Field</label>
          <p class="govuk-error-message">
            <span class="govuk-visually-hidden">Error:</span> Enter a value
          </p>
          <input class="govuk-input govuk-input--error" id="test-field" type="text" value="" data-enable-error-clearing="true">
        </div>
      `;

      initFormErrorClearing();

      const input = document.getElementById('test-field') as HTMLInputElement;

      expect(document.querySelector('.govuk-error-summary')).not.toBeNull();

      input.value = 'valid content';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(document.querySelector('.govuk-error-summary')).toBeNull();
    });

    it('should not remove error summary if other errors remain', () => {
      document.body.innerHTML = `
        <div class="govuk-error-summary">
          <h2 class="govuk-error-summary__title">There is a problem</h2>
          <div class="govuk-error-summary__body">
            <ul class="govuk-list govuk-error-summary__list">
              <li><a href="#field1">Enter field 1</a></li>
              <li><a href="#field2">Enter field 2</a></li>
            </ul>
          </div>
        </div>
        <div class="govuk-form-group govuk-form-group--error">
          <input class="govuk-input govuk-input--error" id="field1" type="text" value="" data-enable-error-clearing="true">
        </div>
        <div class="govuk-form-group govuk-form-group--error">
          <input class="govuk-input govuk-input--error" id="field2" type="text" value="">
        </div>
      `;

      initFormErrorClearing();

      const field1 = document.getElementById('field1') as HTMLInputElement;

      field1.value = 'valid content';
      field1.dispatchEvent(new Event('input', { bubbles: true }));

      expect(document.querySelector('.govuk-error-summary')).not.toBeNull();
      expect(document.querySelector('a[href="#field1"]')).toBeNull();
      expect(document.querySelector('a[href="#field2"]')).not.toBeNull();
    });

    it('should only clear error once per field', () => {
      document.body.innerHTML = `
        <div class="govuk-form-group govuk-form-group--error">
          <input class="govuk-input govuk-input--error" id="test-field" type="text" value="" data-enable-error-clearing="true">
        </div>
      `;

      initFormErrorClearing();

      const input = document.getElementById('test-field') as HTMLInputElement;
      const formGroup = input.closest('.govuk-form-group');

      input.value = 'valid';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(formGroup?.classList.contains('govuk-form-group--error')).toBe(false);

      formGroup?.classList.add('govuk-form-group--error');

      input.value = 'more valid content';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(formGroup?.classList.contains('govuk-form-group--error')).toBe(true);
    });

    it('should handle fields without errors gracefully', () => {
      document.body.innerHTML = `
        <div class="govuk-form-group">
          <input class="govuk-input" id="test-field" type="text" value="">
        </div>
      `;

      expect(() => initFormErrorClearing()).not.toThrow();
    });

    it('should handle empty document gracefully', () => {
      document.body.innerHTML = '';

      expect(() => initFormErrorClearing()).not.toThrow();
    });
  });
});
