import { type DocWeaveDocument, type DocWeaveSnapshot, createOrderEditor } from '@hmcts-cft/docweave';

import { type MakeOrderType as OrderType } from '../../utils/makeOrderValidation';

import { readOrderData } from './make-order/data';
import { buildAdjournmentOrder } from './make-order/wording/adjournment';
import { SAME_TERMS_COSTS } from './make-order/wording/common';
import { buildFreeFormOrder } from './make-order/wording/free-form';
import { buildOutrightOrder } from './make-order/wording/outright';
import { buildStrikeOutDismissalOrder } from './make-order/wording/strike-out';
import { buildSuspendedOrder } from './make-order/wording/suspended';

function defaultDate(form: HTMLFormElement, prefix: string, daysFromToday: number): void {
  const inputs = ['day', 'month', 'year'].map(part =>
    form.querySelector<HTMLInputElement>(`input[name="${prefix}-${part}"]`)
  );
  if (inputs.some(input => !input) || inputs.some(input => input?.value)) {
    return;
  }
  const value = new Date();
  value.setDate(value.getDate() + daysFromToday);
  inputs[0]!.value = String(value.getDate()).padStart(2, '0');
  inputs[1]!.value = String(value.getMonth() + 1).padStart(2, '0');
  inputs[2]!.value = String(value.getFullYear());
}

export function initDatePills(form: HTMLFormElement, signal?: AbortSignal): void {
  form.addEventListener(
    'input',
    event => {
      if (!(event.target instanceof HTMLInputElement) || !event.target.name.endsWith('-day')) {
        return;
      }

      const shorthand = /^(\d+)\s*([dwm])$/i.exec(event.target.value.trim());
      if (!shorthand) {
        return;
      }

      const amount = Number(shorthand[1]);
      const unit = shorthand[2].toLowerCase();
      const prefix = event.target.name.slice(0, -'-day'.length);
      const month = form.querySelector<HTMLInputElement>(`input[name="${prefix}-month"]`);
      const year = form.querySelector<HTMLInputElement>(`input[name="${prefix}-year"]`);
      if (!Number.isSafeInteger(amount) || !month || !year) {
        return;
      }

      const value = new Date();
      if (unit === 'm') {
        const dayOfMonth = value.getDate();
        value.setDate(1);
        value.setMonth(value.getMonth() + amount);
        const lastDayOfMonth = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
        value.setDate(Math.min(dayOfMonth, lastDayOfMonth));
      } else {
        value.setDate(value.getDate() + amount * (unit === 'w' ? 7 : 1));
      }

      event.target.value = String(value.getDate()).padStart(2, '0');
      month.value = String(value.getMonth() + 1).padStart(2, '0');
      year.value = String(value.getFullYear());
    },
    { signal }
  );

  form.addEventListener(
    'click',
    event => {
      const pill =
        event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-date-pill-days]') : null;
      const dateControl = pill?.closest<HTMLElement>('.pcs-date-with-pills');
      const days = Number(pill?.dataset.datePillDays);
      if (!pill || !dateControl || !Number.isInteger(days)) {
        return;
      }

      const day = dateControl.querySelector<HTMLInputElement>('input[name$="-day"]');
      const month = dateControl.querySelector<HTMLInputElement>('input[name$="-month"]');
      const year = dateControl.querySelector<HTMLInputElement>('input[name$="-year"]');
      if (!day || !month || !year) {
        return;
      }

      const value = new Date();
      value.setDate(value.getDate() + days);
      day.value = String(value.getDate()).padStart(2, '0');
      month.value = String(value.getMonth() + 1).padStart(2, '0');
      year.value = String(value.getFullYear());
      day.dispatchEvent(new Event('input', { bubbles: true }));
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
      const target = event.target;
      if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
        return;
      }
      const radio = target
        .closest('.pcs-option-row__fields')
        ?.closest('[data-option-row]')
        ?.querySelector<HTMLInputElement>('input[type="radio"]');
      if (!radio || radio.checked) {
        return;
      }
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { signal }
  );
}

export function initCaseFactsToggle(form: HTMLFormElement, signal?: AbortSignal): void {
  const caseFacts = form.querySelector<HTMLElement>('[data-case-facts]');
  const toggle = caseFacts?.querySelector<HTMLButtonElement>('[data-case-facts-toggle]');
  const contentId = toggle?.getAttribute('aria-controls');
  const content = contentId ? document.getElementById(contentId) : null;
  if (!caseFacts || !toggle || !content) {
    return;
  }

  toggle.addEventListener(
    'click',
    () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.textContent = expanded ? 'Show case facts' : 'Hide case facts';
      content.hidden = expanded;
      caseFacts.classList.toggle('pcs-case-facts--collapsed', expanded);
    },
    { signal }
  );
}

export function initSuspendedMoneyOptions(form: HTMLFormElement, signal?: AbortSignal): void {
  const moneyJudgment = form.querySelector<HTMLInputElement>(
    'input[name="suspended-options"][value="money-judgment-arrears"]'
  );
  const moneyClaimAdjourned = form.querySelector<HTMLInputElement>(
    'input[name="suspended-options"][value="money-claim-adjourned"]'
  );
  const sameTerms = form.querySelector<HTMLInputElement>('input[name="suspended-mj-same-terms"]');
  if (!moneyJudgment || !moneyClaimAdjourned || !sameTerms) {
    return;
  }

  const sync = (changed?: HTMLInputElement): void => {
    if (moneyJudgment.checked && moneyClaimAdjourned.checked) {
      if (changed === moneyJudgment) {
        moneyClaimAdjourned.checked = false;
      } else {
        moneyJudgment.checked = false;
      }
    }
    sameTerms.disabled = !moneyJudgment.checked;
    if (!moneyJudgment.checked) {
      sameTerms.checked = false;
    }
    const conditionalId = moneyJudgment.dataset.ariaControls;
    const conditional = conditionalId ? document.getElementById(conditionalId) : null;
    conditional?.classList.toggle('govuk-checkboxes__conditional--hidden', !moneyJudgment.checked);
    moneyJudgment.setAttribute('aria-expanded', String(moneyJudgment.checked));
  };
  moneyJudgment.addEventListener('change', () => sync(moneyJudgment), { signal });
  moneyClaimAdjourned.addEventListener('change', () => sync(moneyClaimAdjourned), { signal });
  sync();
}

export function syncSuspendedOnlyCosts(form: HTMLFormElement, type: OrderType): void {
  const suspendedColumn = form.querySelector<HTMLElement>('[data-suspended-costs-column]');
  const hidden = type !== 'SUSPENDED_POSSESSION';
  if (suspendedColumn) {
    suspendedColumn.hidden = hidden;
  }
  form.querySelectorAll<HTMLInputElement>('input[name="costs-choice"]').forEach(choice => {
    if (!SAME_TERMS_COSTS.has(choice.value)) {
      return;
    }
    choice.disabled = hidden;
    if (choice.disabled) {
      choice.checked = false;
    }
  });
}

// Returns a teardown so a module reload can dispose the editor. Without it a second
// editor is created over the same mount, which DocWeave rejects.
export function initMakeOrder(): () => void {
  const noop = (): void => undefined;
  const form = document.querySelector<HTMLFormElement>('#make-order-form');
  if (!form) {
    return noop;
  }
  const listenerController = new AbortController();
  const { signal } = listenerController;
  initDatePills(form, signal);
  initOptionRows(form, signal);
  initCaseFactsToggle(form, signal);
  defaultDate(form, 'suspended-by-date', 14);
  const mount = document.querySelector<HTMLElement>('#order-editor');
  const documentField = document.querySelector<HTMLTextAreaElement>('#order-document');
  const orderTypeField = document.querySelector<HTMLInputElement>('#order-type');
  const editorRegion = document.querySelector<HTMLElement>('#order-preview-editor');
  if (!mount || !documentField || !orderTypeField || !editorRegion) {
    return () => listenerController.abort();
  }

  let documents: Partial<Record<OrderType, DocWeaveSnapshot>> = {};
  try {
    const parsed = JSON.parse(documentField.value) as DocWeaveSnapshot | null;
    if (parsed) {
      documents[orderTypeField.value as OrderType] = parsed;
    }
  } catch {
    documents = {};
  }
  let editor: ReturnType<typeof createOrderEditor> | undefined;
  let editorType: OrderType | undefined;
  const persistEditor = (): void => {
    if (editor && editorType) {
      documents[editorType] = editor.getSnapshot();
      documentField.value = JSON.stringify(documents[editorType]);
    } else {
      documentField.value = '';
    }
  };
  const builders: Record<OrderType, (data: ReturnType<typeof readOrderData>) => DocWeaveDocument> = {
    OUTRIGHT_POSSESSION: buildOutrightOrder,
    SUSPENDED_POSSESSION: buildSuspendedOrder,
    ADJOURNMENT: buildAdjournmentOrder,
    STRIKE_OUT_DISMISSAL: buildStrikeOutDismissalOrder,
    FREE_FORM: buildFreeFormOrder,
  };
  const render = (): void => {
    const type = orderTypeField.value as OrderType;
    if (!editor || editorType !== type) {
      return;
    }
    editor.render(builders[type](readOrderData(form)));
  };
  const selectOrderType = (type: OrderType): void => {
    if (editorType !== type) {
      persistEditor();
      editor?.destroy();
      editor = undefined;
      editorType = undefined;
    }
    orderTypeField.value = type;
    syncSuspendedOnlyCosts(form, type);
    if (!editor) {
      editorType = type;
      editor = createOrderEditor({
        mount,
        initialSnapshot: documents[type],
        templates: {
          url: '/docweave/templates',
          csrfToken: () => form.querySelector<HTMLInputElement>('input[name="_csrf"]')?.value,
        },
        onChange: value => {
          documents[type] = value;
          documentField.value = JSON.stringify(value);
        },
      });
    }
    render();
  };

  initSuspendedMoneyOptions(form, signal);

  const orderTabs = Array.from(form.querySelectorAll<HTMLAnchorElement>('[data-order-type]'));
  const linkedTab = (): HTMLAnchorElement | undefined => orderTabs.find(tab => tab.hash === window.location.hash);
  const syncOrderType = (): void => {
    const type = linkedTab()?.dataset.orderType as OrderType | undefined;
    if (type && type !== editorType) {
      selectOrderType(type);
    }
  };
  // GOV.UK tabs update the hash for clicks, arrow keys and browser history.
  window.addEventListener('hashchange', syncOrderType, { signal });
  const renderForFormControl = (event: Event): void => {
    if (event.target instanceof Node && editorRegion.contains(event.target)) {
      return;
    }
    render();
  };
  form.addEventListener('input', renderForFormControl, { signal });
  form.addEventListener('change', renderForFormControl, { signal });
  form.addEventListener(
    'submit',
    () => {
      syncOrderType();
      persistEditor();
    },
    { signal }
  );
  selectOrderType((linkedTab()?.dataset.orderType as OrderType | undefined) ?? (orderTypeField.value as OrderType));
  const selectedTab = orderTabs.find(tab => tab.dataset.orderType === orderTypeField.value);
  if (!window.location.hash && selectedTab) {
    // GOV.UK initially opens its first tab when there is no fragment. Restore the
    // saved selection without adding a browser history entry.
    window.history.replaceState(window.history.state, '', selectedTab.hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  return () => {
    listenerController.abort();
    persistEditor();
    editor?.destroy();
    editor = undefined;
    editorType = undefined;
  };
}
