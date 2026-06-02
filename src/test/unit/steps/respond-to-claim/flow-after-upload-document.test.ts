import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

import { getNextStep } from '@modules/steps/flow';

/**
 * HDPI-6929 — after `upload-document`, citizens never walk through the parked
 * `reasonable-adjustments-triage`, `equality-and-diversity-start` or
 * `equality-and-diversity-end` placeholder pages while RA / Your Support and
 * PCQ integrations are still in progress. They progress through the per-
 * section CYA chain to `language-used` and on to the final check-your-answers
 * page.
 */
describe('respond-to-claim citizen flow — post upload-document', () => {
  const PARKED_STEPS = ['reasonable-adjustments-triage', 'equality-and-diversity-start', 'equality-and-diversity-end'];

  const makeReq = (): Request =>
    ({
      res: { locals: { validatedCase: { data: {} } } },
    }) as unknown as Request;

  const walkFrom = async (startStep: string): Promise<string[]> => {
    const visited: string[] = [];
    let current: string | null = startStep;

    while (current) {
      const next: string | null = await getNextStep(makeReq(), current, flowConfig, {});
      if (!next || visited.includes(next)) {
        break;
      }
      visited.push(next);
      current = next;
    }

    return visited;
  };

  it('never routes through any parked step after upload-document', async () => {
    const path = await walkFrom('upload-document');

    for (const parked of PARKED_STEPS) {
      expect(path).not.toContain(parked);
    }
  });

  it('eventually reaches language-used and check-your-answers', async () => {
    const path = await walkFrom('upload-document');

    expect(path).toContain('language-used');
    expect(path).toContain('check-your-answers');
  });

  it('progresses language-used → check-your-answers → end-now', async () => {
    const req = makeReq();

    const afterLanguage = await getNextStep(req, 'language-used', flowConfig, {});
    expect(afterLanguage).toBe('check-your-answers');

    const afterCheckYourAnswers = await getNextStep(req, 'check-your-answers', flowConfig, {});
    expect(afterCheckYourAnswers).toBe('end-now');
  });
});
