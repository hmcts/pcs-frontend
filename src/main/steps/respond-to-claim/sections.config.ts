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
      'counter-claim-against-whom',
      'counter-claim-about',
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
    steps: ['upload-document', 'support-needs', 'check-your-answers-documents'],
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
    steps: ['equality-and-diversity-start', 'equality-and-diversity-end', 'language-used', 'check-your-answers'],
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

// URL prefix that identifies a section's check-your-answers page.
export const CYA_STEP_PREFIX = 'check-your-answers-' as const;

// Backend enum values for `defendantResponses.confirmedSections` — must match
// pcs-api `RespondToClaimSection` Java enum exactly.
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

// Reverse lookup built once at module load. Step is in exactly one section
// (duplicates throw at boot — fail loud rather than silently confusing the
// confirmation flag).
const stepToSectionId = new Map<string, RespondToClaimSectionId>();
for (const section of sectionDefs) {
  for (const stepName of section.steps) {
    if (stepToSectionId.has(stepName)) {
      throw new Error(`Step "${stepName}" appears in more than one respond-to-claim section`);
    }
    stepToSectionId.set(stepName, section.id);
  }
}

export function findSectionIdForStep(stepName: string): RespondToClaimSectionId | undefined {
  return stepToSectionId.get(stepName);
}

// Startup invariant: every declared section maps to a recognised backend enum.
// Fails loud at boot if FE and pcs-api `RespondToClaimSection` drift apart.
for (const section of sectionDefs) {
  const enumValue = sectionIdToBackendEnum(section.id);
  if (!RESPOND_TO_CLAIM_SECTION_ENUMS.includes(enumValue)) {
    throw new Error(
      `Section id "${section.id}" derives backend enum "${enumValue}" which is not in RESPOND_TO_CLAIM_SECTION_ENUMS`
    );
  }
}
