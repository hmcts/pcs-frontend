import {
  type CreateDocEditorOptions,
  type DocWeaveDocument,
  createDocEditor,
  parseSnapshot,
} from '@hmcts-cft/docweave';

import { WITHOUT_HEARING, parseMoney, workingDayOnOrAfter } from '../../utils/makeOrderFormat';
import { type MakeOrderType as OrderType } from '../../utils/makeOrderValidation';

import { chosenMadeAt, readOrderContext, readOrderData } from './make-order/data';
import { SAME_TERMS_COSTS } from './make-order/wording/common';
import { buildOrder } from './make-order/wording/order';

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

/** A date filled in quickly in the control: the next working day on or after it when the control asks for one. */
function quickDate(control: Element, date: Date, bankHolidays: readonly string[]): Date {
  return control.closest('[data-working-days]') ? workingDayOnOrAfter(date, bankHolidays) : date;
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
  const { bankHolidays } = readOrderContext(form);
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
    setDate(
      parts,
      quickDate(
        day,
        unit === 'm' ? monthsFromToday(amount) : daysFromToday(amount * (unit === 'w' ? 7 : 1)),
        bankHolidays
      )
    );
  });

  form.addEventListener('click', event => {
    const pill = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-date-pill-days]') : null;
    const control = pill?.closest<HTMLElement>('.pcs-date-with-pills');
    const day = control?.querySelector<HTMLInputElement>('input[name$="-day"]');
    const parts = day && dateParts(control!, day.name.slice(0, -'-day'.length));
    if (!pill || !parts) {
      return;
    }
    setDate(parts, quickDate(pill, daysFromToday(Number(pill.dataset.datePillDays)), bankHolidays));
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

/** Each hearing's case facts fold away on their own. */
export function initCaseFactsToggle(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('[data-case-facts]').forEach(caseFacts => {
    const toggle = caseFacts.querySelector<HTMLButtonElement>('[data-case-facts-toggle]')!;
    const content = document.getElementById(toggle.getAttribute('aria-controls')!)!;
    toggle.addEventListener('click', () => {
      const collapse = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!collapse));
      toggle.textContent = collapse ? 'Show case facts' : 'Hide case facts';
      content.hidden = collapse;
      caseFacts.classList.toggle('pcs-case-facts--collapsed', collapse);
    });
  });
}

/**
 * Shows the parts of the form the judge's choice of when the order is made asks for, and takes the rest out of it,
 * so what the form sends and the order says are only that choice's. A part is marked with whose it is: a hearing's
 * id, "hearing" for any hearing, "without-hearing", or "not-" and a hearing's id for every choice but that hearing.
 */
export function showMadeAt(form: HTMLFormElement): void {
  const madeAt = chosenMadeAt(form);
  form.querySelectorAll<HTMLFieldSetElement | HTMLInputElement>('[data-made-at]').forEach(part => {
    const whose = part.dataset.madeAt!;
    const shown =
      whose === madeAt ||
      (whose === 'hearing' && madeAt !== WITHOUT_HEARING) ||
      (whose.startsWith('not-') && whose !== `not-${madeAt}`);
    part.disabled = !shown;
    if (part instanceof HTMLFieldSetElement) {
      part.hidden = !shown;
      return;
    }
    // One answer to a question, which goes back to the question's first when the choice takes it away.
    part.closest<HTMLElement>('.govuk-radios__item')!.hidden = !shown;
    if (!shown && part.checked) {
      form.querySelector<HTMLInputElement>(`input[name="${part.name}"]:not([data-made-at])`)!.click();
    }
  });
}

/**
 * Fills targets with a value worked out from the case facts, while each target is empty or still
 * holds the value last filled in, so the judge's own figure is never overwritten.
 */
function fillFromCaseFacts(
  form: HTMLFormElement,
  sources: () => string[],
  targets: string[],
  derive: () => string
): void {
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
    // The facts are the chosen hearing's, so another choice of hearing changes them too.
    if ([...sources(), 'made-at'].includes((event.target as HTMLInputElement).name)) {
      fill();
    }
  });
  fill();
}

const DAYS_PER_RENT_PERIOD: Record<string, number> = { WEEKLY: 7, FORTNIGHTLY: 14, MONTHLY: 365 / 12 };

export function initCaseFactDefaults(form: HTMLFormElement): void {
  // A fact of the hearing the order is made at; an order made without one has none.
  const fact = (name: string): string => `hearing-${chosenMadeAt(form)}-${name}`;
  const facts =
    (...names: string[]) =>
    (): string[] =>
      names.map(fact);
  const field = (name: string): string =>
    form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${fact(name)}"]`)?.value.trim() ?? '';
  fillFromCaseFacts(form, facts('arrears-today'), ['outright-mj-arrears', 'suspended-arrears'], () =>
    field('arrears-today')
  );
  fillFromCaseFacts(form, facts('current-rent', 'rent-frequency'), ['outright-use-occupation-rate'], () => {
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

/** The generated order for the form's current answers and selected order type. */
export function buildOrderDocument(form: HTMLFormElement): DocWeaveDocument {
  const type = form.querySelector<HTMLInputElement>('#order-type')?.value as OrderType;
  return buildOrder(type, readOrderData(form));
}

/** Limiting the costs of a transfer to the High Court goes with the transfer. */
export function initEnforcementTransfer(form: HTMLFormElement): void {
  const transfer = form.querySelector<HTMLInputElement>('input[name="transfer-enforcement"]');
  const limitCosts = form.querySelector<HTMLInputElement>('input[name="transfer-enforcement-costs"]');
  transfer?.addEventListener('change', () => {
    if (!transfer.checked && limitCosts) {
      limitCosts.checked = false;
    }
  });
}

/** What follows a decision on an application, shown in its row while that decision is chosen. */
export function initApplicationDecisions(form: HTMLFormElement): void {
  form.addEventListener('change', ({ target }) => {
    if (!(target instanceof HTMLInputElement) || !target.name.endsWith('-decision')) {
      return;
    }
    target
      .closest('[data-application]')
      ?.querySelectorAll<HTMLElement>('[data-decision-shows]')
      .forEach(follows => {
        follows.hidden = follows.dataset.decisionShows !== target.value;
      });
  });
}

/** The snapshot field restores the saved document and holds edits as they are made. */
function bindOrderEditor(form: HTMLFormElement, options?: Pick<CreateDocEditorOptions, 'templates'>) {
  const mount = form.querySelector<HTMLElement>('#order-editor');
  const documentField = form.querySelector<HTMLTextAreaElement>('#order-document');
  if (!mount || !documentField) {
    return;
  }

  const editor = createDocEditor({
    ...options,
    mount,
    label: 'Order',
    field: documentField,
    onError: () => (documentField.value = ''),
  });
  // Keep JSON in the editor field; encode only the outgoing value.
  form.addEventListener('formdata', ({ formData }) => {
    formData.set(
      'orderDocument',
      new TextEncoder().encode(documentField.value).toBase64({ alphabet: 'base64url', omitPadding: true })
    );
  });
  return editor;
}

/** Review the judge's saved document without regenerating it from form answers, and offer to start again from it. */
export function initOrderReview(): void {
  const form = document.querySelector<HTMLFormElement>('#review-order-form');
  const editor = form && bindOrderEditor(form);
  const restore = form?.querySelector<HTMLButtonElement>('#restore-judge-wording');
  const judges = form?.querySelector('#judge-order-document')?.textContent;
  if (!editor || !restore || !judges) {
    return;
  }
  const snapshot = parseSnapshot(judges);
  restore.hidden = false;
  restore.addEventListener('click', () => {
    form.querySelector<HTMLTextAreaElement>('#order-document')!.value = judges;
    editor.load(snapshot);
  });
}

export function initMakeOrder(): void {
  const form = document.querySelector<HTMLFormElement>('#make-order-form');
  if (!form) {
    return;
  }
  // First, so everything after it reads the form as the choice of when the order is made leaves it.
  showMadeAt(form);
  initDatePills(form);
  initOptionRows(form);
  initCaseFactsToggle(form);
  initCaseFactDefaults(form);
  initSuspendedMoneyOptions(form);
  initEnforcementTransfer(form);
  const suspendedBy = dateParts(form, 'suspended-by-date');
  if (suspendedBy && !suspendedBy.some(part => part.value)) {
    setDate(suspendedBy, daysFromToday(14));
  }

  const orderTypeField = form.querySelector<HTMLInputElement>('#order-type');
  const editor = bindOrderEditor(form, {
    templates: {
      url: '/docweave/templates',
      csrfToken: () => form.querySelector<HTMLInputElement>('input[name="_csrf"]')?.value,
    },
  });
  if (!editor || !orderTypeField) {
    return;
  }

  // One document whatever the order type: switching type changes the generated clauses in place, so wording the
  // judge inserted stays, but their edits to a type's own clauses go with them.
  const render = (): void => editor.render(buildOrderDocument(form));
  const selectOrderType = (type: OrderType): void => {
    orderTypeField.value = type;
    syncSuspendedOnlyCosts(form, type);
    render();
  };

  // GOV.UK tabs record the open tab in the fragment for clicks, arrow keys and history.
  const tabs = Array.from(form.querySelectorAll<HTMLAnchorElement>('[data-order-type]'));
  const savedTab = tabs.find(tab => tab.dataset.orderType === orderTypeField.value);
  const tabType = (): OrderType | undefined =>
    tabs.find(tab => tab.hash === window.location.hash)?.dataset.orderType as OrderType | undefined;
  // With an application open, the claim's tabs wait behind a tick box; until it is ticked the order is on the
  // applications alone, and the open tab is what ticking it goes to.
  const claimOrder = form.querySelector<HTMLInputElement>('input[name="claim-order"]');
  const claimTabs = form.querySelector<HTMLElement>('[data-claim-order]');
  const orderingOnClaim = (): boolean => !claimOrder || claimOrder.checked;
  const openTabType = (): OrderType =>
    (tabType() ??
      form.querySelector<HTMLAnchorElement>('.govuk-tabs__list-item--selected [data-order-type]')?.dataset.orderType ??
      tabs[0]?.dataset.orderType) as OrderType;
  const followTab = (): void => {
    if (!orderingOnClaim()) {
      return;
    }
    const type = tabType();
    if (type) {
      selectOrderType(type);
    }
  };
  claimOrder?.addEventListener('change', () => {
    if (claimTabs) {
      claimTabs.hidden = !claimOrder.checked;
    }
    selectOrderType(claimOrder.checked ? openTabType() : 'NO_ORDER_ON_CLAIM');
  });
  window.addEventListener('hashchange', () => {
    // The page opened without a fragment (see startWithSavedOrderTab), so going back to it reopens the saved tab.
    if (!window.location.hash && savedTab) {
      window.history.replaceState(window.history.state, '', savedTab.hash);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    followTab();
  });
  form.addEventListener('change', event => {
    if ((event.target as HTMLInputElement).name === 'made-at') {
      showMadeAt(form);
    }
  });
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.addEventListener('submit', followTab);
  // The applicant's draft order goes in as the judge's own clauses, after "IT IS ORDERED THAT:", which no decision
  // takes away.
  form.addEventListener('click', ({ target }) => {
    const button = (target as Element).closest<HTMLElement>('[data-draft-order]');
    if (button && editor.insertHtml(button.dataset.draftOrder!, { at: { after: 'paragraph:ordered-that' } })) {
      const reference = button.closest<HTMLElement>('[data-application]')!.dataset.applicationReference;
      form.querySelector('#order-editor [role="status"]')!.textContent =
        `The draft order from application ${reference} is added.`;
    }
  });
  selectOrderType(orderingOnClaim() ? (tabType() ?? (orderTypeField.value as OrderType)) : 'NO_ORDER_ON_CLAIM');
  initApplicationDecisions(form);
}

/**
 * Starts GOV.UK's components with the tab the page marks open: the saved order type's, or the first the order is
 * offered where it is made. GOV.UK tabs open the tab the fragment names, or else the first, so the fragment names
 * that tab while they start and is then taken away again: left in place, the browser would scroll to it once the
 * page loads, past the top of the page or the error summary of a refused submission.
 */
export function startWithSavedOrderTab(start: () => void): void {
  const savedTab = document.querySelector<HTMLAnchorElement>(
    '#make-order-form .govuk-tabs__list-item--selected [data-order-type]'
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
