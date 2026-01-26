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
    return {
      prefix,
      byId,
      postcodeInput: byId('lookupPostcode') as HTMLInputElement | null,
      findBtn: byId('findAddressBtn') as HTMLButtonElement | null,
      select: byId('selectedAddress') as HTMLSelectElement | null,
      selectContainer: byId('addressSelectContainer') as HTMLDivElement | null,
      errorMessage: byId('postcode-error') as HTMLParagraphElement | null,
      addressLine1: byId('addressLine1') as HTMLInputElement | null,
      addressLine2: byId('addressLine2') as HTMLInputElement | null,
      town: byId('town') as HTMLInputElement | null,
      county: byId('county') as HTMLInputElement | null,
      postcodeOut: byId('postcode') as HTMLInputElement | null,
      addressForm: byId('addressForm') as HTMLDivElement | null,
      enterManuallyDetails: byId('enterManuallyDetails') as HTMLDetailsElement | null,
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
    const { addressLine1, addressLine2, town, county, postcodeOut, addressForm, enterManuallyDetails } =
      getParts(container);

    // Show the address form by removing govuk-visually-hidden class
    if (addressForm) {
      addressForm.classList.remove('govuk-visually-hidden');
    }

    // Hide the "Enter manually" Details component when address is selected
    if (enterManuallyDetails) {
      enterManuallyDetails.style.display = 'none';
    }

    const fieldMappings = [
      { field: addressLine1, value: selected.dataset.line1 },
      { field: addressLine2, value: selected.dataset.line2 },
      { field: town, value: selected.dataset.town },
      { field: county, value: selected.dataset.county },
      { field: postcodeOut, value: selected.dataset.postcode },
    ];

    fieldMappings.forEach(({ field, value }) => {
      if (field) {
        field.value = value || '';
      }
    });

    addressLine1?.focus();
  };

  const handleSelectionChange = (container: HTMLElement, select: HTMLSelectElement) => {
    const selected = select.options[select.selectedIndex];
    if (!selected?.value) {
      return;
    }
    populateAddressFields(container, selected);
  };

  const showError = (errorMessage: HTMLParagraphElement | null, input: HTMLInputElement | null) => {
    if (errorMessage) {
      errorMessage.classList.remove('govuk-visually-hidden');
    }
    if (input) {
      input.classList.add('govuk-input--error');
    }
  };

  const hideError = (errorMessage: HTMLParagraphElement | null, input: HTMLInputElement | null) => {
    if (errorMessage) {
      errorMessage.classList.add('govuk-visually-hidden');
    }
    if (input) {
      input.classList.remove('govuk-input--error');
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

  const performPostcodeLookup = async (
    postcode: string,
    select: HTMLSelectElement,
    selectContainer: HTMLDivElement | null,
    button: HTMLButtonElement,
    errorMessage: HTMLParagraphElement | null,
    input: HTMLInputElement | null,
    enterManuallyDetails: HTMLDetailsElement | null
  ) => {
    button.disabled = true;
    hideError(errorMessage, input);

    // Check for custom API endpoint (e.g., NestJS endpoint)
    const container = button.closest('[data-address-component]') as HTMLElement | null;
    const apiEndpoint = container?.dataset.apiEndpoint || '/api/postcode-lookup';

    try {
      const resp = await fetch(`${apiEndpoint}?postcode=${encodeURIComponent(postcode)}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!resp.ok) {
        throw new Error('Lookup failed');
      }
      const json = (await resp.json()) as { addresses?: Record<string, string>[] };
      const addresses = json.addresses || [];

      if (addresses.length === 0) {
        showError(errorMessage, input);
        showEmptyDropdown(select, selectContainer);
      } else {
        // Hide the "Enter manually" Details component when addresses are found
        if (enterManuallyDetails) {
          enterManuallyDetails.style.display = 'none';
        }
        populateOptions(select, selectContainer, addresses);
      }
    } catch {
      showError(errorMessage, input);
      showEmptyDropdown(select, selectContainer);
    } finally {
      button.disabled = false;
    }
  };

  // If more than one component, use event delegation to avoid multiple handlers
  if (containers.length > 1) {
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
      const { postcodeInput, select, selectContainer, errorMessage, enterManuallyDetails } = getParts(container);
      if (!postcodeInput || !select) {
        return;
      }

      const value = postcodeInput.value?.trim();
      if (!value) {
        return;
      }
      await performPostcodeLookup(
        value,
        select,
        selectContainer,
        btn,
        errorMessage,
        postcodeInput,
        enterManuallyDetails
      );
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

    // Handle Details component toggle to show address form
    document.addEventListener('toggle', (evt: Event) => {
      const target = evt.target as HTMLDetailsElement | null;
      if (!target?.id?.endsWith('-enterManuallyDetails')) {
        return;
      }
      const container = target.closest('[data-address-component]') as HTMLElement;
      if (!container) {
        return;
      }
      const { addressForm } = getParts(container);
      if (target.open && addressForm) {
        addressForm.classList.remove('govuk-visually-hidden');
      }
    });
    return;
  }

  // Fallback: bind directly when 0 or 1 components present
  if (!containers.length) {
    return;
  }

  containers.forEach(container => {
    const { postcodeInput, findBtn, select, selectContainer, errorMessage, enterManuallyDetails } = getParts(container);
    if (!postcodeInput || !findBtn || !select) {
      return;
    }

    // Selection behaviour for single component
    select.addEventListener('change', () => handleSelectionChange(container, select));

    findBtn.addEventListener('click', async () => {
      const value = postcodeInput.value?.trim();
      if (!value) {
        return;
      }
      await performPostcodeLookup(
        value,
        select,
        selectContainer,
        findBtn,
        errorMessage,
        postcodeInput,
        enterManuallyDetails
      );
    });

    // Handle Details component toggle to show address form
    if (enterManuallyDetails) {
      enterManuallyDetails.addEventListener('toggle', () => {
        if (enterManuallyDetails.open) {
          const { addressForm } = getParts(container);
          if (addressForm) {
            addressForm.classList.remove('govuk-visually-hidden');
          }
        }
      });
    }
  });
}


