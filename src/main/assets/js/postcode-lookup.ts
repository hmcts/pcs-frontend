/**
 * Lightweight postcode lookup UI behaviour.
 * Expects the following DOM elements (ids are fixed for now):
 * - #lookupPostcode: input for entering postcode
 * - #findAddressBtn: button (type=button) to trigger lookup
 * - #selectedAddress: select populated with results
 * - #addressLine1, #addressLine2, #town, #county, #postcode: inputs to populate
 */
let postcodeLookupDelegatedBound = false;

export function initPostcodeLookup(): void {
  const containers = Array.from(document.querySelectorAll<HTMLElement>('[data-address-component]'));

  // Helper utilities that work per-container
  const getParts = (container: HTMLElement) => {
    const prefix = container.dataset.namePrefix || 'address';
    const byId = (id: string) => container.querySelector<HTMLElement>(`#${prefix}-${id}`);

    // Find address fields container
    const addressForm = byId('addressForm') as HTMLDivElement | null;
    const addressFieldsContainer = document.querySelector<HTMLDivElement>('[data-address-fields]');
    const fieldsContainer = addressFieldsContainer || addressForm;

    return {
      prefix,
      byId,
      postcodeInput: byId('lookupPostcode') as HTMLInputElement | null,
      findBtn: byId('findAddressBtn') as HTMLButtonElement | null,
      select: byId('selectedAddress') as HTMLSelectElement | null,
      selectContainer: byId('addressSelectContainer') as HTMLDivElement | null,
      selectFormGroup: byId('selectedAddress-form-group') as HTMLDivElement | null,
      selectErrorMessage: byId('selectedAddress-error') as HTMLParagraphElement | null,
      lookupErrorMessage: byId('lookup-postcode-error') as HTMLParagraphElement | null,
      errorMessage: byId('postcode-error') as HTMLParagraphElement | null,
      postcodeFormGroup: byId('postcode-form-group') as HTMLDivElement | null,
      addressLine1: byId('addressLine1') as HTMLInputElement | null,
      addressLine2: byId('addressLine2') as HTMLInputElement | null,
      town: byId('town') as HTMLInputElement | null,
      county: byId('county') as HTMLInputElement | null,
      postcodeOut: byId('postcode') as HTMLInputElement | null,
      addressForm: fieldsContainer,
      enterManuallyDetails: byId('enterManuallyDetails') as HTMLDetailsElement | null,
      addressesFoundFlag: byId('addressesFoundFlag') as HTMLInputElement | null,
    };
  };

  const clearOptions = (select: HTMLSelectElement) => {
    while (select.options.length) {
      select.remove(0);
    }
  };

  const populateOptions = (
    select: HTMLSelectElement,
    selectContainer: HTMLDivElement | null,
    addresses: Record<string, string>[]
  ) => {
    clearOptions(select);
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = `${addresses.length} address${addresses.length === 1 ? '' : 'es'} found`;
    select.appendChild(defaultOpt);

    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = addr.fullAddress || '';
      opt.dataset.line1 = addr.addressLine1 || '';
      opt.dataset.line2 = addr.addressLine2 || '';
      opt.dataset.town = addr.town || '';
      opt.dataset.county = addr.county || '';
      opt.dataset.postcode = addr.postcode || '';
      select.appendChild(opt);
    }
    if (selectContainer) {
      selectContainer.hidden = false;
    }
    select.hidden = false;
    select.focus();
  };

  const populateAddressFields = (container: HTMLElement, selected: HTMLOptionElement) => {
    const { addressLine1, addressLine2, town, county, postcodeOut, enterManuallyDetails } = getParts(container);

    // Ensure the Details component is open so address fields are visible
    if (enterManuallyDetails) {
      enterManuallyDetails.open = true;
    }

    const fieldMappings = [
      { field: addressLine1, value: selected.dataset.line1, name: 'addressLine1' },
      { field: addressLine2, value: selected.dataset.line2, name: 'addressLine2' },
      { field: town, value: selected.dataset.town, name: 'town' },
      { field: county, value: selected.dataset.county, name: 'county' },
      { field: postcodeOut, value: selected.dataset.postcode, name: 'postcode' },
    ];

    fieldMappings.forEach(({ field, value }) => {
      if (field) {
        field.value = value || '';
      }
    });

    addressLine1?.focus();
  };

  const handleSelectionChange = (container: HTMLElement, select: HTMLSelectElement) => {
    const { selectErrorMessage, selectFormGroup, prefix } = getParts(container);

    // Clear any dropdown errors when user makes a selection
    hideError(selectErrorMessage, select);
    if (selectFormGroup) {
      selectFormGroup.classList.remove('govuk-form-group--error');
    }

    // Remove dropdown error from error summary
    removeErrorFromSummary(`${prefix}-selectedAddress-error`);

    const selected = select.options[select.selectedIndex];
    if (!selected?.value) {
      return;
    }
    populateAddressFields(container, selected);
  };

  const showError = (
    errorMessage: HTMLParagraphElement | null,
    element: HTMLInputElement | HTMLSelectElement | null
  ) => {
    if (errorMessage) {
      // Show the error message by removing the GOV.UK display-none class
      errorMessage.classList.remove('govuk-!-display-none');
    }
    if (element) {
      if (element instanceof HTMLInputElement) {
        element.classList.add('govuk-input--error');
      } else if (element instanceof HTMLSelectElement) {
        element.classList.add('govuk-select--error');
      }
    }
  };

  const hideError = (
    errorMessage: HTMLParagraphElement | null,
    element: HTMLInputElement | HTMLSelectElement | null
  ) => {
    if (errorMessage) {
      // Hide the error message by adding the GOV.UK display-none class
      errorMessage.classList.add('govuk-!-display-none');
    }
    if (element) {
      if (element instanceof HTMLInputElement) {
        element.classList.remove('govuk-input--error');
      } else if (element instanceof HTMLSelectElement) {
        element.classList.remove('govuk-select--error');
      }
    }
  };

  // Helper functions to manage the error summary
  const getErrorSummary = () => {
    return document.querySelector<HTMLDivElement>('.govuk-error-summary');
  };

  const getErrorSummaryList = () => {
    return document.querySelector<HTMLUListElement>('.govuk-error-summary__list');
  };

  const addErrorToSummary = (errorId: string, errorText: string, href: string) => {
    const errorSummary = getErrorSummary();
    const errorList = getErrorSummaryList();

    if (!errorList) {
      return;
    }

    // Check if error already exists
    const existingError = errorList.querySelector(`li[data-error-id="${errorId}"]`);
    if (existingError) {
      return;
    }

    // Create new error list item
    const li = document.createElement('li');
    li.setAttribute('data-error-id', errorId);
    const link = document.createElement('a');
    link.href = href;
    link.textContent = errorText;
    li.appendChild(link);
    errorList.appendChild(li);

    // Show the error summary
    if (errorSummary) {
      errorSummary.hidden = false;
      errorSummary.style.display = '';
      // Focus on error summary (GOV.UK pattern)
      errorSummary.focus();
    }
  };

  const removeErrorFromSummary = (errorId: string) => {
    const errorList = getErrorSummaryList();
    if (!errorList) {
      return;
    }

    const errorItem = errorList.querySelector(`li[data-error-id="${errorId}"]`);
    if (errorItem) {
      errorItem.remove();
    }

    // Hide error summary if no errors remain
    const remainingErrors = errorList.querySelectorAll('li');
    if (remainingErrors.length === 0) {
      const errorSummary = getErrorSummary();
      if (errorSummary) {
        errorSummary.hidden = true;
      }
    }
  };

  const showEmptyDropdown = (
    select: HTMLSelectElement,
    selectContainer: HTMLDivElement | null,
    message: string = 'No addresses found'
  ) => {
    clearOptions(select);
    const opt = document.createElement('option');
    opt.value = '';
    opt.disabled = true;
    opt.textContent = message;
    select.appendChild(opt);
    if (selectContainer) {
      selectContainer.hidden = false;
    }
    select.hidden = false;
  };

  const handleNoAddresses = (
    errorMessage: HTMLParagraphElement | null,
    input: HTMLInputElement | null,
    select: HTMLSelectElement,
    selectContainer: HTMLDivElement | null,
    enterManuallyDetails: HTMLDetailsElement | null,
    addressesFoundFlag: HTMLInputElement | null,
    prefix: string
  ) => {
    showError(errorMessage, input);
    showEmptyDropdown(select, selectContainer);
    if (enterManuallyDetails) {
      enterManuallyDetails.open = true;
      enterManuallyDetails.style.display = '';
    }
    if (addressesFoundFlag) {
      addressesFoundFlag.value = 'false';
    }

    // Add error to error summary
    if (errorMessage?.textContent && input) {
      const errorText = errorMessage.textContent.replace('Error:', '').trim();
      addErrorToSummary(`${prefix}-postcode-error`, errorText, `#${prefix}-lookupPostcode`);
    }
  };

  const performPostcodeLookup = async (
    postcode: string,
    select: HTMLSelectElement,
    selectContainer: HTMLDivElement | null,
    button: HTMLButtonElement,
    errorMessage: HTMLParagraphElement | null,
    input: HTMLInputElement | null,
    enterManuallyDetails: HTMLDetailsElement | null,
    addressesFoundFlag: HTMLInputElement | null,
    prefix: string
  ) => {
    button.disabled = true;
    hideError(errorMessage, input);

    // Remove any previous "no addresses found" error from summary
    removeErrorFromSummary(`${prefix}-postcode-error`);

    try {
      const resp = await fetch(`/api/postcode-lookup?postcode=${encodeURIComponent(postcode)}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!resp.ok) {
        throw new Error('Lookup failed');
      }
      const json = (await resp.json()) as { addresses?: Record<string, string>[] };
      const addresses = json.addresses || [];

      if (addresses.length === 0) {
        handleNoAddresses(
          errorMessage,
          input,
          select,
          selectContainer,
          enterManuallyDetails,
          addressesFoundFlag,
          prefix
        );
      } else {
        // Keep the "Enter manually" Details component visible when addresses are found
        if (enterManuallyDetails) {
          enterManuallyDetails.style.display = '';
        }
        populateOptions(select, selectContainer, addresses);
        // Mark that addresses were found
        if (addressesFoundFlag) {
          addressesFoundFlag.value = 'true';
        }
      }
    } catch {
      handleNoAddresses(errorMessage, input, select, selectContainer, enterManuallyDetails, addressesFoundFlag, prefix);
    } finally {
      button.disabled = false;
    }
  };

  // Initialize all containers: ensure error messages are hidden on load
  containers.forEach(container => {
    const { lookupErrorMessage, errorMessage } = getParts(container);
    hideError(lookupErrorMessage, null);
    hideError(errorMessage, null);
  });

  // Early return if no components found
  if (!containers.length) {
    return;
  }

  // Use event delegation to avoid multiple handlers (works for 0, 1, or many components)
  if (postcodeLookupDelegatedBound) {
    return;
  }
  postcodeLookupDelegatedBound = true;

  document.addEventListener('click', async evt => {
    const target = evt.target as Element | null;
    if (!target) {
      return;
    }
    const btn = target.closest('button[id$="-findAddressBtn"]') as HTMLButtonElement;
    if (!btn) {
      return;
    }
    const container = btn.closest('[data-address-component]') as HTMLElement;
    if (!container) {
      return;
    }
    const {
      prefix,
      postcodeInput,
      select,
      selectContainer,
      lookupErrorMessage,
      errorMessage,
      enterManuallyDetails,
      postcodeFormGroup,
      addressesFoundFlag,
    } = getParts(container);
    if (!postcodeInput || !select) {
      return;
    }

    const value = postcodeInput.value?.trim();
    if (!value) {
      // Show blank field validation error
      showError(lookupErrorMessage, postcodeInput);
      hideError(errorMessage, null);
      if (postcodeFormGroup) {
        postcodeFormGroup.classList.add('govuk-form-group--error');
      }

      // Add error to error summary
      if (lookupErrorMessage?.textContent) {
        const errorText = lookupErrorMessage.textContent.replace('Error:', '').trim();
        addErrorToSummary(`${prefix}-lookup-postcode-error`, errorText, `#${prefix}-lookupPostcode`);
      }

      return;
    }
    // Hide blank field error before lookup
    hideError(lookupErrorMessage, postcodeInput);
    if (postcodeFormGroup) {
      postcodeFormGroup.classList.remove('govuk-form-group--error');
    }

    // Remove error from error summary
    removeErrorFromSummary(`${prefix}-lookup-postcode-error`);

    await performPostcodeLookup(
      value,
      select,
      selectContainer,
      btn,
      errorMessage,
      postcodeInput,
      enterManuallyDetails,
      addressesFoundFlag,
      prefix
    );
  });

  document.addEventListener('input', evt => {
    const target = evt.target as Element | null;
    if (!target) {
      return;
    }
    const input = target.closest('input[id$="-lookupPostcode"]') as HTMLInputElement;
    if (!input) {
      return;
    }
    const container = input.closest('[data-address-component]') as HTMLElement;
    if (!container) {
      return;
    }
    const { prefix, lookupErrorMessage } = getParts(container);
    hideError(lookupErrorMessage, input);

    // Remove error from error summary when user starts typing
    removeErrorFromSummary(`${prefix}-lookup-postcode-error`);
  });

  document.addEventListener('change', evt => {
    const target = evt.target as Element | null;
    if (!target) {
      return;
    }
    const select = target.closest('select[id$="-selectedAddress"]') as HTMLSelectElement;
    if (!select) {
      return;
    }
    const container = select.closest('[data-address-component]') as HTMLElement;
    if (!container) {
      return;
    }
    handleSelectionChange(container, select);
  });

  // Handle form submission validation for dropdown
  document.addEventListener('submit', (evt: Event) => {
    const form = evt.target as HTMLFormElement | null;
    if (!form) {
      return;
    }

    // Find all address components within this form
    const addressComponents = Array.from(form.querySelectorAll<HTMLElement>('[data-address-component]'));

    for (const container of addressComponents) {
      const { prefix, addressesFoundFlag, select, selectContainer, selectErrorMessage, selectFormGroup } =
        getParts(container);

      // Check if addresses were found and dropdown is visible
      if (addressesFoundFlag?.value === 'true' && select && !selectContainer?.hidden && !select.hidden) {
        // Check if no address is selected
        const selectedValue = select.value;
        if (!selectedValue) {
          // Prevent form submission
          evt.preventDefault();

          // Show dropdown error
          showError(selectErrorMessage, select);
          if (selectFormGroup) {
            selectFormGroup.classList.add('govuk-form-group--error');
          }

          // Add error to error summary
          if (selectErrorMessage?.textContent) {
            const errorText = selectErrorMessage.textContent.replace('Error:', '').trim();
            addErrorToSummary(`${prefix}-selectedAddress-error`, errorText, `#${prefix}-selectedAddress`);
          }

          // Focus on the error summary (GOV.UK pattern)
          const errorSummary = getErrorSummary();
          if (errorSummary) {
            errorSummary.focus();
            errorSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }

          return;
        }
      }
    }
  });
}
