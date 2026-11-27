// Court staff can hide the order across the top of an order review's pages to a line, and show it again. The choice
// carries over to the review's next page.
const HIDDEN_KEY = 'pcs-order-panel-hidden';

export function initOrderPanel(): void {
  const panel = document.querySelector<HTMLElement>('[data-order-panel]');
  if (!panel) {
    return;
  }
  const toggle = panel.querySelector<HTMLButtonElement>('[data-order-panel-toggle]')!;
  const content = document.getElementById('order-panel-content')!;
  const show = (hidden: boolean) => {
    toggle.setAttribute('aria-expanded', String(!hidden));
    toggle.textContent = hidden ? 'Show order' : 'Hide order';
    content.hidden = hidden;
    panel.classList.toggle('pcs-order-panel--collapsed', hidden);
  };
  show(sessionStorage.getItem(HIDDEN_KEY) === 'true');
  toggle.addEventListener('click', () => {
    const hidden = toggle.getAttribute('aria-expanded') === 'true';
    show(hidden);
    sessionStorage.setItem(HIDDEN_KEY, String(hidden));
  });
}
