import express, { type Request, type Response } from 'express';
import i18next from 'i18next';

import { Nunjucks } from '../../../../main/modules/nunjucks';
import { setFormData } from '../../../../main/modules/steps';
import type { BuiltFormContent } from '../../../../main/modules/steps/formBuilder/formFieldConfig.interface';
import { GenAppState } from '../../../../main/services/ccdCase.interface';
import { ccdCaseService } from '../../../../main/services/ccdCaseService';
import { getFee } from '../../../../main/services/feeLookupService';
import { findStep } from '../../../../main/steps';
import { setApplicationId } from '../../../../main/steps/make-an-application/session';

jest.mock('../../../../main/services/feeLookupService');
jest.mock('../../../../main/services/ccdCaseService');

async function createRequest(stepName: string, enabled: boolean, lang = 'en') {
  const app = express();
  new Nunjucks(false).enableFor(app);
  const i18n = i18next.createInstance();
  await i18n.init({ lng: lang, fallbackLng: 'en', resources: { [lang]: { common: {} } } });
  const render = jest.fn<void, [string, BuiltFormContent]>();
  const res = {
    locals: {
      features: { release1bEnabled: enabled },
      step: { name: stepName, journey: 'makeAnApplication' },
      validatedCase: { id: '1111222233334444' },
    },
    render,
    status: jest.fn().mockReturnThis(),
    redirect: jest.fn(),
  } as unknown as Response;
  const req = {
    app,
    res,
    i18n,
    language: lang,
    session: { save: jest.fn((callback: (err?: Error) => void) => callback()) },
    params: { caseReference: '1111222233334444' },
    body: {},
    originalUrl: `/case/1111222233334444/make-an-application/${stepName}`,
  } as unknown as Request;
  setFormData(req, 'choose-an-application', { typeOfApplication: 'ADJOURN' });
  setFormData(req, 'is-the-court-hearing-in-the-next-14-days', { hearingInNext14Days: 'no' });
  setFormData(req, 'have-the-other-parties-agreed-to-this-application', { otherPartiesAgreed: 'no' });
  const step = findStep('make-an-application', stepName, 'default')!;
  const controller = typeof step.getController === 'function' ? step.getController() : step.getController;
  return {
    req,
    res,
    step,
    getRenderedContent: () => render.mock.calls[0][1],
    getContent: async () => {
      await controller.get(req, res);
      return render.mock.calls[0][1];
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getFee).mockResolvedValue(126);
});

describe.each([false, true])('adjourn content with release 1B = %s', enabled => {
  it('selects the correct introduction copy', async () => {
    const { getContent } = await createRequest('ask-to-adjourn-the-court-hearing', enabled);
    const content = await getContent();
    expect(content.freeIfAtLeast14DaysAway).toBe(
      enabled
        ? 'It’s free to apply if your court hearing is at least 14 days away and the other parties have already agreed to it.'
        : 'It’s free to apply if your court hearing is at least 14 days away.'
    );
  });

  it.each(['GET', 'invalid POST'])('uses the correct hearing hint and explanatory paragraphs on %s', async method => {
    const { req, res, step, getContent, getRenderedContent } = await createRequest(
      'is-the-court-hearing-in-the-next-14-days',
      enabled
    );
    if (method === 'GET') {
      await getContent();
    } else {
      await step.postController!.post(req, res, jest.fn());
    }
    expect(jest.mocked(res.status).mock.calls).toEqual(method === 'GET' ? [] : [[400]]);
    const content = getRenderedContent();
    expect(content.fields[0].component?.hint).toEqual({
      text:
        'This will affect the fee you will pay. You do not need to pay a fee if your court hearing is (at least) 14 days away' +
        (enabled ? ' and all the other parties have agreed to it.' : '.'),
    });
    const html = req.app.locals.nunjucksEnv.render(step.view, content) as string;
    expect(html.includes('The ‘other parties’ are the other people or organisations')).toBe(enabled);
    expect(html.includes('Every other party will need to agree')).toBe(enabled);
    const questionIndex = html.indexOf('<fieldset');
    expect(questionIndex).toBeGreaterThan(-1);
    const beforeQuestion = html.slice(0, questionIndex);
    expect(beforeQuestion.includes('The ‘other parties’ are the other people or organisations')).toBe(enabled);
    expect(beforeQuestion.includes('Every other party will need to agree')).toBe(enabled);
  });
});

it('keeps the existing Welsh hearing hint when release 1B is disabled', async () => {
  const { getContent } = await createRequest('is-the-court-hearing-in-the-next-14-days', false, 'cy');
  const content = await getContent();
  expect(content.fields[0].component?.hint).toEqual({
    text: 'Bydd hyn yn effeithio ar y ffi y byddwch yn ei thalu. Nid ydych angen talu ffi os yw eich gwrandawiad llys (o leiaf) 14 diwrnod i ffwrdd.',
  });
});

describe.each([false, true])('adjourn payment with release 1B = %s', enabled => {
  it('shows Submit when the hearing is not in the next 14 days and the other parties agreed', async () => {
    const { req, getContent } = await createRequest('check-your-answers', enabled);
    setFormData(req, 'have-the-other-parties-agreed-to-this-application', { otherPartiesAgreed: 'yes' });
    setFormData(req, 'do-you-need-help-paying-the-fee', { helpWithFeesNeeded: 'no' });

    const content = await getContent();

    expect(content.buttonLabel).toBe('Submit');
  });

  it.each([
    ['no help', 'no', 'no', true],
    ['not yet applied', 'yes', 'no', true],
    ['reference provided', 'yes', 'yes', false],
  ])('preserves the payment button and submission data for %s', async (_label, needHwf, appliedForHwf, feeExpected) => {
    const { req, res, step, getContent } = await createRequest('check-your-answers', enabled);
    setFormData(req, 'do-you-need-help-paying-the-fee', { helpWithFeesNeeded: needHwf });
    setFormData(req, 'have-you-already-applied-for-help-with-fees', {
      alreadyAppliedForHwf: appliedForHwf,
      'alreadyAppliedForHwf.hwfReference': 'HWF-123-ABC',
    });
    const content = await getContent();
    expect(content.buttonLabel).toBe(enabled && feeExpected ? 'Continue to payment' : 'Submit');

    setApplicationId(req, 'application-id');
    req.body = { statementOfTruthAccepted: ['yes'], fullName: 'Test Defendant' };
    jest.mocked(ccdCaseService.submitGeneralApplication).mockResolvedValue({ state: GenAppState.GEN_APP_ISSUED });
    const next = jest.fn();
    await step.postController!.post(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(ccdCaseService.submitGeneralApplication).toHaveBeenCalledWith(undefined, {
      id: '1111222233334444',
      data: {
        citizenGenAppRequest: expect.objectContaining({
          within14Days: 'NO',
          otherPartiesAgreed: 'NO',
          needHwf: enabled ? needHwf.toUpperCase() : undefined,
          appliedForHwf: enabled && needHwf === 'yes' ? appliedForHwf.toUpperCase() : undefined,
          hwfReference: enabled && needHwf === 'yes' && appliedForHwf === 'yes' ? 'HWF-123-ABC' : undefined,
        }),
      },
    });
  });
});
