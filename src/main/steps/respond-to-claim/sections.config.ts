import type { Request } from 'express';

import type { SectionConfig } from '../../modules/steps/stepFlow.interface';
import { hasAnyRentArrearsGround } from '../utils';

import type { RespondToClaimStepName } from './stepRegistry';

// Visual groups on the task-list page. Section order within a group follows declaration order below.
export const RESPOND_TO_CLAIM_SECTION_GROUPS = [
  { id: 'checkBeforeYouStart', titleKey: 'taskList.groups.checkBeforeYouStart' },
  { id: 'yourResponse', titleKey: 'taskList.groups.yourResponse' },
  { id: 'provideEvidence', titleKey: 'taskList.groups.provideEvidence' },
  { id: 'reviewAndSubmit', titleKey: 'taskList.groups.reviewAndSubmit' },
] as const;

export type RespondToClaimGroupId = (typeof RESPOND_TO_CLAIM_SECTION_GROUPS)[number]['id'];

const sectionDefs = [
  {
    id: 'startNowAndDetails',
    groupId: 'checkBeforeYouStart',
    titleKey: 'taskList.startNowAndDetails',
    steps: ['start-now', 'free-legal-advice', 'check-your-answers-start-now-and-details'],
  },
  {
    id: 'personalDetails',
    groupId: 'yourResponse',
    titleKey: 'taskList.personalDetails',
    steps: [
      'defendant-name-confirmation',
      'defendant-name-capture',
      'defendant-date-of-birth',
      'correspondence-address',
      'contact-preferences-email-or-post',
      'contact-preferences-telephone',
      'contact-preferences-text-message',
      'check-your-answers-personal-details',
    ],
  },
  {
    id: 'disputeAndTenancy',
    groupId: 'yourResponse',
    titleKey: 'taskList.disputeAndTenancy',
    steps: [
      'dispute-claim-interstitial',
      'landlord-registered',
      'landlord-licensed',
      'written-terms',
      'tenancy-type-details',
      'tenancy-date-details',
      'tenancy-date-unknown',
      'confirmation-of-notice-given',
      'confirmation-of-notice-date-when-provided',
      'confirmation-of-notice-date-when-not-provided',
      'rent-arrears-dispute',
      'non-rent-arrears-dispute',
      'counter-claim',
      'counter-claim-what-are-you-claiming-for',
      'counter-claim-specific-sum',
      'counter-claim-fee',
      'counter-claim-have-you-applied-for-help',
      'counter-claim-you-need-to-apply-for-help-with-your-fees',
      'counter-claim-against-whom',
      'counter-claim-about',
      'counter-claim-order-other-than-sum',
      'counter-claim-do-you-want-to-upload-files',
      'counter-claim-upload-files',
      'check-your-answers-your-response',
    ],
  },
  {
    id: 'payments',
    groupId: 'yourResponse',
    titleKey: 'taskList.payments',
    steps: [
      'payment-interstitial',
      'repayments-made',
      'repayments-agreed',
      'installment-payments',
      'how-much-afford-to-pay',
      'check-your-answers-payments-and-agreements',
    ],
    isApplicable: async (req: Request) => hasAnyRentArrearsGround(req),
  },
  {
    id: 'situationAndCircumstances',
    groupId: 'yourResponse',
    titleKey: 'taskList.situationAndCircumstances',
    steps: [
      'your-household-and-circumstances',
      'do-you-have-any-dependant-children',
      'do-you-have-any-other-dependants',
      'do-any-other-adults-live-in-your-home',
      'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home',
      'your-circumstances',
      'exceptional-hardship',
      'check-your-answers-your-circumstances',
    ],
  },
  {
    id: 'incomeAndExpenditure',
    groupId: 'yourResponse',
    titleKey: 'taskList.incomeAndExpenditure',
    steps: [
      'income-and-expenses',
      'what-regular-income-do-you-receive',
      'have-you-applied-for-universal-credit',
      'priority-debts',
      'priority-debt-details',
      'what-other-regular-expenses-do-you-have',
      'other-considerations',
      'check-your-answers-income-and-expenses',
    ],
  },
  {
    id: 'uploadFiles',
    groupId: 'provideEvidence',
    titleKey: 'taskList.uploadFiles',
    steps: ['upload-document', 'check-your-answers-documents'],
  },
  {
    id: 'checkYourAnswersAndSubmit',
    groupId: 'reviewAndSubmit',
    titleKey: 'taskList.checkYourAnswersAndSubmit',
    dependsOn: [
      'startNowAndDetails',
      'personalDetails',
      'disputeAndTenancy',
      'payments',
      'situationAndCircumstances',
      'incomeAndExpenditure',
      'uploadFiles',
    ],
    // 'reasonable-adjustments-triage', 'equality-and-diversity-start' and
    // 'equality-and-diversity-end' are intentionally parked out of the live citizen
    // journey while RA / Your Support and PCQ integrations are still in progress.
    // Their step folders, registry entries and locale files are retained so re-
    // enablement is a one-line restore here. See HDPI-3793 (RA triage), HDPI-6649
    // (RA confirmation, parked on a custom branch) and the PCQ tie-in tracked in
    // config/default.json (`pcq.enabled`).
    steps: [
      'language-used',
      'check-your-answers',
      'response-submitted',
      'response-submitted-counter-claim-fee-payment-needed',
      'counter-claim-application-fee-amount',
      'counter-claim-payment-successful',
      'response-and-counter-claim-submitted',
    ],
  },
] as const satisfies readonly {
  id: string;
  groupId: string;
  titleKey: string;
  steps: readonly RespondToClaimStepName[];
  isApplicable?: (req: Request) => Promise<boolean>;
  dependsOn?: readonly string[];
}[];

export type RespondToClaimSectionId = (typeof sectionDefs)[number]['id'];

export const RESPOND_TO_CLAIM_SECTION_IDS: readonly RespondToClaimSectionId[] = sectionDefs.map(s => s.id);

export const respondToClaimSections: readonly SectionConfig[] = sectionDefs;

export const CYA_STEP_PREFIX = 'check-your-answers-' as const;

export const RESPOND_TO_CLAIM_SECTION_ENUMS = [
  'START_NOW_AND_DETAILS',
  'PERSONAL_DETAILS',
  'DISPUTE_AND_TENANCY',
  'PAYMENTS',
  'SITUATION_AND_CIRCUMSTANCES',
  'INCOME_AND_EXPENDITURE',
  'UPLOAD_FILES',
  'CHECK_YOUR_ANSWERS_AND_SUBMIT',
] as const;

export type RespondToClaimSectionEnum = (typeof RESPOND_TO_CLAIM_SECTION_ENUMS)[number];

export function sectionIdToBackendEnum(id: RespondToClaimSectionId): RespondToClaimSectionEnum {
  return id.replace(/([A-Z])/g, '_$1').toUpperCase() as RespondToClaimSectionEnum;
}

export function sectionHasCya(section: SectionConfig): boolean {
  return section.steps.some(stepName => stepName.startsWith(CYA_STEP_PREFIX));
}

const stepToSectionId = buildStepToSectionIdMap();

export const sectionById: ReadonlyMap<RespondToClaimSectionId, SectionConfig> = new Map(
  sectionDefs.map(section => [section.id, section as unknown as SectionConfig])
);

export function findSectionIdForStep(stepName: string): RespondToClaimSectionId | undefined {
  return stepToSectionId.get(stepName);
}

function buildStepToSectionIdMap(): Map<string, RespondToClaimSectionId> {
  const map = new Map<string, RespondToClaimSectionId>();
  for (const section of sectionDefs) {
    for (const stepName of section.steps) {
      if (map.has(stepName)) {
        throw new Error(`Step "${stepName}" appears in more than one respond-to-claim section`);
      }
      map.set(stepName, section.id);
    }
  }
  return map;
}

assertEverySectionMapsToBackendEnum();

function assertEverySectionMapsToBackendEnum(): void {
  for (const section of sectionDefs) {
    const enumValue = sectionIdToBackendEnum(section.id);
    if (!RESPOND_TO_CLAIM_SECTION_ENUMS.includes(enumValue)) {
      throw new Error(
        `Section id "${section.id}" derives backend enum "${enumValue}" which is not in RESPOND_TO_CLAIM_SECTION_ENUMS`
      );
    }
  }
}
