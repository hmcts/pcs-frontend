export function initPostcodeSelection(): void {
  const addressSelect = document.getElementById('selectedAddress') as HTMLSelectElement | null;

  // ✅ Step 1: Focus the dropdown if we just came from a postcode lookup
  const url = new URL(window.location.href);
  const isLookup = url.searchParams.get('lookup') === '1';

  if (isLookup && addressSelect) {
    addressSelect.focus();
  }

  // ✅ Step 2: Continue with your normal change event for populating fields
  if (!addressSelect) {
    return;
  }

  const addressLine1 = document.getElementById('addressLine1') as HTMLInputElement | null;
  const addressLine2 = document.getElementById('addressLine2') as HTMLInputElement | null;
  const addressLine3 = document.getElementById('addressLine3') as HTMLInputElement | null;
  const town = document.getElementById('town') as HTMLInputElement | null;
  const county = document.getElementById('county') as HTMLInputElement | null;
  const postcode = document.getElementById('postcode') as HTMLInputElement | null;

  addressSelect.addEventListener('change', () => {
    const selected = addressSelect.options[addressSelect.selectedIndex];
    if (!selected || !selected.value) {
      return;
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

    const details = document.querySelector('.govuk-details') as HTMLDetailsElement | null;
    if (details && !details.open) {
      details.open = true;
    }
  });
}
