/**
 * The longest answer each field takes. Where pcs-api's CitizenPossessionClaimValidator checks a field these match
 * its limits, so nothing the journey accepts is refused at submit.
 */
const NAME = 60;
const SHORT_TEXT = 250;
const REASON = 500;
const CIRCUMSTANCES = 950;
const OTHER_REASONS = 6400;
const STATEMENT_OF_TRUTH = 100;

export const FIELD_LIMITS = {
  claimantFirstName: NAME,
  claimantLastName: NAME,
  organisationName: NAME,
  emailAddress: NAME,
  phoneNumber: 20,
  textMessageNumber: 20,
  defendantFirstName: NAME,
  defendantLastName: NAME,
  otherTenancyTypeDetails: REASON,
  noTenancyAgreementReason: REASON,
  otherGroundsDetails: REASON,
  groundReason: REASON,
  noNoticeReason: REASON,
  noticeTypeOther: 60,
  noticeUnavailableReason: REASON,
  handedToName: SHORT_TEXT,
  emailedTo: SHORT_TEXT,
  otherElectronicDetails: SHORT_TEXT,
  otherMethodDetails: SHORT_TEXT,
  otherFrequencyDetails: 100,
  ledgerDescription: 100,
  recoverySteps: REASON,
  defendantCircumstances: CIRCUMSTANCES,
  claimantCircumstances: CIRCUMSTANCES,
  underlesseeName: NAME,
  otherReasonsDetail: OTHER_REASONS,
  statementOfTruthFullName: STATEMENT_OF_TRUTH,
  statementOfTruthPosition: STATEMENT_OF_TRUTH,
  addressLine1: 150,
  addressLine: 50,
  defaultText: 100,
  defaultLongText: REASON,
} as const;
