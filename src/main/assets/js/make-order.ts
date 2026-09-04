import {
  type DocWeaveSnapshot,
  type InlineBuilder,
  type OrderBuilder,
  buildOrder,
  createOrderEditor,
} from '@hmcts-cft/docweave';

import {
  type MakeOrderValidationIssue as OrderError,
  type MakeOrderType as OrderType,
  validateMakeOrder,
} from '../../utils/makeOrderValidation';

function field(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function selected(form: HTMLFormElement, name: string, value: string): boolean {
  return new FormData(form).getAll(name).includes(value);
}

function selectedControlId(form: HTMLFormElement, name: string): string {
  return form.querySelector<HTMLInputElement>(`[name="${name}"]:checked`)?.id ?? name;
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

function money(value: string): string {
  const amount = Number(value.split(',').join(''));
  return value && Number.isFinite(amount)
    ? amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '[amount not provided]';
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
  form.addEventListener('input', event => {
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
  });

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

// Typing a date in a row implies choosing that row's option, so select it rather than
// leaving the judge with a date recorded against an unselected radio. Selection is on
// input, not focus, so tabbing through the rows does not silently change the answer.
export function initOptionRows(form: HTMLFormElement): void {
  form.addEventListener('input', event => {
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
  });
}

export function initCaseFactsToggle(form: HTMLFormElement): void {
  const caseFacts = form.querySelector<HTMLElement>('[data-case-facts]');
  const toggle = caseFacts?.querySelector<HTMLButtonElement>('[data-case-facts-toggle]');
  const contentId = toggle?.getAttribute('aria-controls');
  const content = contentId ? document.getElementById(contentId) : null;
  if (!caseFacts || !toggle || !content) {
    return;
  }

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.textContent = expanded ? 'Show case facts' : 'Hide case facts';
    content.hidden = expanded;
    caseFacts.classList.toggle('pcs-case-facts--collapsed', expanded);
  });
}

interface AttendanceFact {
  id: string;
  sourceId?: string;
  text: string;
}

function attendanceFacts(form: HTMLFormElement): { heard: AttendanceFact[]; paragraphs: AttendanceFact[] } {
  const heard: AttendanceFact[] = [];
  const paragraphs: AttendanceFact[] = [];
  form.querySelectorAll<HTMLElement>('[data-attendance-row]').forEach((row, index) => {
    const choice = row.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value;
    const name = row.querySelector<HTMLInputElement>('input[type="text"]')?.value.trim();
    const party = row.dataset.partyKind === 'claimant' ? 'the claimant' : 'the defendant';
    const label = row.dataset.partyLabel ?? party;
    if (!choice) {
      return;
    }
    const sourceId = row.id;
    if (choice === 'letter-only') {
      paragraphs.push({
        id: `attendance-letter-${index}`,
        sourceId,
        text: `The Court read a letter from ${name || label}.`,
      });
      return;
    }
    if (choice === 'not-present') {
      paragraphs.push({
        id: `attendance-absent-${index}`,
        sourceId,
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
    heard.push({
      id: `attendance-heard-${index}`,
      sourceId,
      text: name ? `${name}, ${roles[choice]}` : roles[choice],
    });
  });
  return { heard, paragraphs };
}

function addPreamble(order: OrderBuilder, form: HTMLFormElement): void {
  const attendance = attendanceFacts(form);
  if (attendance.heard.length) {
    order.paragraph('attendance-heard', `The Court heard from ${joinList(attendance.heard.map(entry => entry.text))}.`);
  }
  attendance.paragraphs.forEach(paragraph =>
    order.paragraph(paragraph.id, content => {
      content.fact('attendance', paragraph.text, paragraph.sourceId ? { sourceId: paragraph.sourceId } : undefined);
    })
  );
  if (selected(form, 'recitals', 'yes')) {
    field(form, 'recital')
      .split(/\n\s*\n/)
      .filter(Boolean)
      .forEach((text, index) =>
        order.paragraph(`recital-${index}`, content => {
          content.fact('text', text, { sourceId: 'recitals-text' });
        })
      );
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

const CASE_MAN_COST_CHOICES = new Set([
  'def-pay-cl-fixed',
  'def-pay-cl-summary',
  'cl-pay-def-summary',
  'in-case',
  'reserved',
  'no-order',
  'public-funding',
  'same-terms',
  'fixed-same-terms',
  'summary-same-terms',
]);

function hasCaseManCosts(form: HTMLFormElement): boolean {
  if (!selected(form, 'costs', 'yes')) {
    return false;
  }
  const choice = field(form, 'costs-choice');
  return choice === 'other' ? Boolean(field(form, 'costs-other-text')) : CASE_MAN_COST_CHOICES.has(choice);
}

function addCaseManCosts(content: InlineBuilder, form: HTMLFormElement, claimant: string, defendant: string): void {
  const choice = field(form, 'costs-choice');
  const sourceId = selectedControlId(form, 'costs-choice');
  const amountCosts: Record<string, { amountId: string; prefix: string }> = {
    'def-pay-cl-fixed': {
      amountId: 'costs-def-pay-cl-fixed-amount',
      prefix: `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs of the claim in the fixed sum of £`,
    },
    'def-pay-cl-summary': {
      amountId: 'costs-def-pay-cl-summary-amount',
      prefix: `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs in the summarily assessed sum of £`,
    },
    'cl-pay-def-summary': {
      amountId: 'costs-cl-pay-def-summary-amount',
      prefix: `${sentenceCase(claimant)} shall pay ${possessive(defendant)} costs in the summarily assessed sum of £`,
    },
    'fixed-same-terms': {
      amountId: 'costs-fixed-same-terms-amount',
      prefix: `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs of the claim in the fixed sum of £`,
    },
    'summary-same-terms': {
      amountId: 'costs-summary-same-terms-amount',
      prefix: `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs in the summarily assessed sum of £`,
    },
  };
  const fixedCosts: Record<string, string> = {
    'in-case': 'Costs in the case.',
    reserved: 'Costs reserved.',
    'no-order': 'No order as to costs.',
    'public-funding': `There be a detailed assessment of ${possessive(defendant)} publicly funded costs.`,
    'same-terms': `${sentenceCase(defendant)} shall pay ${possessive(claimant)} costs.`,
  };
  const amountCost = amountCosts[choice];
  if (amountCost) {
    content
      .fact('choice', amountCost.prefix, { sourceId })
      .fact('amount', money(field(form, amountCost.amountId)), { sourceId: amountCost.amountId })
      .text('.');
  } else if (choice === 'other') {
    content.fact('other', field(form, 'costs-other-text'), { sourceId: 'costs-other-text' });
  } else {
    content.fact('choice', fixedCosts[choice] ?? '', { sourceId });
  }
}

function addOutrightCosts(content: InlineBuilder, form: HTMLFormElement): void {
  const choice = field(form, 'costs-choice');
  const sourceId = selectedControlId(form, 'costs-choice');
  const amountCosts: Record<string, { amountId: string; prefix: string }> = {
    'def-pay-cl-fixed': {
      amountId: 'costs-def-pay-cl-fixed-amount',
      prefix: "The defendant(s) must pay the claimant(s)' fixed costs of £",
    },
    'def-pay-cl-summary': {
      amountId: 'costs-def-pay-cl-summary-amount',
      prefix: "The defendant(s) must pay the claimant(s)' costs, summarily assessed at £",
    },
    'cl-pay-def-summary': {
      amountId: 'costs-cl-pay-def-summary-amount',
      prefix: "The claimant(s) must pay the defendant(s)' costs, summarily assessed at £",
    },
  };
  const fixedCosts: Record<string, string> = {
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
  };
  const amountCost = amountCosts[choice];
  if (amountCost) {
    content
      .fact('choice', amountCost.prefix, { sourceId })
      .fact('amount', money(field(form, amountCost.amountId)), { sourceId: amountCost.amountId })
      .text('.');
  } else if (choice === 'other') {
    content.fact('other', field(form, 'costs-other-text') || '[costs order not provided]', {
      sourceId: 'costs-other-text',
    });
  } else {
    content.fact('choice', fixedCosts[choice] || '[costs order not provided]', { sourceId });
  }
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
          .fact('address', address)
          .text(' to the claimant(s) ');
        if (field(form, 'outright-possession') === 'forthwith') {
          content.fact('deadline', 'forthwith', { sourceId: 'outright-possession' }).text('.');
        } else {
          content
            .text('on or before ')
            .fact('deadline', date(form, 'outright-by-date'), { sourceId: 'outright-by-date' })
            .text('.');
        }
      });
      list.item('grounds', content => {
        content
          .text('This order for possession was made on ')
          .fact('type', field(form, 'outright-grounds-type') || '[grounds type not provided]', {
            sourceId: 'outright-grounds-type',
          })
          .text(' grounds, namely ')
          .fact('details', field(form, 'outright-grounds-details') || '[grounds not provided]', {
            sourceId: 'outright-grounds-details',
          })
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
            .fact('amount', money(total), { sourceId: 'outright-mj-amounts' })
            .text('.');
        });
      }
      if (options.has('use-occupation')) {
        list.item('use-occupation', content => {
          content
            .fact('defendants', defendants)
            .text(' must pay to ')
            .fact('claimants', claimants)
            .text(' £')
            .fact('rate', money(field(form, 'outright-use-occupation-rate')), {
              sourceId: 'outright-use-occupation-rate',
            })
            .text(' per day for damages for unlawful occupation from ')
            .fact('date', date(form, 'outright-use-occupation-from-date'), {
              sourceId: 'outright-use-occupation-from-date',
            })
            .text(` until possession of the property is given to ${claimants}.`);
        });
      }
      if (selected(form, 'costs', 'yes')) {
        list.item('costs', content => addOutrightCosts(content, form));
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
              .fact('lump-amount', money(field(form, 'outright-mj-lump-amount')), {
                sourceId: 'outright-mj-lump-amount',
              })
              .text(' by ')
              .fact('lump-date', date(form, 'outright-mj-lump-date'), {
                sourceId: 'outright-mj-lump-date',
              });
            if (selected(form, 'outright-mj-balance', 'yes')) {
              content.text(' and the balance by ').fact('balance-date', date(form, 'outright-mj-balance-date'), {
                sourceId: 'outright-mj-balance-date',
              });
            }
          }
          if (selected(form, 'outright-mj-plan', 'lump') && selected(form, 'outright-mj-plan', 'instalments')) {
            content.text(', and ');
          }
          if (selected(form, 'outright-mj-plan', 'instalments')) {
            content
              .text('by instalment payments of £')
              .fact('instalment-amount', money(field(form, 'outright-mj-inst-amount')), {
                sourceId: 'outright-mj-inst-amount',
              })
              .text(' every ')
              .fact('instalment-frequency', field(form, 'outright-mj-inst-freq') || '[frequency not provided]', {
                sourceId: 'outright-mj-inst-freq',
              })
              .text(', first payment by ')
              .fact('instalment-date', date(form, 'outright-mj-inst-date'), {
                sourceId: 'outright-mj-inst-date',
              });
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
    .fact('suspended-one-off-amount', money(field(form, 'suspended-oneoff-amount')), {
      sourceId: 'suspended-oneoff-amount',
    })
    .text(` to ${claimant} by `)
    .fact('suspended-one-off-date', date(form, 'suspended-oneoff-date'), {
      sourceId: 'suspended-oneoff-date',
    });
}

function addSuspendedInstalmentTerm(content: InlineBuilder, form: HTMLFormElement, claimant: string): void {
  const frequency = field(form, 'suspended-instalment-frequency') === 'weekly' ? 'week' : 'month';
  content
    .text('payments of £')
    .fact('suspended-instalment-amount', money(field(form, 'suspended-instalment-amount')), {
      sourceId: 'suspended-instalment-amount',
    })
    .text(` to ${claimant} every `)
    .fact('suspended-instalment-frequency', frequency, { sourceId: 'suspended-instalment-frequency' })
    .text(', the first instalment to be paid on or before ')
    .fact('suspended-instalment-date', date(form, 'suspended-instalment-date'), {
      sourceId: 'suspended-instalment-date',
    });
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
          .fact('suspended-address', address)
          .text(` to ${claimant} on or before `)
          .fact('suspended-deadline', date(form, 'suspended-by-date'), { sourceId: 'suspended-by-date' })
          .text('.');
      });

      if (options.includes('money-claim-adjourned')) {
        list.item('suspended-money-claim-adjourned', 'The money claim is adjourned generally with liberty to restore.');
      } else if (options.includes('money-judgment-arrears')) {
        list.item('suspended-money-judgment', content => {
          content
            .text('Judgment for the claimant in the sum of £')
            .fact('suspended-money-judgment-amount', money(field(form, 'suspended-arrears')), {
              sourceId: 'suspended-arrears',
            })
            .text('.');
        });
      }

      if (hasCaseManCosts(form)) {
        list.item('suspended-costs', content => addCaseManCosts(content, form, claimant, defendant));
      }

      if (options.includes('use-occupation')) {
        list.item('suspended-use-occupation', content => {
          content
            .text(`${sentenceCase(defendant)} must pay to ${claimant} £`)
            .fact('suspended-use-occupation-rate', money(field(form, 'suspended-use-occupation-rate')), {
              sourceId: 'suspended-use-occupation-rate',
            })
            .text(' per day for damages for unlawful occupation from ')
            .fact('suspended-use-occupation-date', date(form, 'suspended-use-occupation-from-date'), {
              sourceId: 'suspended-use-occupation-from-date',
            })
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
            .fact('suspended-arrears', money(field(form, 'suspended-arrears')), {
              sourceId: 'suspended-arrears',
            })
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
              .fact('suspended-arrears', money(field(form, 'suspended-arrears')), {
                sourceId: 'suspended-arrears',
              })
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

function adjournmentTimeEstimate(form: HTMLFormElement): string {
  const amount = field(form, 'adj-time-estimate');
  const unit = field(form, 'adj-time-estimate-unit');
  if (!amount || (unit !== 'minutes' && unit !== 'hours')) {
    return '[time not provided]';
  }
  if (amount === '1') {
    return unit === 'hours' ? '1 hour' : '1 minute';
  }
  return `${amount} ${unit}`;
}

function addAdjournmentOneOffTerm(content: InlineBuilder, form: HTMLFormElement, claimant: string): void {
  content
    .text(`a payment to ${claimant} of £`)
    .fact('adjournment-one-off-amount', money(field(form, 'adj-gen-oneoff-amount')), {
      sourceId: 'adj-gen-oneoff-amount',
    })
    .text(' by ')
    .fact('adjournment-one-off-date', date(form, 'adj-gen-oneoff-date'), {
      sourceId: 'adj-gen-oneoff-date',
    });
}

function addAdjournmentInstalmentTerm(
  content: InlineBuilder,
  form: HTMLFormElement,
  claimant: string,
  option: 'current-rent-plus' | 'payments'
): void {
  const prefix = option === 'current-rent-plus' ? 'adj-gen-current-rent-plus' : 'adj-gen-payments';
  const frequency = field(form, `${prefix}-frequency`) === 'weekly' ? 'week' : 'month';
  content
    .text(`instalment payments to ${claimant} of £`)
    .fact(`adjournment-${option}-amount`, money(field(form, `${prefix}-amount`)), {
      sourceId: `${prefix}-amount`,
    })
    .text(' every ')
    .fact(`adjournment-${option}-frequency`, frequency, { sourceId: `${prefix}-frequency` })
    .text(', the first instalment to be paid on or before ')
    .fact(`adjournment-${option}-date`, date(form, `${prefix}-date`), { sourceId: `${prefix}-date` });
}

// Free form wording is the judge's own, so it is emitted as plain paragraphs rather
// than the numbered clauses the structured order types use. Blank lines separate them.
export function buildFreeFormOrder(form: HTMLFormElement): ReturnType<typeof buildOrder> {
  return buildOrder(order => {
    addPreamble(order, form);
    field(form, 'free-form-text')
      .split(/\n\s*\n/)
      .map(text => text.trim())
      .filter(Boolean)
      .forEach((text, index) =>
        order.paragraph(`free-form-${index}`, content => {
          content.fact('text', text, { sourceId: 'free-form-text' });
        })
      );
  });
}

export function buildAdjournmentOrder(form: HTMLFormElement): ReturnType<typeof buildOrder> {
  const type = field(form, 'adj-type');
  const { claimant, defendant, defendantVerb } = partyLabels(form);
  const directions = new FormData(form).getAll('adj-directions').map(String);
  const conditions = new FormData(form).getAll('adj-gen').map(String);

  return buildOrder(order => {
    addPreamble(order, form);
    if (!type) {
      return;
    }
    order.orderedList('adjournment-clauses', list => {
      if (type === 'further-hearing') {
        const when = field(form, 'adj-when') || 'next-list';
        list.item('adjournment-listing', content => {
          if (when === 'next-list') {
            content.text('The claim shall be adjourned to be heard on the next available possession list after ');
          } else if (when === 'next-date') {
            content.text(
              'The claim shall be adjourned to be heard on the next available date (non-possession list) after '
            );
          } else {
            content.text('The claim shall be adjourned to be heard on ');
          }
          content.fact('adjournment-hearing-date', date(form, `adj-hearing-date-${when}`), {
            sourceId: `adj-hearing-date-${when}`,
          });
          if (when === 'specific') {
            content
              .text(' at ')
              .fact('adjournment-hearing-time', field(form, 'adj-specific-time') || '[hearing time not provided]', {
                sourceId: 'adj-specific-time',
              });
          }
          content.text(' with a time estimate of ').fact('adjournment-time-estimate', adjournmentTimeEstimate(form), {
            sourceId: 'adj-time-estimate-group',
          });
          if (when !== 'specific') {
            content.text('. Further details of the hearing will be provided by the court.');
          } else {
            content.text('.');
          }
        });
        if (directions.includes('defence')) {
          list.item('adjournment-defence', content => {
            content
              .text(`${sentenceCase(defendant)} must by 4pm on `)
              .fact('adjournment-defence-date', date(form, 'adj-defence-date'), {
                sourceId: 'adj-defence-date',
              })
              .text(' send to the court and all other parties a defence.');
          });
        }
        if (directions.includes('counterclaim')) {
          list.item('adjournment-counterclaim', content => {
            content
              .text(`${sentenceCase(defendant)} must by 4pm on `)
              .fact('adjournment-counterclaim-date', date(form, 'adj-counterclaim-date'), {
                sourceId: 'adj-counterclaim-date',
              })
              .text(
                ' send to the court and all other parties a defence and any counterclaim, having paid any court fees which are due.'
              );
          });
        }
        if (directions.includes('claimant-reply')) {
          list.item('adjournment-claimant-reply', content => {
            content
              .text(`${sentenceCase(claimant)} must by 4pm on `)
              .fact('adjournment-claimant-reply-date', date(form, 'adj-claimant-reply-date'), {
                sourceId: 'adj-claimant-reply-date',
              })
              .text(' send to the court and all other parties a defence to the counterclaim and any reply.');
          });
        }
      } else {
        const paymentOption = conditions.includes('current-rent-plus')
          ? 'current-rent-plus'
          : conditions.includes('payments')
            ? 'payments'
            : undefined;
        const hasPaymentTerms = Boolean(paymentOption || conditions.includes('oneoff'));
        const hasRestore = conditions.includes('restore');
        if (hasPaymentTerms) {
          list.item(
            'adjournment-condition',
            `The claim is adjourned generally on condition that ${defendant} ${defendantVerb('makes', 'make')} payment of current rent as it falls due together with the following payments towards any arrears:`,
            item => {
              item.orderedList('adjournment-payment-terms', terms => {
                if (conditions.includes('oneoff')) {
                  terms.item('adjournment-one-off', content => {
                    addAdjournmentOneOffTerm(content, form, claimant);
                    content.text(';');
                  });
                }
                if (paymentOption) {
                  terms.item('adjournment-instalments', content => {
                    addAdjournmentInstalmentTerm(content, form, claimant, paymentOption);
                    content.text(';');
                  });
                }
              });
            }
          );
          list.item(
            'adjournment-restore-right',
            `${sentenceCase(claimant)} may apply to restore the claim if there is a breach of such condition or conditions. This application shall be made on notice to all parties. ${sentenceCase(claimant)} shall set out in such application details of the alleged breach or breaches and attach any evidence relied upon in support.`
          );
          if (hasRestore) {
            list.item('adjournment-strike-out', content => {
              content
                .text('If no application to restore the claim is made by ')
                .fact('adjournment-restore-date', date(form, 'adj-gen-restore-date'), {
                  sourceId: 'adj-gen-restore-date',
                })
                .text(' the claim shall stand as struck out without further application or order of the court.');
            });
          }
        } else {
          list.item('adjournment-generally', content => {
            content.text(
              'This claim is adjourned generally with liberty to restore by application by any party on notice to all other parties.'
            );
            if (hasRestore) {
              content
                .text(' If no application is made by 4pm on ')
                .fact('adjournment-restore-date', date(form, 'adj-gen-restore-date'), {
                  sourceId: 'adj-gen-restore-date',
                })
                .text(
                  ' the claim shall automatically be struck out without the need for any further application or order.'
                );
            }
          });
        }
      }
      if (hasCaseManCosts(form)) {
        list.item('adjournment-costs', content => addCaseManCosts(content, form, claimant, defendant));
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

function formValues(form: HTMLFormElement): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  new FormData(form).forEach((entry, name) => {
    if (typeof entry !== 'string') {
      return;
    }
    const existing = result[name];
    result[name] = existing === undefined ? entry : Array.isArray(existing) ? [...existing, entry] : [existing, entry];
  });
  return result;
}

function showOrderErrors(form: HTMLFormElement, errors: OrderError[]): void {
  const generatedErrorIds = new Set(
    Array.from(form.querySelectorAll<HTMLElement>('[data-make-order-error]'))
      .map(error => error.id)
      .filter(Boolean)
  );
  form.querySelector('#make-order-error-summary')?.remove();
  form.querySelectorAll('[data-make-order-error]').forEach(error => error.remove());
  form.querySelectorAll('.govuk-form-group--error').forEach(group => group.classList.remove('govuk-form-group--error'));
  form.querySelectorAll<HTMLElement>('[aria-describedby]').forEach(control => {
    const remaining = (control.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(id => id && !generatedErrorIds.has(id))
      .join(' ');
    if (remaining) {
      control.setAttribute('aria-describedby', remaining);
    } else {
      control.removeAttribute('aria-describedby');
    }
  });
  form.querySelectorAll('.govuk-input--error, .govuk-select--error, .govuk-textarea--error').forEach(control => {
    control.classList.remove('govuk-input--error', 'govuk-select--error', 'govuk-textarea--error');
  });
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
    const control = document.getElementById(error.id);
    const group = control?.closest<HTMLElement>('.govuk-form-group');
    if (!control || !group) {
      return;
    }
    const message = document.createElement('p');
    message.id = `${error.id}-error`;
    message.className = 'govuk-error-message';
    message.dataset.makeOrderError = 'true';
    const hidden = document.createElement('span');
    hidden.className = 'govuk-visually-hidden';
    hidden.textContent = 'Error:';
    message.append(hidden, ` ${error.message}`);
    const controls =
      control.closest<HTMLElement>('.govuk-date-input, .govuk-radios, .govuk-checkboxes, .govuk-input__wrapper') ??
      control;
    controls.parentElement?.insertBefore(message, controls);
    group.classList.add('govuk-form-group--error');
    if (control instanceof HTMLTextAreaElement) {
      control.classList.add('govuk-textarea--error');
    } else if (control instanceof HTMLSelectElement) {
      control.classList.add('govuk-select--error');
    } else if (control instanceof HTMLInputElement && !['checkbox', 'radio'].includes(control.type)) {
      control.classList.add('govuk-input--error');
    }
    const describedBy = new Set((control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
    describedBy.add(message.id);
    control.setAttribute('aria-describedby', [...describedBy].join(' '));
  });
  body.append(list);
  summary.append(title, body);
  form.prepend(summary);
  summary.focus();
}

// Returns a teardown so a module reload can dispose the editor. Without it a second
// editor is created over the same mount, which DocWeave rejects.
export function initMakeOrder(): () => void {
  const noop = (): void => undefined;
  const form = document.querySelector<HTMLFormElement>('#make-order-form');
  if (!form) {
    return noop;
  }
  initDatePills(form);
  initOptionRows(form);
  initCaseFactsToggle(form);
  defaultDate(form, 'suspended-by-date', 14);
  const mount = document.querySelector<HTMLElement>('#order-editor');
  const documentField = document.querySelector<HTMLTextAreaElement>('#order-document');
  const orderTypeField = document.querySelector<HTMLInputElement>('#order-type');
  const editorRegion = document.querySelector<HTMLElement>('#order-preview-editor');
  const unavailable = document.querySelector<HTMLElement>('#order-preview-unavailable');
  const submit = document.querySelector<HTMLButtonElement>('#submit-order-for-review');
  if (!mount || !documentField || !orderTypeField || !editorRegion || !unavailable || !submit) {
    return noop;
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
  const builders: Partial<Record<OrderType, (value: HTMLFormElement) => ReturnType<typeof buildOrder>>> = {
    OUTRIGHT_POSSESSION: buildOutrightOrder,
    SUSPENDED_POSSESSION: buildSuspendedOrder,
    ADJOURNMENT: buildAdjournmentOrder,
    FREE_FORM: buildFreeFormOrder,
  };
  const render = (): void => {
    const type = orderTypeField.value as OrderType;
    const builder = builders[type];
    if (!editor || editorType !== type || !builder) {
      return;
    }
    editor.render(builder(form));
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
    const previewAvailable = Boolean(builders[type]);
    editorRegion.hidden = !previewAvailable;
    unavailable.hidden = previewAvailable;
    submit.disabled = !previewAvailable;
    submit.setAttribute('aria-disabled', String(!previewAvailable));
    if (previewAvailable) {
      if (!editor) {
        editorType = type;
        editor = createOrderEditor({
          mount,
          initialSnapshot: documents[type],
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
    if (submitter instanceof HTMLButtonElement && submitter.value === 'SUBMIT_FOR_REVIEW') {
      const errors = validateMakeOrder(orderTypeField.value as OrderType, formValues(form));
      showOrderErrors(form, errors);
      if (errors.length) {
        event.preventDefault();
      }
    }
  });
  const linkedTab = Array.from(orderTabs).find(tab => tab.getAttribute('href') === window.location.hash);
  selectOrderType((linkedTab?.dataset.orderType as OrderType | undefined) ?? (orderTypeField.value as OrderType));

  return () => {
    persistEditor();
    editor?.destroy();
    editor = undefined;
    editorType = undefined;
  };
}
