// Progressive enhancement: card selection navigates directly instead of posting first.
export function initCounterClaimPaymentChoice(): void {
  const form = document.querySelector<HTMLFormElement>('[data-counter-claim-payment-form]');
  if (!form) {
    return;
  }

  const cardUrl = form.dataset.cardPaymentUrl;
  if (!cardUrl) {
    return;
  }

  form.addEventListener('submit', e => {
    const selected = form.querySelector<HTMLInputElement>('input[name="paymentOptions"]:checked');
    // pba: let the normal POST through
    if (selected?.value !== 'card') {
      return;
    }

    e.preventDefault();
    window.location.href = cardUrl;
  });
}
