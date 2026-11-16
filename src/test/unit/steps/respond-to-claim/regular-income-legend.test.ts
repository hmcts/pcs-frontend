jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

import type { Request } from 'express';

import type { BuiltFormContent } from '../../../../main/modules/steps/formBuilder/formFieldConfig.interface';
import { step } from '../../../../main/steps/respond-to-claim/regular-income';

type RegularIncomeStep = {
  extendGetContent: (req: Request, formContent: BuiltFormContent) => Record<string, unknown>;
};

const testedStep = step as unknown as RegularIncomeStep;

const heading = 'What regular income do you receive? (Optional)';

function makeReq(roles: string[]): Request {
  return { session: { user: { roles } } } as unknown as Request;
}

function makeFormContent(): BuiltFormContent {
  return {
    heading,
    fields: [
      {
        name: 'regularIncome',
        type: 'checkbox',
        componentType: 'checkboxes',
        component: { fieldset: { legend: { text: '', isPageHeading: false, classes: 'govuk-fieldset__legend--m' } } },
      },
    ],
  } as BuiltFormContent;
}

describe('respond-to-claim regular-income extendGetContent', () => {
  it('makes the question the page heading inside the legend for a citizen', () => {
    const formContent = makeFormContent();

    const extra = testedStep.extendGetContent(makeReq(['citizen']), formContent);

    expect(extra).toEqual({ heading: '' });
    expect(formContent.fields[0].component?.fieldset).toEqual({
      legend: { text: heading, isPageHeading: true, classes: 'govuk-fieldset__legend--l govuk-!-margin-bottom-6' },
    });
  });

  it('does not change the heading or legend for a legal representative', () => {
    const formContent = makeFormContent();

    const extra = testedStep.extendGetContent(makeReq(['caseworker-pcs-solicitor']), formContent);

    expect(extra).toEqual({});
    expect(formContent.fields[0].component?.fieldset).toEqual({
      legend: { text: '', isPageHeading: false, classes: 'govuk-fieldset__legend--m' },
    });
  });

  it('does nothing when there is no checkbox field', () => {
    expect(testedStep.extendGetContent(makeReq(['citizen']), { fields: [] } as BuiltFormContent)).toEqual({});
  });
});
