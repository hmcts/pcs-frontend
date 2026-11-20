// Court staff can hide the order across the top of an order review's pages to a line, and show it again. The choice
// carries over to the review's next page.
const HIDDEN_KEY = 'pcs-order-panel-hidden';

function remembered(): boolean {
  try {
    return sessionStorage.getItem(HIDDEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function remember(hidden: boolean): void {
  try {
    sessionStorage.setItem(HIDDEN_KEY, String(hidden));
  } catch {
    // Not kept: the next page shows the order.
  }
}

export function initOrderPanel(): void {
  const panel = document.querySelector<HTMLElement>('[data-order-panel]');
  const toggle = panel?.querySelector<HTMLButtonElement>('[data-order-panel-toggle]');
  const content = document.getElementById(toggle?.getAttribute('aria-controls') ?? '');
  if (!panel || !toggle || !content) {
    return;
  }
  const show = (hidden: boolean) => {
    toggle.setAttribute('aria-expanded', String(!hidden));
    toggle.textContent = hidden ? 'Show order' : 'Hide order';
    content.hidden = hidden;
    panel.classList.toggle('pcs-order-panel--collapsed', hidden);
  };
  toggle.hidden = false;
  show(remembered());
  toggle.addEventListener('click', () => {
    const hidden = toggle.getAttribute('aria-expanded') === 'true';
    show(hidden);
    remember(hidden);
  });
}
