import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';
import {
  RESPOND_TO_CLAIM_SECTION_ENUMS,
  RESPOND_TO_CLAIM_SECTION_IDS,
  findSectionIdForStep,
  respondToClaimSections,
  sectionHasCya,
  sectionIdToBackendEnum,
} from '../../../../main/steps/respond-to-claim/sections.config';
import { stepRegistry } from '../../../../main/steps/respond-to-claim/stepRegistry';
import { getSectionCoverage, getSectionForStep } from '../../../../main/steps/utils';

import { getNextStep } from '@modules/steps/flow';

const findSection = (id: string) => respondToClaimSections.find(section => section.id === id);

describe('respond-to-claim sections config', () => {
  it('maps every sectioned flow step to exactly one section', () => {
    // 'reasonable-adjustments-triage', 'equality-and-diversity-start'
    // and 'equality-and-diversity-end' are intentionally parked out of the live
    // section flow (see sections.config.ts). They remain in the registry so direct
    // URL access and re-enablement still work, so marking them as intentionally
    // unmapped here in addition to flowConfig.nonSectionStepOrder.
    const nonSectionStepSlugs = new Set([
      ...(flowConfig.nonSectionStepOrder ?? []),
      'reasonable-adjustments-triage',
      'equality-and-diversity-start',
      'equality-and-diversity-end',
    ]);
    const flowStepSlugs = Object.keys(stepRegistry).filter(stepSlug => !nonSectionStepSlugs.has(stepSlug));
    const coverage = getSectionCoverage(flowStepSlugs, respondToClaimSections);

    expect(coverage.unmappedSteps).toEqual([]);
    expect(coverage.duplicateAssignments).toEqual([]);
  });

  it('lists only steps that exist in the configured journey order', () => {
    const flowStepKeys = new Set(Object.keys(stepRegistry));
    const sectionStepsNotInFlow: string[] = [];

    for (const section of respondToClaimSections) {
      for (const slug of section.steps) {
        if (!flowStepKeys.has(slug)) {
          sectionStepsNotInFlow.push(slug);
        }
      }
    }

    expect(sectionStepsNotInFlow).toEqual([]);
  });

  it('section ids match the canonical id list (no missing or extra sections)', () => {
    expect(respondToClaimSections.map(section => section.id)).toEqual([...RESPOND_TO_CLAIM_SECTION_IDS]);
  });

  it('has no duplicate section ids', () => {
    const ids = respondToClaimSections.map(section => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps upload section steps', () => {
    expect(findSection('uploadFiles')?.steps).toEqual(['upload-document', 'check-your-answers-documents']);
  });

  it('maps end-of-journey steps into final section', () => {
    expect(findSection('checkYourAnswersAndSubmit')?.steps).toEqual([
      'language-used',
      'check-your-answers',
      'response-submitted',
      'response-submitted-counter-claim-fee-payment-needed',
      'response-and-counter-claim-submitted',
    ]);
  });

  // HDPI-6929 — focused navigation test
  describe('HDPI-6929 — navigation contract from upload-document', () => {
    const PARKED_STEPS = [
      'reasonable-adjustments-triage',
      'equality-and-diversity-start',
      'equality-and-diversity-end',
    ];

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

    it('next step after upload-document is check-your-answers-documents (per-section CYA, not RA triage)', async () => {
      const next = await getNextStep(makeReq(), 'upload-document', flowConfig, {});

      expect(next).toBe('check-your-answers-documents');
      expect(PARKED_STEPS).not.toContain(next);
    });

    it('forward walk from upload-document never visits any parked step', async () => {
      const path = await walkFrom('upload-document');

      for (const parked of PARKED_STEPS) {
        expect(path).not.toContain(parked);
      }
    });

    it('forward walk from upload-document reaches language-used and check-your-answers', async () => {
      const path = await walkFrom('upload-document');

      expect(path).toContain('language-used');
      expect(path).toContain('check-your-answers');
    });
  });

  it('treats payments section as applicable for rent arrears claims', async () => {
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              claimGroundSummaries: [{ value: { isRentArrears: 'Yes' }, id: 'ground-1' }],
            },
          },
        },
      },
    } as unknown as Request;

    await expect(findSection('payments')?.isApplicable?.(req)).resolves.toBe(true);
  });

  it('treats payments section as not applicable for non-rent arrears claims', async () => {
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              claimGroundSummaries: [{ value: { isRentArrears: 'No' }, id: 'ground-1' }],
            },
          },
        },
      },
    } as unknown as Request;

    await expect(findSection('payments')?.isApplicable?.(req)).resolves.toBe(false);
  });

  describe('completedSections helpers', () => {
    it('sectionIdToBackendEnum derives the correct pcs-api enum value for every section id', () => {
      const expected: Record<string, string> = {
        startNowAndDetails: 'START_NOW_AND_DETAILS',
        personalDetails: 'PERSONAL_DETAILS',
        disputeAndTenancy: 'DISPUTE_AND_TENANCY',
        payments: 'PAYMENTS',
        situationAndCircumstances: 'SITUATION_AND_CIRCUMSTANCES',
        incomeAndExpenditure: 'INCOME_AND_EXPENDITURE',
        uploadFiles: 'UPLOAD_FILES',
        checkYourAnswersAndSubmit: 'CHECK_YOUR_ANSWERS_AND_SUBMIT',
      };
      for (const id of RESPOND_TO_CLAIM_SECTION_IDS) {
        expect(sectionIdToBackendEnum(id)).toBe(expected[id]);
      }
    });

    it('every derived backend enum value is in RESPOND_TO_CLAIM_SECTION_ENUMS (FE↔BE bond)', () => {
      for (const id of RESPOND_TO_CLAIM_SECTION_IDS) {
        expect(RESPOND_TO_CLAIM_SECTION_ENUMS).toContain(sectionIdToBackendEnum(id));
      }
    });

    it('findSectionIdForStep returns the owning section id for a known step', () => {
      expect(findSectionIdForStep('defendant-name-confirmation')).toBe('personalDetails');
      expect(findSectionIdForStep('check-your-answers-personal-details')).toBe('personalDetails');
      expect(findSectionIdForStep('upload-document')).toBe('uploadFiles');
    });

    it('findSectionIdForStep returns undefined for steps not in any section', () => {
      expect(findSectionIdForStep('task-list')).toBeUndefined();
      expect(findSectionIdForStep('end-now')).toBeUndefined();
      expect(findSectionIdForStep('totally-fictional-step')).toBeUndefined();
    });

    it('sectionHasCya is true for sections with a check-your-answers-* step', () => {
      const personalDetails = findSection('personalDetails')!;
      expect(sectionHasCya(personalDetails)).toBe(true);

      const uploadFiles = findSection('uploadFiles')!;
      expect(sectionHasCya(uploadFiles)).toBe(true);
    });

    it('sectionHasCya is false for checkYourAnswersAndSubmit (no per-section CYA)', () => {
      const finalSection = findSection('checkYourAnswersAndSubmit')!;
      expect(sectionHasCya(finalSection)).toBe(false);
    });
  });

  describe('section coherence — no cross-section navigation references', () => {
    const sectionFor = (slug: string) => getSectionForStep(slug, respondToClaimSections);

    it('every routes[].nextStep stays within the same section (or targets a non-section step)', () => {
      const violations: string[] = [];

      for (const [fromSlug, step] of Object.entries(flowConfig.steps)) {
        const fromSection = sectionFor(fromSlug);
        for (const route of step.routes ?? []) {
          const toSection = sectionFor(route.nextStep);
          if (toSection !== null && fromSection !== null && fromSection !== toSection) {
            violations.push(`${fromSlug} (${fromSection}) -> ${route.nextStep} (${toSection})`);
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('every string previousStep stays within the same section (or targets a non-section step)', () => {
      const violations: string[] = [];

      for (const [slug, step] of Object.entries(flowConfig.steps)) {
        if (typeof step.previousStep !== 'string') {
          continue;
        }
        const fromSection = sectionFor(slug);
        const toSection = sectionFor(step.previousStep);
        if (toSection !== null && fromSection !== null && fromSection !== toSection) {
          violations.push(`${slug} (${fromSection}) -> previousStep ${step.previousStep} (${toSection})`);
        }
      }

      expect(violations).toEqual([]);
    });
  });
});
