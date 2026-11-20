/**
 * @jest-environment jsdom
 */

import { initOrderPanel } from '../../../../main/assets/js/order-panel';

const PANEL = `
  <section class="pcs-order-panel" data-order-panel>
    <h2>Order to issue</h2>
    <button type="button" aria-expanded="true" aria-controls="order-panel-content" data-order-panel-toggle hidden>
      Hide order
    </button>
    <div id="order-panel-content">The order</div>
  </section>`;

const toggle = () => document.querySelector<HTMLButtonElement>('[data-order-panel-toggle]')!;
const content = () => document.getElementById('order-panel-content')!;
const panel = () => document.querySelector<HTMLElement>('[data-order-panel]')!;

describe('initOrderPanel', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = PANEL;
  });

  it('shows the order, with a button to hide it', () => {
    initOrderPanel();

    expect(toggle().hidden).toBe(false);
    expect(toggle().textContent).toBe('Hide order');
    expect(content().hidden).toBe(false);
  });

  it('hides the order to a line, and shows it again', () => {
    initOrderPanel();

    toggle().click();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().textContent).toBe('Show order');
    expect(content().hidden).toBe(true);
    expect(panel().classList).toContain('pcs-order-panel--collapsed');

    toggle().click();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(content().hidden).toBe(false);
    expect(panel().classList).not.toContain('pcs-order-panel--collapsed');
  });

  it("keeps the order hidden on the review's next page", () => {
    initOrderPanel();
    toggle().click();

    document.body.innerHTML = PANEL;
    initOrderPanel();

    expect(toggle().textContent).toBe('Show order');
    expect(content().hidden).toBe(true);
  });

  it('does nothing on a page without the order', () => {
    document.body.innerHTML = '<main></main>';

    expect(() => initOrderPanel()).not.toThrow();
  });
});
