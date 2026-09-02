import {
  type InlineBuilder,
  type OrderBuilder,
  type OrderEditorDocument,
  buildOrder,
  createOrderEditor,
} from '@hmcts-cft/docweave';

type OrderType = 'OUTRIGHT_POSSESSION' | 'SUSPENDED_POSSESSION' | 'ADJOURNMENT' | 'STRIKE_OUT_DISMISSAL' | 'FREE_FORM';

function field(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function selected(form: HTMLFormElement, name: string, value: string): boolean {
  return new FormData(form).getAll(name).includes(value);
}

function date(form: HTMLFormElement, prefix: string): string {
  const day = Number(field(form, `${prefix}-day`));
  const month = Number(field(form, `${prefix}-month`));
  const year = Number(field(form, `${prefix}-year`));
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    !day ||
    !month ||
    !year ||
    value.getUTCDate() !== day ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCFullYear() !== year
  ) {
    return '[date not provided]';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function hasValidDate(form: HTMLFormElement, prefix: string): boolean {
  return date(form, prefix) !== '[date not provided]';
}

function money(value: string): string {
  const amount = Number(value.split(',').join(''));
  return value && Number.isFinite(amount)
    ? amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '[amount not provided]';
}

function hasValidMoney(form: HTMLFormElement, name: string): boolean {
  const value = field(form, name).split(',').join('');
  return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0;
}

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

export function initDatePills(form: HTMLFormElement): void {
  form.addEventListener('click', event => {
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
  });
}

function attendanceParagraphs(form: HTMLFormElement): { id: string; text: string }[] {
  const heard: string[] = [];
  const paragraphs: { id: string; text: string }[] = [];
  form.querySelectorAll<HTMLElement>('[data-attendance-row]').forEach((row, index) => {
    const choice = row.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value;
    const name = row.querySelector<HTMLInputElement>('input[type="text"]')?.value.trim();
    const party = row.dataset.partyKind === 'claimant' ? 'the claimant' : 'the defendant';
    const label = row.dataset.partyLabel ?? party;
    if (!choice) {
      return;
    }
    if (choice === 'letter-only') {
      paragraphs.push({ id: `attendance-letter-${index}`, text: `The Court read a letter from ${name || label}.` });
      return;
    }
    if (choice === 'not-present') {
      paragraphs.push({
        id: `attendance-absent-${index}`,
        text: `The ${label} did not attend the hearing, but the Court was satisfied they had received notice of the hearing, and it was reasonable to proceed in their absence.`,
      });
      return;
    }
    const roles: Record<string, string> = {
      counsel: `counsel for ${party}`,
      solicitor: `solicitor for ${party}`,
      'solicitor-agent': `solicitor's agent for ${party}`,
      'housing-officer': `the housing officer on behalf of ${party}`,
      'duty-adviser': `the duty adviser on behalf of ${party}`,
      'litigant-in-person': `${party} acting in person`,
    };
    heard.push(name ? `${name}, ${roles[choice]}` : roles[choice]);
  });
  if (heard.length) {
    const register = heard.length === 1 ? heard[0] : `${heard.slice(0, -1).join(', ')} and ${heard[heard.length - 1]}`;
    paragraphs.unshift({ id: 'attendance-heard', text: `The Court heard from ${register}.` });
  }
  return paragraphs;
}

function addPreamble(order: OrderBuilder, form: HTMLFormElement): void {
  attendanceParagraphs(form).forEach(paragraph => order.paragraph(paragraph.id, paragraph.text));
  if (selected(form, 'recitals', 'yes')) {
    field(form, 'recital')
      .split(/\n\s*\n/)
      .filter(Boolean)
      .forEach((text, index) => order.paragraph(`recital-${index}`, text));
  }
  order.paragraph('ordered-that', 'IT IS ORDERED THAT:');
}

function sentenceCase(value: string): string {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function possessive(value: string): string {
  return value.endsWith('s') ? `${value}'` : `${value}'s`;
}

function joinList(values: string[]): string {
  if (values.length < 2) {
    return values[0] ?? '';
  }
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

function partyLabels(form: HTMLFormElement): {
  claimant: string;
  defendant: string;
  defendantVerb: (singular: string, plural: string) => string;
} {
  const claimant = Number(form.dataset.claimantCount) > 1 ? 'the claimants' : 'the claimant';
  const multipleDefendants = Number(form.dataset.defendantCount) > 1;
  return {
    claimant,
    defendant: multipleDefendants ? 'the defendants' : 'the defendant',
    defendantVerb: (singular, plural) => (multipleDefendants ? plural : singular),
  };
}

function caseManCostsText(form: HTMLFormElement, claimant: string, defendant: string): string {
  if (!selected(form, 'costs', 'yes')) {
    return '';
  }
  const choice = field(form, 'costs-choice');
  const costs: Record<string, string> = {
    'def-pay-cl-fixed': `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs of the claim in the fixed sum of £${money(field(form, 'costs-def-pay-cl-fixed-amount'))}.`,
    'def-pay-cl-summary': `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs in the summarily assessed sum of £${money(field(form, 'costs-def-pay-cl-summary-amount'))}.`,
    'cl-pay-def-summary': `${sentenceCase(claimant)} shall pay ${possessive(defendant)} costs in the summarily assessed sum of £${money(field(form, 'costs-cl-pay-def-summary-amount'))}.`,
    'in-case': 'Costs in the case.',
    reserved: 'Costs reserved.',
    'no-order': 'No order as to costs.',
    'public-funding': `There be a detailed assessment of ${possessive(defendant)} publicly funded costs.`,
    'same-terms': `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs.`,
    'fixed-same-terms': `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs of the claim in the fixed sum of £${money(field(form, 'costs-fixed-same-terms-amount'))}.`,
    'summary-same-terms': `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs in the summarily assessed sum of £${money(field(form, 'costs-summary-same-terms-amount'))}.`,
    other: field(form, 'costs-other-text'),
  };
  return costs[choice] ?? '';
}

function buildOutrightOrder(form: HTMLFormElement) {
  const address = form.dataset.propertyAddress || '[property address not provided]';
  const claimants = form.dataset.claimants || 'the claimant(s)';
  const defendants = form.dataset.defendants || 'the defendant(s)';
  const options = new Set(new FormData(form).getAll('outright-options').filter(entry => typeof entry === 'string'));
  const hasMoneyJudgment = options.has('money-judgment');
  const hasMoneyJudgmentArrears = hasMoneyJudgment && selected(form, 'outright-mj-sections', 'arrears');
  const hasMoneyJudgmentPaymentPlan = hasMoneyJudgment && selected(form, 'outright-mj-sections', 'payment-plan');

  return buildOrder(order => {
    addPreamble(order, form);
    order.orderedList('outright-clauses', list => {
      list.item('possession', content => {
        content
          .text('The defendant(s) must give up possession of ')
          .generatedText('address', address)
          .text(' to the claimant(s) ');
        if (field(form, 'outright-possession') === 'forthwith') {
          content.generatedText('deadline', 'forthwith').text('.');
        } else {
          content.text('on or before ').generatedText('deadline', date(form, 'outright-by-date')).text('.');
        }
      });
      list.item('grounds', content => {
        content
          .text('This order for possession was made on ')
          .generatedText('type', field(form, 'outright-grounds-type') || '[grounds type not provided]')
          .text(' grounds, namely ')
          .generatedText('details', field(form, 'outright-grounds-details') || '[grounds not provided]')
          .text('.');
      });
      if (hasMoneyJudgmentArrears) {
        list.item('money-judgment', content => {
          const arrears = Number(field(form, 'outright-mj-arrears').split(',').join(''));
          const interestText = field(form, 'outright-mj-interest');
          const interest = Number(interestText.split(',').join(''));
          const total =
            Number.isFinite(arrears) && interestText && Number.isFinite(interest)
              ? String(arrears + interest)
              : field(form, 'outright-mj-arrears');
          content
            .text(`Judgment for the claimant(s) in the ${interestText ? 'total ' : ''}sum of £`)
            .generatedText('amount', money(total))
            .text('.');
        });
      }
      if (options.has('use-occupation')) {
        list.item('use-occupation', content => {
          content
            .generatedText('defendants', defendants)
            .text(' must pay to ')
            .generatedText('claimants', claimants)
            .text(' £')
            .generatedText('rate', money(field(form, 'outright-use-occupation-rate')))
            .text(' per day for damages for unlawful occupation from ')
            .generatedText('date', date(form, 'outright-use-occupation-from-date'))
            .text(` until possession of the property is given to ${claimants}.`);
        });
      }
      if (selected(form, 'costs', 'yes')) {
        const choice = field(form, 'costs-choice');
        const costs: Record<string, string> = {
          'def-pay-cl-fixed': `The defendant(s) must pay the claimant(s)' fixed costs of £${money(field(form, 'costs-def-pay-cl-fixed-amount'))}.`,
          'def-pay-cl-summary': `The defendant(s) must pay the claimant(s)' costs, summarily assessed at £${money(field(form, 'costs-def-pay-cl-summary-amount'))}.`,
          'cl-pay-def-summary': `The claimant(s) must pay the defendant(s)' costs, summarily assessed at £${money(field(form, 'costs-cl-pay-def-summary-amount'))}.`,
          'in-case': 'Costs in the case.',
          reserved: 'Costs reserved.',
          'no-order': 'There is no order as to costs.',
          'public-funding':
            "The defendant(s)' costs are to be subject to detailed assessment under the public funding regulations.",
          'same-terms': 'Costs are payable on the same terms as the suspension.',
          'fixed-same-terms':
            "The defendant(s) must pay the claimant(s)' fixed costs, payable on the same terms as the suspension.",
          'summary-same-terms':
            "The defendant(s) must pay the claimant(s)' summary assessed costs, payable on the same terms as the suspension.",
          other: field(form, 'costs-other-text') || '[costs order not provided]',
        };
        list.item('costs', costs[choice] || '[costs order not provided]');
      }
      if (
        hasMoneyJudgmentPaymentPlan &&
        (selected(form, 'outright-mj-plan', 'lump') || selected(form, 'outright-mj-plan', 'instalments'))
      ) {
        list.item('payment-terms', content => {
          content.text('The above sums must be paid by the defendant(s) to the claimant(s) ');
          if (selected(form, 'outright-mj-plan', 'lump')) {
            content
              .text('by a payment of £')
              .generatedText('lump-amount', money(field(form, 'outright-mj-lump-amount')))
              .text(' by ')
              .generatedText('lump-date', date(form, 'outright-mj-lump-date'));
            if (selected(form, 'outright-mj-balance', 'yes')) {
              content
                .text(' and the balance by ')
                .generatedText('balance-date', date(form, 'outright-mj-balance-date'));
            }
          }
          if (selected(form, 'outright-mj-plan', 'lump') && selected(form, 'outright-mj-plan', 'instalments')) {
            content.text(', and ');
          }
          if (selected(form, 'outright-mj-plan', 'instalments')) {
            content
              .text('by instalment payments of £')
              .generatedText('instalment-amount', money(field(form, 'outright-mj-inst-amount')))
              .text(` every ${field(form, 'outright-mj-inst-freq') || '[frequency not provided]'}, first payment by `)
              .generatedText('instalment-date', date(form, 'outright-mj-inst-date'));
          }
          content.text('.');
        });
      }
      if (options.has('transfer-high-court')) {
        list.item(
          'high-court-transfer',
          'The order for possession is transferred to the High Court solely for the purpose of enforcement.'
        );
      }
    });
  });
}

function addSuspendedOneOffTerm(content: InlineBuilder, form: HTMLFormElement, claimant: string): void {
  content
    .text('payment of £')
    .generatedText('suspended-one-off-amount', money(field(form, 'suspended-oneoff-amount')))
    .text(` to ${claimant} by `)
    .generatedText('suspended-one-off-date', date(form, 'suspended-oneoff-date'));
}

function addSuspendedInstalmentTerm(content: InlineBuilder, form: HTMLFormElement, claimant: string): void {
  const frequency = field(form, 'suspended-instalment-frequency') === 'weekly' ? 'week' : 'month';
  content
    .text('payments of £')
    .generatedText('suspended-instalment-amount', money(field(form, 'suspended-instalment-amount')))
    .text(` to ${claimant} every ${frequency}, the first instalment to be paid on or before `)
    .generatedText('suspended-instalment-date', date(form, 'suspended-instalment-date'));
}

export function buildSuspendedOrder(form: HTMLFormElement): ReturnType<typeof buildOrder> {
  const address = form.dataset.propertyAddress || '[property address not provided]';
  const { claimant, defendant, defendantVerb } = partyLabels(form);
  const options = new FormData(form).getAll('suspended-options').map(String);
  const paymentTerms = new FormData(form).getAll('suspended-payment-terms').map(String);
  const costsChoice = field(form, 'costs-choice');

  return buildOrder(order => {
    addPreamble(order, form);
    order.orderedList('suspended-clauses', list => {
      list.item('suspended-possession', content => {
        content
          .text(`${sentenceCase(defendant)} must give up possession of `)
          .generatedText('suspended-address', address)
          .text(` to ${claimant} on or before `)
          .generatedText('suspended-deadline', date(form, 'suspended-by-date'))
          .text('.');
      });

      if (options.includes('money-claim-adjourned')) {
        list.item('suspended-money-claim-adjourned', 'The money claim is adjourned generally with liberty to restore.');
      } else if (options.includes('money-judgment-arrears')) {
        list.item('suspended-money-judgment', content => {
          content
            .text('Judgment for the claimant in the sum of £')
            .generatedText('suspended-money-judgment-amount', money(field(form, 'suspended-arrears')))
            .text('.');
        });
      }

      const costsText = caseManCostsText(form, claimant, defendant);
      if (costsText) {
        list.item('suspended-costs', costsText);
      }

      if (options.includes('use-occupation')) {
        list.item('suspended-use-occupation', content => {
          content
            .text(`${sentenceCase(defendant)} must pay to ${claimant} £`)
            .generatedText('suspended-use-occupation-rate', money(field(form, 'suspended-use-occupation-rate')))
            .text(' per day for damages for unlawful occupation from ')
            .generatedText('suspended-use-occupation-date', date(form, 'suspended-use-occupation-from-date'))
            .text(` until possession of the property is given to ${claimant}.`);
        });
      }

      const suspendedSubjects = ['Execution of the order for possession'];
      if (options.includes('money-judgment-arrears') && selected(form, 'suspended-mj-same-terms', 'yes')) {
        suspendedSubjects.push('enforcement of the money judgment');
      }
      if (selected(form, 'costs', 'yes') && SAME_TERMS_COSTS.has(costsChoice)) {
        suspendedSubjects.push('enforcement of any order for costs');
      }
      const conditionStart = `${joinList(suspendedSubjects)} ${suspendedSubjects.length === 1 ? 'is' : 'are'} suspended as long as ${defendant} ${defendantVerb('pays', 'pay')} (i) the rent as it falls due plus (ii) the arrears of £`;

      if (paymentTerms.length === 1) {
        list.item('suspended-condition', content => {
          content
            .text(conditionStart)
            .generatedText('suspended-arrears', money(field(form, 'suspended-arrears')))
            .text(' by ');
          if (paymentTerms[0] === 'one-off') {
            addSuspendedOneOffTerm(content, form, claimant);
          } else {
            addSuspendedInstalmentTerm(content, form, claimant);
          }
          content.text('.');
        });
      } else {
        list.item(
          'suspended-condition',
          content => {
            content
              .text(conditionStart)
              .generatedText('suspended-arrears', money(field(form, 'suspended-arrears')))
              .text(' by:');
          },
          item => {
            item.orderedList('suspended-payment-terms', terms => {
              if (paymentTerms.includes('one-off')) {
                terms.item('suspended-one-off', content => {
                  addSuspendedOneOffTerm(content, form, claimant);
                  content.text(';');
                });
              }
              if (paymentTerms.includes('instalments')) {
                terms.item('suspended-instalments', content => {
                  addSuspendedInstalmentTerm(content, form, claimant);
                  content.text(';');
                });
              }
              if (!paymentTerms.length) {
                terms.item('suspended-missing-payment-term', '[select a payment term];');
              }
            });
          }
        );
      }

      list.item(
        'suspended-payment-priority',
        `Payment of the above instalments made to ${claimant} shall be applied first to any arrears prior to any order for costs.`
      );
      list.item(
        'suspended-paid-in-full',
        'This order shall not be enforceable once the total of the sums awarded above have been paid.'
      );

      if (options.includes('warrant-on-notice')) {
        list.item(
          'suspended-warrant-on-notice',
          'Any application for a warrant of possession must be heard on notice to all parties unless the court orders otherwise.'
        );
      }
      if (options.includes('transfer-high-court')) {
        list.item(
          'suspended-high-court-transfer',
          'The order for possession is transferred to the High Court solely for the purpose of enforcement.'
        );
      }
    });
  });
}

export function initSuspendedMoneyOptions(form: HTMLFormElement): void {
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
  moneyJudgment.addEventListener('change', () => sync(moneyJudgment));
  moneyClaimAdjourned.addEventListener('change', () => sync(moneyClaimAdjourned));
  sync();
}

const SAME_TERMS_COSTS = new Set(['same-terms', 'fixed-same-terms', 'summary-same-terms']);

export function syncSuspendedOnlyCosts(form: HTMLFormElement, type: OrderType): void {
  form.querySelectorAll<HTMLInputElement>('input[name="costs-choice"]').forEach(choice => {
    if (!SAME_TERMS_COSTS.has(choice.value)) {
      return;
    }
    choice.disabled = type !== 'SUSPENDED_POSSESSION';
    if (choice.disabled) {
      choice.checked = false;
    }
  });
}

interface OrderError {
  id: string;
  message: string;
}

function validateSuspendedOrder(form: HTMLFormElement): OrderError[] {
  const errors: OrderError[] = [];
  const add = (valid: boolean, id: string, message: string): void => {
    if (!valid) {
      errors.push({ id, message });
    }
  };
  const oneOff = selected(form, 'suspended-payment-terms', 'one-off');
  const instalments = selected(form, 'suspended-payment-terms', 'instalments');
  add(hasValidDate(form, 'suspended-by-date'), 'suspended-by-date-day', 'Enter a valid possession date');
  add(hasValidMoney(form, 'suspended-arrears'), 'suspended-arrears', 'Enter valid arrears');
  add(oneOff || instalments, 'suspended-payment-terms', 'Select a one-off payment or instalments');
  if (oneOff) {
    add(
      hasValidMoney(form, 'suspended-oneoff-amount'),
      'suspended-oneoff-amount',
      'Enter a valid one-off payment amount'
    );
    add(hasValidDate(form, 'suspended-oneoff-date'), 'suspended-oneoff-date-day', 'Enter a valid one-off payment date');
  }
  if (instalments) {
    add(
      hasValidMoney(form, 'suspended-instalment-amount'),
      'suspended-instalment-amount',
      'Enter a valid instalment amount'
    );
    add(
      hasValidDate(form, 'suspended-instalment-date'),
      'suspended-instalment-date-day',
      'Enter a valid first instalment date'
    );
  }
  if (selected(form, 'suspended-options', 'use-occupation')) {
    add(
      hasValidMoney(form, 'suspended-use-occupation-rate'),
      'suspended-use-occupation-rate',
      'Enter a valid daily rate for use and occupation'
    );
    add(
      hasValidDate(form, 'suspended-use-occupation-from-date'),
      'suspended-use-occupation-from-date-day',
      'Enter a valid start date for use and occupation'
    );
  }
  if (selected(form, 'costs', 'yes')) {
    const costsChoice = field(form, 'costs-choice');
    const amountFields: Record<string, { id: string; message: string }> = {
      'def-pay-cl-fixed': {
        id: 'costs-def-pay-cl-fixed-amount',
        message: 'Enter a valid fixed costs amount',
      },
      'def-pay-cl-summary': {
        id: 'costs-def-pay-cl-summary-amount',
        message: 'Enter a valid summary assessed costs amount',
      },
      'cl-pay-def-summary': {
        id: 'costs-cl-pay-def-summary-amount',
        message: 'Enter a valid summary assessed costs amount',
      },
      'fixed-same-terms': {
        id: 'costs-fixed-same-terms-amount',
        message: 'Enter a valid fixed costs amount',
      },
      'summary-same-terms': {
        id: 'costs-summary-same-terms-amount',
        message: 'Enter a valid summary assessed costs amount',
      },
    };
    const amountField = amountFields[costsChoice];
    if (amountField) {
      add(hasValidMoney(form, amountField.id), amountField.id, amountField.message);
    }
  }
  return errors;
}

function showOrderErrors(form: HTMLFormElement, errors: OrderError[]): void {
  form.querySelector('#make-order-error-summary')?.remove();
  form.querySelectorAll('.govuk-input--error').forEach(input => input.classList.remove('govuk-input--error'));
  if (!errors.length) {
    return;
  }
  const summary = document.createElement('div');
  summary.id = 'make-order-error-summary';
  summary.className = 'govuk-error-summary';
  summary.setAttribute('role', 'alert');
  summary.tabIndex = -1;
  const title = document.createElement('h2');
  title.className = 'govuk-error-summary__title';
  title.textContent = 'There is a problem';
  const body = document.createElement('div');
  body.className = 'govuk-error-summary__body';
  const list = document.createElement('ul');
  list.className = 'govuk-list govuk-error-summary__list';
  errors.forEach(error => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${error.id}`;
    link.textContent = error.message;
    item.append(link);
    list.append(item);
    document.getElementById(error.id)?.classList.add('govuk-input--error');
  });
  body.append(list);
  summary.append(title, body);
  form.prepend(summary);
  summary.focus();
}

export function initMakeOrder(): void {
  const form = document.querySelector<HTMLFormElement>('#make-order-form');
  if (!form) {
    return;
  }
  initDatePills(form);
  defaultDate(form, 'suspended-by-date', 14);
  const mount = document.querySelector<HTMLElement>('#order-editor');
  const documentField = document.querySelector<HTMLTextAreaElement>('#order-document');
  const orderTypeField = document.querySelector<HTMLInputElement>('#order-type');
  const editorRegion = document.querySelector<HTMLElement>('#order-preview-editor');
  const unavailable = document.querySelector<HTMLElement>('#order-preview-unavailable');
  const submit = document.querySelector<HTMLButtonElement>('#submit-order-for-review');
  if (!mount || !documentField || !orderTypeField || !editorRegion || !unavailable || !submit) {
    return;
  }

  let documents: Partial<Record<OrderType, OrderEditorDocument>> = {};
  try {
    const parsed = JSON.parse(documentField.value) as OrderEditorDocument | null;
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
      documents[editorType] = editor.getDocument();
      documentField.value = JSON.stringify(documents[editorType]);
    } else {
      documentField.value = '';
    }
  };
  const render = (): void => {
    const type = orderTypeField.value as OrderType;
    if (!editor || editorType !== type || (type !== 'OUTRIGHT_POSSESSION' && type !== 'SUSPENDED_POSSESSION')) {
      return;
    }
    editor.render(type === 'SUSPENDED_POSSESSION' ? buildSuspendedOrder(form) : buildOutrightOrder(form));
    persistEditor();
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
    const previewAvailable = type === 'OUTRIGHT_POSSESSION' || type === 'SUSPENDED_POSSESSION';
    editorRegion.hidden = !previewAvailable;
    unavailable.hidden = previewAvailable;
    submit.disabled = !previewAvailable;
    submit.setAttribute('aria-disabled', String(!previewAvailable));
    if (previewAvailable) {
      if (!editor) {
        editorType = type;
        editor = createOrderEditor({
          mount,
          initialDocument: documents[type],
          onChange: value => {
            documents[type] = value;
            documentField.value = JSON.stringify(value);
          },
        });
      }
      render();
    } else {
      persistEditor();
    }
  };

  initSuspendedMoneyOptions(form);

  const orderTabs = form.querySelectorAll<HTMLAnchorElement>('[data-order-type]');
  orderTabs.forEach(tab => {
    tab.addEventListener('click', () => selectOrderType(tab.dataset.orderType as OrderType));
  });
  const renderForFormControl = (event: Event): void => {
    if (event.target instanceof Node && editorRegion.contains(event.target)) {
      return;
    }
    render();
  };
  form.addEventListener('input', renderForFormControl);
  form.addEventListener('change', renderForFormControl);
  form.addEventListener('submit', event => {
    persistEditor();
    const submitter = event instanceof SubmitEvent ? event.submitter : null;
    if (
      submitter instanceof HTMLButtonElement &&
      submitter.value === 'SUBMIT_FOR_REVIEW' &&
      orderTypeField.value === 'SUSPENDED_POSSESSION'
    ) {
      const errors = validateSuspendedOrder(form);
      showOrderErrors(form, errors);
      if (errors.length) {
        event.preventDefault();
      }
    }
  });
  const linkedTab = Array.from(orderTabs).find(tab => tab.getAttribute('href') === window.location.hash);
  selectOrderType((linkedTab?.dataset.orderType as OrderType | undefined) ?? (orderTypeField.value as OrderType));
}
