import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

import { getNextStep } from '@modules/steps/flow';

/**
 * HDPI-6929 — after `upload-document`, citizens are taken straight to
 * `language-used`. `reasonable-adjustments-triage`, `equality-and-diversity-start`
 * and `equality-and-diversity-end` are intentionally parked out of the section
 * flow while RA / Your Support and PCQ integrations are still in progress.
 */
describe('respond-to-claim citizen flow — post upload-document', () => {
  const makeReq = (): Request =>
    ({
      res: { locals: { validatedCase: { data: {} } } },
    }) as unknown as Request;

  it('routes from upload-document directly to language-used (skipping RA triage and E&D)', async () => {
    const next = await getNextStep(makeReq(), 'upload-document', flowConfig, {});

    expect(next).toBe('language-used');
  });

  it('does not stop on reasonable-adjustments-triage', async () => {
    const next = await getNextStep(makeReq(), 'upload-document', flowConfig, {});

    expect(next).not.toBe('reasonable-adjustments-triage');
  });

  it('does not stop on equality-and-diversity-start', async () => {
    const next = await getNextStep(makeReq(), 'upload-document', flowConfig, {});

    expect(next).not.toBe('equality-and-diversity-start');
  });

  it('progresses language-used → check-your-answers → end-now', async () => {
    const req = makeReq();

    const afterLanguage = await getNextStep(req, 'language-used', flowConfig, {});
    expect(afterLanguage).toBe('check-your-answers');

    const afterCheckYourAnswers = await getNextStep(req, 'check-your-answers', flowConfig, {});
    expect(afterCheckYourAnswers).toBe('end-now');
  });
});
