import { buildFreeFormOrder } from '../../../../main/assets/js/make-order/wording/free-form';

import { childTexts, findNode, makeOrderData } from './docweaveTestUtils';

describe('free form order generation', () => {
  it('opens with the ordered-that preamble and uses paragraphs rather than a list', () => {
    const generated = buildFreeFormOrder(
      makeOrderData({ 'free-form-text': 'The claim is transferred to the County Court at Leeds.' })
    );

    expect(childTexts(generated.node)).toEqual([
      'IT IS ORDERED THAT:',
      'The claim is transferred to the County Court at Leeds.',
    ]);
    expect(generated.node.childCount).toBe(2);
  });

  it('splits wording into a paragraph per blank-line separated block', () => {
    const generated = buildFreeFormOrder(
      makeOrderData({ 'free-form-text': 'First direction.\n\n  \n Second direction. \n\n' })
    );

    expect(childTexts(generated.node)).toEqual(['IT IS ORDERED THAT:', 'First direction.', 'Second direction.']);
  });

  it('generates only the preamble when no wording has been entered', () => {
    const generated = buildFreeFormOrder(makeOrderData({ 'free-form-text': '   ' }));

    expect(childTexts(generated.node)).toEqual(['IT IS ORDERED THAT:']);
  });

  it('preserves the original row index in attendance paragraph IDs', () => {
    const generated = buildFreeFormOrder(
      makeOrderData(
        { 'free-form-text': '' },
        {
          attendance: [
            {
              id: 'defendant-1-attendance',
              sourceId: 'defendant-1-attendance',
              rowIndex: 1,
              partyKind: 'defendant',
              partyLabel: 'the first defendant',
              choice: 'letter-only',
              representativeName: 'Alex Example',
            },
          ],
        }
      )
    );

    expect(findNode(generated, 'paragraph:attendance-letter-1').textContent).toBe(
      'The Court read a letter from Alex Example.'
    );
  });
});
