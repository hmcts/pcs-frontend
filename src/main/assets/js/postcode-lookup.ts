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
      addressLine1: byId('addressLine1') as HTMLInputElement | null,
      addressLine2: byId('addressLine2') as HTMLInputElement | null,
      town: byId('town') as HTMLInputElement | null,
      county: byId('county') as HTMLInputElement | null,
      postcodeOut: byId('postcode') as HTMLInputElement | null,
      details: container.querySelector('.govuk-details, details'),
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
    const { addressLine1, addressLine2, town, county, postcodeOut, details } = getParts(container);

    if (details && !(details as HTMLDetailsElement).open) {
      (details as HTMLDetailsElement).open = true;
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

  const performPostcodeLookup = async (
    postcode: string,
    select: HTMLSelectElement,
    selectContainer: HTMLDivElement | null,
    button: HTMLButtonElement
  ) => {
    button.disabled = true;
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
      populateOptions(select, selectContainer, addresses);
    } catch {
      clearOptions(select);
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No addresses found';
      select.appendChild(opt);
      if (selectContainer) {
        selectContainer.hidden = false;
      }
      select.hidden = false;
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
      const { postcodeInput, select, selectContainer } = getParts(container);
      if (!postcodeInput || !select) {
        return;
      }

      const value = postcodeInput.value?.trim();
      if (!value) {
        return;
      }
      await performPostcodeLookup(value, select, selectContainer, btn);
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
    return;
  }

  // Fallback: bind directly when 0 or 1 components present
  if (!containers.length) {
    return;
  }

  containers.forEach(container => {
    const { postcodeInput, findBtn, select, selectContainer } = getParts(container);
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
      await performPostcodeLookup(value, select, selectContainer, findBtn);
    });
  });
}
