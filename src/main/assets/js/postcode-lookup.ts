/**
 * Lightweight postcode lookup UI behaviour.
 * Expects the following DOM elements (ids are fixed for now):
 * - #lookupPostcode: input for entering postcode
 * - #findAddressBtn: button (type=button) to trigger lookup
 * - #selectedAddress: select populated with results
 * - #addressLine1, #addressLine2, #addressLine3, #town, #county, #postcode: inputs to populate
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
      addressLine3: byId('addressLine3') as HTMLInputElement | null,
      town: byId('town') as HTMLInputElement | null,
      county: byId('county') as HTMLInputElement | null,
      postcodeOut: byId('postcode') as HTMLInputElement | null,
      country: byId('country') as HTMLInputElement | null,
      details: container.querySelector('.govuk-details, details') as HTMLDetailsElement | null,
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
      opt.dataset.line3 = addr.addressLine3 || '';
      opt.dataset.town = addr.town || '';
      opt.dataset.county = addr.county || '';
      opt.dataset.postcode = addr.postcode || '';
      opt.dataset.country = addr.country || '';
      select.appendChild(opt);
    }
    if (selectContainer) {
      selectContainer.hidden = false;
    }
    select.hidden = false;
    select.focus();
  };

  const handleSelectionChange = (container: HTMLElement, select: HTMLSelectElement) => {
    const { addressLine1, addressLine2, addressLine3, town, county, postcodeOut, country, details } =
      getParts(container);
    const selected = select.options[select.selectedIndex];
    if (!selected || !selected.value) {
      return;
    }
    if (details && !details.open) {
      details.open = true;
    }
    if (addressLine1) {
      addressLine1.value = selected.dataset.line1 || '';
    }
    if (addressLine2) {
      addressLine2.value = selected.dataset.line2 || '';
    }
    if (addressLine3) {
      addressLine3.value = selected.dataset.line3 || '';
    }
    if (town) {
      town.value = selected.dataset.town || '';
    }
    if (county) {
      county.value = selected.dataset.county || '';
    }
    if (postcodeOut) {
      postcodeOut.value = selected.dataset.postcode || '';
    }
    if (country) {
      country.value = selected.dataset.country || '';
    }
    addressLine1?.focus();
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
      const btn = target.closest('button[id$="-findAddressBtn"]') as HTMLButtonElement | null;
      if (!btn) {
        return;
      }
      const container = btn.closest('[data-address-component]') as HTMLElement | null;
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
      btn.disabled = true;
      try {
        const resp = await fetch(`/api/postcode-lookup?postcode=${encodeURIComponent(value)}`, {
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
        btn.disabled = false;
      }
    });

    document.addEventListener('change', evt => {
      const target = evt.target as Element | null;
      if (!target) {
        return;
      }
      const select = target.closest('select[id$="-selectedAddress"]') as HTMLSelectElement | null;
      if (!select) {
        return;
      }
      const container = select.closest('[data-address-component]') as HTMLElement | null;
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
      findBtn.disabled = true;
      try {
        const resp = await fetch(`/api/postcode-lookup?postcode=${encodeURIComponent(value)}`, {
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
        findBtn.disabled = false;
      }
    });
  });
}
