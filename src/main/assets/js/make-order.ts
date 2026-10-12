import { type DocWeaveDocument, type DocWeaveSnapshot, createDocEditor } from '@hmcts-cft/docweave';

import { parseMoney } from '../../utils/makeOrderFormat';
import { type MakeOrderType as OrderType } from '../../utils/makeOrderValidation';

import { type OrderData, readOrderData } from './make-order/data';
import { buildAdjournmentOrder } from './make-order/wording/adjournment';
import { SAME_TERMS_COSTS } from './make-order/wording/common';
import { buildFreeFormOrder } from './make-order/wording/free-form';
import { buildOutrightOrder } from './make-order/wording/outright';
import { buildStrikeOutDismissalOrder } from './make-order/wording/strike-out';
import { buildSuspendedOrder } from './make-order/wording/suspended';

type DateParts = [HTMLInputElement, HTMLInputElement, HTMLInputElement];

function dateParts(root: ParentNode, prefix: string): DateParts | undefined {
  const parts = ['day', 'month', 'year'].map(part =>
    root.querySelector<HTMLInputElement>(`input[name="${prefix}-${part}"]`)
  );
  return parts.every(Boolean) ? (parts as DateParts) : undefined;
}

function setDate([day, month, year]: DateParts, date: Date): void {
  day.value = String(date.getDate()).padStart(2, '0');
  month.value = String(date.getMonth() + 1).padStart(2, '0');
  year.value = String(date.getFullYear());
}

function daysFromToday(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function monthsFromToday(months: number): Date {
  const date = new Date();
  const dayOfMonth = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(Math.min(dayOfMonth, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  return date;
}

/** Quick dates: "14 days" pills, and shorthand such as 2w or 3m typed into the day field. */
export function initDatePills(form: HTMLFormElement): void {
  form.addEventListener('input', event => {
    const day = event.target;
    if (!(day instanceof HTMLInputElement) || !day.name.endsWith('-day')) {
      return;
    }
    const shorthand = /^(\d+)\s*([dwm])$/i.exec(day.value.trim());
    const parts = shorthand && dateParts(form, day.name.slice(0, -'-day'.length));
    if (!shorthand || !parts || !Number.isSafeInteger(Number(shorthand[1]))) {
      return;
    }
    const amount = Number(shorthand[1]);
    const unit = shorthand[2].toLowerCase();
    setDate(parts, unit === 'm' ? monthsFromToday(amount) : daysFromToday(amount * (unit === 'w' ? 7 : 1)));
  });

  form.addEventListener('click', event => {
    const pill = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-date-pill-days]') : null;
    const control = pill?.closest<HTMLElement>('.pcs-date-with-pills');
    const day = control?.querySelector<HTMLInputElement>('input[name$="-day"]');
    const parts = day && dateParts(control!, day.name.slice(0, -'-day'.length));
    if (!pill || !parts) {
      return;
    }
    setDate(parts, daysFromToday(Number(pill.dataset.datePillDays)));
    parts[0].dispatchEvent(new Event('input', { bubbles: true }));
  });
}

// Typing a date in a row implies choosing that row's option, so select it rather than
// leaving the judge with a date recorded against an unselected radio. Selection is on
// input, not focus, so tabbing through the rows does not silently change the answer.
export function initOptionRows(form: HTMLFormElement): void {
  form.addEventListener('input', event => {
    const target = event.target as Element | null;
    const radio = target
      ?.closest('.pcs-option-row__fields')
      ?.closest('[data-option-row]')
      ?.querySelector<HTMLInputElement>('input[type="radio"]');
    if (radio && !radio.checked) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  // Only the chosen option's fields are needed, so only they are marked required. Also run now,
  // as a browser that restores the form does not say so with a change event.
  const markChosenRequired = (): void =>
    form.querySelectorAll<HTMLElement>('[data-option-row]').forEach(row => {
      const chosen = row.querySelector<HTMLInputElement>('input[type="radio"]')?.checked ?? false;
      row.querySelectorAll<HTMLInputElement>('.pcs-option-row__fields input.govuk-input').forEach(field => {
        field.required = chosen;
      });
    });
  form.addEventListener('change', markChosenRequired);
  markChosenRequired();
}

export function initCaseFactsToggle(form: HTMLFormElement): void {
  const caseFacts = form.querySelector<HTMLElement>('[data-case-facts]');
  const toggle = caseFacts?.querySelector<HTMLButtonElement>('[data-case-facts-toggle]');
  const content = document.getElementById(toggle?.getAttribute('aria-controls') ?? '');
  if (!caseFacts || !toggle || !content) {
    return;
  }
  toggle.addEventListener('click', () => {
    const collapse = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!collapse));
    toggle.textContent = collapse ? 'Show case facts' : 'Hide case facts';
    content.hidden = collapse;
    caseFacts.classList.toggle('pcs-case-facts--collapsed', collapse);
  });
}

/**
 * Fills targets with a value worked out from the case facts, while each target is empty or still
 * holds the value last filled in, so the judge's own figure is never overwritten.
 */
function fillFromCaseFacts(form: HTMLFormElement, sources: string[], targets: string[], derive: () => string): void {
  let filled = '';
  const fill = (): void => {
    const next = derive();
    targets.forEach(name => {
      const target = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (target && (target.value === '' || target.value === filled)) {
        target.value = next;
      }
    });
    filled = next;
  };
  form.addEventListener('input', event => {
    if (sources.includes((event.target as HTMLInputElement).name)) {
      fill();
    }
  });
  fill();
}

const DAYS_PER_RENT_PERIOD: Record<string, number> = { WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 365 / 12 };

export function initCaseFactDefaults(form: HTMLFormElement): void {
  const field = (name: string): string =>
    form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value.trim() ?? '';
  fillFromCaseFacts(form, ['arrears-today'], ['outright-mj-arrears', 'suspended-arrears'], () =>
    field('arrears-today')
  );
  fillFromCaseFacts(form, ['current-rent', 'rent-frequency'], ['outright-use-occupation-rate'], () => {
    const rent = parseMoney(field('current-rent'));
    const days = DAYS_PER_RENT_PERIOD[field('rent-frequency')];
    return rent === undefined || !days ? '' : (rent / days).toFixed(2);
  });
}

/** A money judgment and an adjourned money claim are alternatives; same terms only applies to a judgment. */
export function initSuspendedMoneyOptions(form: HTMLFormElement): void {
  const option = (value: string): HTMLInputElement | null =>
    form.querySelector<HTMLInputElement>(`input[name="suspended-options"][value="${value}"]`);
  const judgment = option('money-judgment-arrears');
  const adjourned = option('money-claim-adjourned');
  const sameTerms = form.querySelector<HTMLInputElement>('input[name="suspended-mj-same-terms"]');
  if (!judgment || !adjourned || !sameTerms) {
    return;
  }
  const sync = (changed: HTMLInputElement, other: HTMLInputElement): void => {
    if (changed.checked && other.checked) {
      other.click(); // GOV.UK Frontend keeps the conditional reveal in step with a click.
    }
    sameTerms.disabled = !judgment.checked;
    sameTerms.checked = sameTerms.checked && judgment.checked;
  };
  judgment.addEventListener('change', () => sync(judgment, adjourned));
  adjourned.addEventListener('change', () => sync(adjourned, judgment));
  sync(judgment, adjourned);
}

/**
 * Costs payable on the same terms as the suspension only exist for a suspended order. Other order
 * types disable them, which leaves them out of the form data but keeps the choice for coming back.
 */
export function syncSuspendedOnlyCosts(form: HTMLFormElement, type: OrderType): void {
  const hidden = type !== 'SUSPENDED_POSSESSION';
  const column = form.querySelector<HTMLElement>('[data-suspended-costs-column]');
  if (column) {
    column.hidden = hidden;
  }
  form.querySelectorAll<HTMLInputElement>('input[name="costs-choice"]').forEach(choice => {
    if (SAME_TERMS_COSTS.has(choice.value)) {
      choice.disabled = hidden;
    }
  });
}

const builders: Record<OrderType, (data: OrderData) => DocWeaveDocument> = {
  OUTRIGHT_POSSESSION: buildOutrightOrder,
  SUSPENDED_POSSESSION: buildSuspendedOrder,
  ADJOURNMENT: buildAdjournmentOrder,
  STRIKE_OUT_DISMISSAL: buildStrikeOutDismissalOrder,
  FREE_FORM: buildFreeFormOrder,
};

/** The generated order for the form's current answers and selected order type. */
export function buildOrderDocument(form: HTMLFormElement): DocWeaveDocument {
  const type = form.querySelector<HTMLInputElement>('#order-type')?.value as OrderType;
  return builders[type](readOrderData(form));
}

export function initMakeOrder(): void {
  const form = document.querySelector<HTMLFormElement>('#make-order-form');
  if (!form) {
    return;
  }
  initDatePills(form);
  initOptionRows(form);
  initCaseFactsToggle(form);
  initCaseFactDefaults(form);
  initSuspendedMoneyOptions(form);
  const suspendedBy = dateParts(form, 'suspended-by-date');
  if (suspendedBy && !suspendedBy.some(part => part.value)) {
    setDate(suspendedBy, daysFromToday(14));
  }

  const mount = document.querySelector<HTMLElement>('#order-editor');
  const documentField = document.querySelector<HTMLTextAreaElement>('#order-document');
  const orderTypeField = document.querySelector<HTMLInputElement>('#order-type');
  if (!mount || !documentField || !orderTypeField) {
    return;
  }

  // One document per order type, so switching tabs and back keeps any edits.
  const documents: Partial<Record<OrderType, DocWeaveSnapshot>> = {};
  try {
    const saved = JSON.parse(documentField.value) as DocWeaveSnapshot | null;
    if (saved) {
      documents[orderTypeField.value as OrderType] = saved;
    }
  } catch {
    // A document that does not parse is regenerated from the form.
  }
  let orderType: OrderType | undefined;
  const editor = createDocEditor({
    mount,
    label: 'Order',
    templates: {
      url: '/docweave/templates',
      csrfToken: () => form.querySelector<HTMLInputElement>('input[name="_csrf"]')?.value,
    },
    onChange: snapshot => {
      if (orderType) {
        documents[orderType] = snapshot;
        documentField.value = JSON.stringify(snapshot);
      }
    },
  });
  const render = (): void => editor.render(buildOrderDocument(form));
  const selectOrderType = (type: OrderType): void => {
    if (orderType === type) {
      return;
    }
    orderType = type;
    orderTypeField.value = type;
    syncSuspendedOnlyCosts(form, type);
    editor.load(documents[type]);
    render();
  };

  // GOV.UK tabs record the open tab in the fragment for clicks, arrow keys and history.
  const tabs = Array.from(form.querySelectorAll<HTMLAnchorElement>('[data-order-type]'));
  const savedTab = tabs.find(tab => tab.dataset.orderType === orderTypeField.value);
  const tabType = (): OrderType | undefined =>
    tabs.find(tab => tab.hash === window.location.hash)?.dataset.orderType as OrderType | undefined;
  const followTab = (): void => {
    const type = tabType();
    if (type) {
      selectOrderType(type);
    }
  };
  window.addEventListener('hashchange', () => {
    // The page opened without a fragment (see startWithSavedOrderTab), so going back to it reopens the saved tab.
    if (!window.location.hash && savedTab) {
      window.history.replaceState(window.history.state, '', savedTab.hash);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    followTab();
  });
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.addEventListener('submit', followTab);

  selectOrderType(tabType() ?? (orderTypeField.value as OrderType));
}

/**
 * Starts GOV.UK's components with the saved order type's tab open. GOV.UK tabs open the tab the
 * fragment names, or else the first, so the fragment names the saved tab while they start and is
 * then taken away again: left in place, the browser would scroll to it once the page loads, past
 * the top of the page or the error summary of a refused submission.
 */
export function startWithSavedOrderTab(start: () => void): void {
  const orderType = document.querySelector<HTMLInputElement>('#make-order-form #order-type')?.value;
  const savedTab = Array.from(document.querySelectorAll<HTMLAnchorElement>('#make-order-form [data-order-type]')).find(
    tab => tab.dataset.orderType === orderType
  );
  if (window.location.hash || !savedTab) {
    start();
    return;
  }
  const url = window.location.href;
  window.history.replaceState(window.history.state, '', savedTab.hash);
  try {
    start();
  } finally {
    window.history.replaceState(window.history.state, '', url);
  }
}
