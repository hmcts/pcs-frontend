/**
 * Lightweight postcode lookup UI behaviour.
 * Expects the following DOM elements (ids are fixed for now):
 * - #lookupPostcode: input for entering postcode
 * - #findAddressBtn: button (type=button) to trigger lookup
 * - #selectedAddress: select populated with results
 * - #addressLine1, #addressLine2, #addressLine3, #town, #county, #postcode: inputs to populate
 */
export function initPostcodeLookup(): void {
  const containers = Array.from(document.querySelectorAll<HTMLElement>('[data-address-component]'));
  if (!containers.length) {
    return;
  }

  containers.forEach(container => {
    const prefix = container.dataset.namePrefix || 'address';
    const byId = (id: string) => container.querySelector<HTMLElement>(`#${prefix}-${id}`);
    const postcodeInput = byId('lookupPostcode') as HTMLInputElement | null;
    const findBtn = byId('findAddressBtn') as HTMLButtonElement | null;
    const select = byId('selectedAddress') as HTMLSelectElement | null;
    const selectContainer = byId('addressSelectContainer') as HTMLDivElement | null;
    const detailsEl = container.querySelector('details');

    if (!postcodeInput || !findBtn || !select) {
      return;
    }

    const addressLine1 = byId('addressLine1') as HTMLInputElement | null;
    const addressLine2 = byId('addressLine2') as HTMLInputElement | null;
    const addressLine3 = byId('addressLine3') as HTMLInputElement | null;
    const town = byId('town') as HTMLInputElement | null;
    const county = byId('county') as HTMLInputElement | null;
    const postcode = byId('postcode') as HTMLInputElement | null;

    const clearOptions = () => {
      while (select.options.length) {
        select.remove(0);
      }
    };

    const populateOptions = (addresses: Record<string, string>[]) => {
      clearOptions();
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
        select.appendChild(opt);
      }
      if (selectContainer) {
        selectContainer.hidden = false;
      }
      select.hidden = false;
      select.focus();
    };

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
        populateOptions(addresses);
      } catch {
        clearOptions();
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

    select.addEventListener('change', () => {
      const selected = select.options[select.selectedIndex];
      if (!selected) {
        return;
      }
      // Ensure manual entry panel is visible when an address is chosen
      if (detailsEl && !detailsEl.open) {
        detailsEl.open = true;
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
      if (postcode) {
        postcode.value = selected.dataset.postcode || '';
      }
      // Focus first field for accessibility
      addressLine1?.focus();
    });
  });
}
