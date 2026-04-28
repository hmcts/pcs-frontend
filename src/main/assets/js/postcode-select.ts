export function initPostcodeSelection(): void {
  const component = document.querySelector<HTMLElement>('[data-address-component]');
  const prefix = component?.dataset.namePrefix || 'address';

  const byIdOrName = <T extends HTMLElement>(idOrName: string): T | null => {
    return (
      (component?.querySelector<T>(`#${idOrName}`) ||
        component?.querySelector<T>(`[name="${idOrName}"]`) ||
        (document.getElementById(idOrName) as T) ||
        document.querySelector<T>(`[name="${idOrName}"]`)) ??
      null
    );
  };

  const addressSelect =
    byIdOrName<HTMLSelectElement>(`${prefix}-selectedAddress`) ?? byIdOrName<HTMLSelectElement>('selectedAddress');

  // Focus the dropdown if we just came from a postcode lookup
  let href = '';
  if ((window as { __testHref?: string }).__testHref) {
    href = (window as { __testHref?: string }).__testHref as string;
  } else {
    try {
      href = (window as { location?: { href?: string } })?.location?.href || '';
    } catch {
      href = '';
    }
  }
  const isLookup = /(^|[?&])lookup=1(&|$)/.test(href);

  if (isLookup && addressSelect) {
    addressSelect.focus();
  }

  if (!addressSelect) {
    return;
  }

  addressSelect.addEventListener('change', () => {
    const selected = addressSelect.options[addressSelect.selectedIndex];
    if (!selected || !selected.value) {
      return;
    }

    const addressLine1 =
      byIdOrName<HTMLInputElement>(`${prefix}-addressLine1`) ??
      byIdOrName<HTMLInputElement>('correspondenceAddressConfirm.addressLine1') ??
      byIdOrName<HTMLInputElement>('addressLine1');

    const addressLine2 =
      byIdOrName<HTMLInputElement>(`${prefix}-addressLine2`) ??
      byIdOrName<HTMLInputElement>('correspondenceAddressConfirm.addressLine2') ??
      byIdOrName<HTMLInputElement>('addressLine2');

    const addressLine3 =
      byIdOrName<HTMLInputElement>(`${prefix}-addressLine3`) ??
      byIdOrName<HTMLInputElement>('correspondenceAddressConfirm.addressLine3') ??
      byIdOrName<HTMLInputElement>('addressLine3');

    const town =
      byIdOrName<HTMLInputElement>(`${prefix}-town`) ??
      byIdOrName<HTMLInputElement>('correspondenceAddressConfirm.townOrCity') ??
      byIdOrName<HTMLInputElement>('town');

    const county =
      byIdOrName<HTMLInputElement>(`${prefix}-county`) ??
      byIdOrName<HTMLInputElement>('correspondenceAddressConfirm.county') ??
      byIdOrName<HTMLInputElement>('county');

    const postcode =
      byIdOrName<HTMLInputElement>(`${prefix}-postcode`) ??
      byIdOrName<HTMLInputElement>('correspondenceAddressConfirm.postcode') ??
      byIdOrName<HTMLInputElement>('postcode');

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

    const details = (component ?? document).querySelector<HTMLDetailsElement | Element>('.govuk-details');
    if (details) {
      if ('open' in details) {
        (details as HTMLDetailsElement).open = true;
      } else {
        details.setAttribute('open', '');
      }
    }
  });
}
