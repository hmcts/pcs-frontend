import { type OrderEditorDocument, buildOrder, createOrderEditor } from '@hmcts-cft/docweave';

type OrderType = 'OUTRIGHT_POSSESSION' | 'SUSPENDED_POSSESSION' | 'ADJOURNMENT' | 'STRIKE_OUT_DISMISSAL' | 'FREE_FORM';

function field(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function selected(form: HTMLFormElement, name: string, value: string): boolean {
  return new FormData(form).getAll(name).some(entry => entry === value);
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

function buildOutrightOrder(form: HTMLFormElement) {
  const address = form.dataset.propertyAddress || '[property address not provided]';
  const claimants = form.dataset.claimants || 'the claimant(s)';
  const defendants = form.dataset.defendants || 'the defendant(s)';
  const options = new Set(new FormData(form).getAll('outright-options').filter(entry => typeof entry === 'string'));
  const hasMoneyJudgment = options.has('money-judgment');

  return buildOrder(order => {
    attendanceParagraphs(form).forEach(paragraph => order.paragraph(paragraph.id, paragraph.text));
    if (selected(form, 'recitals', 'yes')) {
      field(form, 'recital')
        .split(/\n\s*\n/)
        .filter(Boolean)
        .forEach((text, index) => order.paragraph(`recital-${index}`, text));
    }
    order.paragraph('ordered-that', 'IT IS ORDERED THAT:');
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
      if (hasMoneyJudgment) {
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
        hasMoneyJudgment &&
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
            if (field(form, 'outright-mj-balance-date-day')) {
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

export function initMakeOrder(): void {
  const form = document.querySelector<HTMLFormElement>('#make-order-form');
  if (!form) {
    return;
  }
  initDatePills(form);
  const mount = document.querySelector<HTMLElement>('#order-editor');
  const documentField = document.querySelector<HTMLTextAreaElement>('#order-document');
  const orderTypeField = document.querySelector<HTMLInputElement>('#order-type');
  const editorRegion = document.querySelector<HTMLElement>('#order-preview-editor');
  const unavailable = document.querySelector<HTMLElement>('#order-preview-unavailable');
  const submit = document.querySelector<HTMLButtonElement>('#submit-order-for-review');
  if (!mount || !documentField || !orderTypeField || !editorRegion || !unavailable || !submit) {
    return;
  }

  let initialDocument: OrderEditorDocument | undefined;
  try {
    initialDocument = JSON.parse(documentField.value) || undefined;
  } catch {
    initialDocument = undefined;
  }
  const editor = createOrderEditor({
    mount,
    toolbar: '#order-editor-toolbar',
    initialDocument,
    onChange: value => {
      documentField.value = JSON.stringify(value);
    },
  });
  const render = (): void => {
    editor.render(buildOutrightOrder(form));
    documentField.value = JSON.stringify(editor.getDocument());
  };
  const selectOrderType = (type: OrderType): void => {
    orderTypeField.value = type;
    const outright = type === 'OUTRIGHT_POSSESSION';
    editorRegion.hidden = !outright;
    unavailable.hidden = outright;
    submit.disabled = !outright;
    submit.setAttribute('aria-disabled', String(!outright));
    if (outright) {
      render();
    }
  };

  form.querySelectorAll<HTMLAnchorElement>('[data-order-type]').forEach(tab => {
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
  selectOrderType(orderTypeField.value as OrderType);
}
