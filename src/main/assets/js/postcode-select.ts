export function initPostcodeSelection(): void {
  const addressSelect = document.getElementById('selectedAddress') as HTMLSelectElement | null;
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

    const form = addressSelect.closest('form') as HTMLFormElement | null;
    if (form) {
      form.querySelectorAll('input[name="action"], input[name="selectedAddressIndex"]').forEach(el => el.remove());

      const actionInput = document.createElement('input');
      actionInput.type = 'hidden';
      actionInput.name = 'action';
      actionInput.value = 'select-address';
      form.appendChild(actionInput);

      const indexInput = document.createElement('input');
      indexInput.type = 'hidden';
      indexInput.name = 'selectedAddressIndex';
      indexInput.value = addressSelect.selectedIndex.toString();
      form.appendChild(indexInput);

      form.submit();
    }
  });
}
