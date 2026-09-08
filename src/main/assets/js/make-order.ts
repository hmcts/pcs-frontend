import { type DocWeaveDocument, type DocWeaveSnapshot, createOrderEditor } from '@hmcts-cft/docweave';

import { type MakeOrderType as OrderType } from '../../utils/makeOrderValidation';

import { readOrderData } from './make-order/data';
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
export function initDatePills(form: HTMLFormElement, signal?: AbortSignal): void {
  form.addEventListener(
    'input',
    event => {
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
    },
    { signal }
  );

  form.addEventListener(
    'click',
    event => {
      const pill = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-date-pill-days]') : null;
      const control = pill?.closest<HTMLElement>('.pcs-date-with-pills');
      const day = control?.querySelector<HTMLInputElement>('input[name$="-day"]');
      const parts = day && dateParts(control!, day.name.slice(0, -'-day'.length));
      if (!pill || !parts) {
        return;
      }
      setDate(parts, daysFromToday(Number(pill.dataset.datePillDays)));
      parts[0].dispatchEvent(new Event('input', { bubbles: true }));
    },
    { signal }
  );
}

// Typing a date in a row implies choosing that row's option, so select it rather than
// leaving the judge with a date recorded against an unselected radio. Selection is on
// input, not focus, so tabbing through the rows does not silently change the answer.
export function initOptionRows(form: HTMLFormElement, signal?: AbortSignal): void {
  form.addEventListener(
    'input',
    event => {
      const target = event.target as Element | null;
      const radio = target
        ?.closest('.pcs-option-row__fields')
        ?.closest('[data-option-row]')
        ?.querySelector<HTMLInputElement>('input[type="radio"]');
      if (radio && !radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    { signal }
  );
}

export function initCaseFactsToggle(form: HTMLFormElement, signal?: AbortSignal): void {
  const caseFacts = form.querySelector<HTMLElement>('[data-case-facts]');
  const toggle = caseFacts?.querySelector<HTMLButtonElement>('[data-case-facts-toggle]');
  const content = document.getElementById(toggle?.getAttribute('aria-controls') ?? '');
  if (!caseFacts || !toggle || !content) {
    return;
  }
  toggle.addEventListener(
    'click',
    () => {
      const collapse = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!collapse));
      toggle.textContent = collapse ? 'Show case facts' : 'Hide case facts';
      content.hidden = collapse;
      caseFacts.classList.toggle('pcs-case-facts--collapsed', collapse);
    },
    { signal }
  );
}

/** A money judgment and an adjourned money claim are alternatives; same terms only applies to a judgment. */
export function initSuspendedMoneyOptions(form: HTMLFormElement, signal?: AbortSignal): void {
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
  judgment.addEventListener('change', () => sync(judgment, adjourned), { signal });
  adjourned.addEventListener('change', () => sync(adjourned, judgment), { signal });
  sync(judgment, adjourned);
}

/** Costs payable on the same terms as the suspension only exist for a suspended order. */
export function syncSuspendedOnlyCosts(form: HTMLFormElement, type: OrderType): void {
  const hidden = type !== 'SUSPENDED_POSSESSION';
  const column = form.querySelector<HTMLElement>('[data-suspended-costs-column]');
  if (column) {
    column.hidden = hidden;
  }
  form.querySelectorAll<HTMLInputElement>('input[name="costs-choice"]').forEach(choice => {
    if (SAME_TERMS_COSTS.has(choice.value)) {
      choice.disabled = hidden;
      choice.checked = choice.checked && !hidden;
    }
  });
}

const builders: Record<OrderType, (data: ReturnType<typeof readOrderData>) => DocWeaveDocument> = {
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

// Returns a teardown so a module reload can dispose the editor. Without it a second
// editor is created over the same mount, which DocWeave rejects.
export function initMakeOrder(): () => void {
  const form = document.querySelector<HTMLFormElement>('#make-order-form');
  if (!form) {
    return () => undefined;
  }
  const listeners = new AbortController();
  const { signal } = listeners;
  initDatePills(form, signal);
  initOptionRows(form, signal);
  initCaseFactsToggle(form, signal);
  initSuspendedMoneyOptions(form, signal);
  const suspendedBy = dateParts(form, 'suspended-by-date');
  if (suspendedBy && !suspendedBy.some(part => part.value)) {
    setDate(suspendedBy, daysFromToday(14));
  }

  const mount = document.querySelector<HTMLElement>('#order-editor');
  const documentField = document.querySelector<HTMLTextAreaElement>('#order-document');
  const orderTypeField = document.querySelector<HTMLInputElement>('#order-type');
  const editorRegion = document.querySelector<HTMLElement>('#order-preview-editor');
  if (!mount || !documentField || !orderTypeField || !editorRegion) {
    return () => listeners.abort();
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
  let editor: ReturnType<typeof createOrderEditor> | undefined;
  let editorType: OrderType | undefined;
  const store = (type: OrderType, snapshot: DocWeaveSnapshot): void => {
    documents[type] = snapshot;
    documentField.value = JSON.stringify(snapshot);
  };
  const persist = (): void => {
    if (editor && editorType) {
      store(editorType, editor.getSnapshot());
    }
  };
  const render = (): void => {
    if (editor && editorType === orderTypeField.value) {
      editor.render(buildOrderDocument(form));
    }
  };
  const selectOrderType = (type: OrderType): void => {
    if (editorType === type) {
      return;
    }
    persist();
    editor?.destroy();
    orderTypeField.value = type;
    editorType = type;
    syncSuspendedOnlyCosts(form, type);
    editor = createOrderEditor({
      mount,
      initialSnapshot: documents[type],
      templates: {
        url: '/docweave/templates',
        csrfToken: () => form.querySelector<HTMLInputElement>('input[name="_csrf"]')?.value,
      },
      onChange: snapshot => store(type, snapshot),
    });
    render();
  };

  // GOV.UK tabs record the open tab in the fragment for clicks, arrow keys and history.
  const tabs = Array.from(form.querySelectorAll<HTMLAnchorElement>('[data-order-type]'));
  const tabType = (): OrderType | undefined =>
    tabs.find(tab => tab.hash === window.location.hash)?.dataset.orderType as OrderType | undefined;
  const followTab = (): void => {
    const type = tabType();
    if (type) {
      selectOrderType(type);
    }
  };
  window.addEventListener('hashchange', followTab, { signal });
  const renderForFormControl = (event: Event): void => {
    if (!(event.target instanceof Node && editorRegion.contains(event.target))) {
      render();
    }
  };
  form.addEventListener('input', renderForFormControl, { signal });
  form.addEventListener('change', renderForFormControl, { signal });
  form.addEventListener(
    'submit',
    () => {
      followTab();
      persist();
    },
    { signal }
  );

  selectOrderType(tabType() ?? (orderTypeField.value as OrderType));
  const savedTab = tabs.find(tab => tab.dataset.orderType === orderTypeField.value);
  if (!window.location.hash && savedTab) {
    // GOV.UK opens its first tab when there is no fragment; reopen the saved one without a history entry.
    window.history.replaceState(window.history.state, '', savedTab.hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  return () => {
    listeners.abort();
    persist();
    editor?.destroy();
    editor = undefined;
    editorType = undefined;
  };
}
