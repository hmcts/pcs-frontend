/**
 * Form Error Clearing Module
 * Implements real-time error clearing when users start correcting invalid inputs
 * Follows GDS pattern for better user experience
 */

/**
 * Checks if a value is considered empty/invalid (whitespace-only)
 */
function isValueEmpty(value: string): boolean {
  return !value || value.trim() === '';
}

/**
 * Removes error styling and messages from a form group
 */
function clearFieldError(formGroup: HTMLElement): void {
  formGroup.classList.remove('govuk-form-group--error');

  const errorMessage = formGroup.querySelector('.govuk-error-message');
  if (errorMessage) {
    errorMessage.remove();
  }

  const input = formGroup.querySelector('.govuk-input, .govuk-textarea');
  if (input) {
    input.classList.remove('govuk-input--error', 'govuk-textarea--error');
  }

  const characterCountWrapper = formGroup.closest('.govuk-character-count');
  if (characterCountWrapper) {
    characterCountWrapper.classList.remove('govuk-character-count--error');
  }

  const fieldId = input?.getAttribute('id');
  if (fieldId) {
    const errorSummary = document.querySelector('.govuk-error-summary');
    if (errorSummary) {
      const summaryLink = errorSummary.querySelector(`a[href="#${fieldId}"]`);
      if (summaryLink) {
        const listItem = summaryLink.closest('li');
        if (listItem) {
          listItem.remove();
        }

        const remainingErrors = errorSummary.querySelectorAll('li');
        if (remainingErrors.length === 0) {
          errorSummary.remove();
        }
      }
    }
  }
}

/**
 * Attaches error clearing behavior to a field
 */
function attachErrorClearing(field: HTMLInputElement | HTMLTextAreaElement): void {
  const formGroup = field.closest('.govuk-form-group');
  if (!formGroup || !formGroup.classList.contains('govuk-form-group--error')) {
    return;
  }

  // Only attach error clearing if the field has the data attribute enabled
  if (field.getAttribute('data-enable-error-clearing') !== 'true') {
    return;
  }

  let errorCleared = false;

  const handleInput = (): void => {
    if (errorCleared) {
      return;
    }

    const value = field.value;

    if (!isValueEmpty(value)) {
      clearFieldError(formGroup as HTMLElement);
      errorCleared = true;
      field.removeEventListener('input', handleInput);
    }
  };

  field.addEventListener('input', handleInput);
}

/**
 * Attaches error clearing to radio buttons for conditional fields
 */
function attachRadioErrorClearing(): void {
  const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      // Find all conditional content areas
      const conditionalContents = document.querySelectorAll('.govuk-radios__conditional');

      conditionalContents.forEach(conditional => {
        // Check if this conditional is hidden
        if (conditional.classList.contains('govuk-radios__conditional--hidden')) {
          // Find any error form groups within this hidden conditional
          const errorFormGroups = conditional.querySelectorAll('.govuk-form-group--error');

          errorFormGroups.forEach(formGroup => {
            clearFieldError(formGroup as HTMLElement);
          });
        }
      });
    });
  });
}

/**
 * Initializes error clearing for all form fields with errors
 */
export function initFormErrorClearing(): void {
  const errorFormGroups = document.querySelectorAll('.govuk-form-group--error');

  errorFormGroups.forEach(formGroup => {
    const field = formGroup.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      'input.govuk-input, textarea.govuk-textarea'
    );

    if (field) {
      attachErrorClearing(field);
    }
  });

  // Also attach radio button error clearing for conditional fields
  attachRadioErrorClearing();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFormErrorClearing);
} else {
  initFormErrorClearing();
}
