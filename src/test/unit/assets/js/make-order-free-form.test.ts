/**
 * @jest-environment jsdom
 */

jest.mock('@hmcts-cft/docweave', () => {
  const inline = (content: string | ((builder: unknown) => void)): string => {
    if (typeof content === 'string') {
      return content;
    }
    let text = '';
    const builder = {
      text: (value: string) => {
        text += value;
        return builder;
      },
      fact: (_id: string, value: string) => {
        text += value;
        return builder;
      },
    };
    content(builder);
    return text;
  };
  const orderedList = (id: string, define: (builder: unknown) => void) => {
    const items: { id: string; text: string; nested: unknown[] }[] = [];
    define({
      item: (itemId: string, content: string | ((builder: unknown) => void), defineItem?: (item: unknown) => void) => {
        const nested: unknown[] = [];
        defineItem?.({
          orderedList: (nestedId: string, defineNested: (builder: unknown) => void) =>
            nested.push(orderedList(nestedId, defineNested)),
        });
        items.push({ id: itemId, text: inline(content), nested });
      },
    });
    return { id, items };
  };
  return {
    buildOrder: (define: (order: unknown) => void) => {
      const paragraphs: { id: string; text: string }[] = [];
      const lists: unknown[] = [];
      define({
        paragraph: (id: string, content: string | ((builder: unknown) => void)) =>
          paragraphs.push({ id, text: inline(content) }),
        orderedList: (id: string, defineList: (builder: unknown) => void) => lists.push(orderedList(id, defineList)),
      });
      return { paragraphs, lists };
    },
    createOrderEditor: jest.fn(),
  };
});

import { createOrderEditor } from '@hmcts-cft/docweave';

import { buildFreeFormOrder, initMakeOrder } from '../../../../main/assets/js/make-order';

interface CapturedDocument {
  paragraphs: { id: string; text: string }[];
  lists: { id: string }[];
}

function renderForm(text: string): HTMLFormElement {
  document.body.innerHTML = `
    <form data-claimant-count="1" data-defendant-count="1">
      <textarea id="free-form-text" name="free-form-text">${text}</textarea>
    </form>
  `;
  return document.querySelector('form')!;
}

describe('free form order generation', () => {
  it('opens with the ordered-that preamble and uses paragraphs rather than a list', () => {
    const generated = buildFreeFormOrder(
      renderForm('The claim is transferred to the County Court at Leeds.')
    ) as unknown as CapturedDocument;

    expect(generated.paragraphs.map(paragraph => paragraph.text)).toEqual([
      'IT IS ORDERED THAT:',
      'The claim is transferred to the County Court at Leeds.',
    ]);
    expect(generated.lists).toEqual([]);
  });

  it('splits wording into a paragraph per blank-line separated block', () => {
    const generated = buildFreeFormOrder(
      renderForm('First direction.\n\n  \n Second direction. \n\n')
    ) as unknown as CapturedDocument;

    expect(generated.paragraphs.map(paragraph => paragraph.id)).toEqual(['ordered-that', 'free-form-0', 'free-form-1']);
    expect(generated.paragraphs[2].text).toBe('Second direction.');
  });

  it('generates only the preamble when no wording has been entered', () => {
    const generated = buildFreeFormOrder(renderForm('   ')) as unknown as CapturedDocument;

    expect(generated.paragraphs.map(paragraph => paragraph.text)).toEqual(['IT IS ORDERED THAT:']);
  });
});

describe('free form order validation', () => {
  it('shows a GOV.UK summary and field error before submission', () => {
    jest.mocked(createOrderEditor).mockReturnValue({
      render: jest.fn(),
      getSnapshot: jest.fn(() => ({ schema: 'docweave-document' })),
      destroy: jest.fn(),
    } as never);
    document.body.innerHTML = `
      <form id="make-order-form">
        <input id="order-type" name="orderType" value="FREE_FORM">
        <textarea id="order-document">null</textarea>
        <a href="#tab-free-form" data-order-type="FREE_FORM">Free form</a>
        <div id="order-preview-editor"><div id="order-editor"></div></div>
        <p id="order-preview-unavailable"></p>
        <div class="govuk-form-group">
          <label for="free-form-text">Order wording</label>
          <textarea id="free-form-text" name="free-form-text"></textarea>
        </div>
        <button id="submit-order-for-review" type="submit" value="SUBMIT_FOR_REVIEW">Submit</button>
      </form>
    `;
    initMakeOrder();
    const form = document.querySelector<HTMLFormElement>('form')!;
    const submit = document.querySelector<HTMLButtonElement>('#submit-order-for-review')!;

    const submitted = form.dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: submit })
    );

    expect(submitted).toBe(false);
    expect(document.querySelector('#make-order-error-summary')?.textContent).toContain('Enter the order wording');
    expect(document.querySelector('#free-form-text-error')?.textContent).toContain('Enter the order wording');
    expect(document.querySelector('#free-form-text')?.classList).toContain('govuk-textarea--error');
    expect(document.querySelector('#free-form-text')?.getAttribute('aria-describedby')).toContain(
      'free-form-text-error'
    );
  });
});
