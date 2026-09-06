/**
 * @jest-environment jsdom
 */

import { buildFreeFormOrder } from '../../../../main/assets/js/make-order';

import { childTexts } from './docweaveTestUtils';

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
    const generated = buildFreeFormOrder(renderForm('The claim is transferred to the County Court at Leeds.'));

    expect(childTexts(generated.node)).toEqual([
      'IT IS ORDERED THAT:',
      'The claim is transferred to the County Court at Leeds.',
    ]);
    expect(generated.node.childCount).toBe(2);
  });

  it('splits wording into a paragraph per blank-line separated block', () => {
    const generated = buildFreeFormOrder(renderForm('First direction.\n\n  \n Second direction. \n\n'));

    expect(childTexts(generated.node)).toEqual(['IT IS ORDERED THAT:', 'First direction.', 'Second direction.']);
  });

  it('generates only the preamble when no wording has been entered', () => {
    const generated = buildFreeFormOrder(renderForm('   '));

    expect(childTexts(generated.node)).toEqual(['IT IS ORDERED THAT:']);
  });
});
