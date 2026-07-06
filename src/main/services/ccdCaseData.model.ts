import {
  CcdCase,
  CcdCaseAddress,
  CcdCaseData,
  CcdClaimGroundSummaryItem,
  CcdClaimantEnteredDefendantDetails,
  CcdCounterClaim,
  CcdDefendantParty,
  CcdDefendantResponses,
  PossessionClaimResponse,
  YesNoEnum,
} from '@services/ccdCase.interface';

export type { CcdCase, PossessionClaimResponse, YesNoNotSureValue } from '@services/ccdCase.interface';

export class CcdCaseModel {
  protected readonly validatedCase: CcdCase;

  constructor(validatedCase: CcdCase) {
    this.validatedCase = validatedCase;
  }

  get data(): CcdCaseData {
    return this.validatedCase.data ?? {};
  }

  get id(): string {
    return this.validatedCase.id ?? '';
  }

  get dateIssued(): Date | undefined {
    return this.data.dateIssued ? new Date(this.data.dateIssued) : undefined;
  }

  get defendantName(): string {
    return this.data.defendantName ?? '';
  }

  get defendantAddress(): string {
    return this.data.defendantAddress ?? '';
  }

  get rentArrears_Total(): string | undefined {
    return this.data.rentArrears_Total;
  }

  get noticeServed(): string | undefined {
    return this.data.noticeServed;
  }

  get walesNoticeServed(): string | undefined {
    return this.data.walesNoticeServed;
  }

  get propertyAddress(): CcdCaseAddress | undefined {
    return this.data.propertyAddress;
  }

  get claimGroundSummaries(): CcdClaimGroundSummaryItem[] | undefined {
    return this.data.claimGroundSummaries;
  }

  get userPcqIdSet(): string | undefined {
    return this.data.userPcqIdSet;
  }

  get tenancy_TenancyLicenceDate(): string | undefined {
    return this.data.tenancy_TenancyLicenceDate;
  }

  get legislativeCountry(): string | undefined {
    return this.data.legislativeCountry;
  }

  get notice_HandedOverDateTime(): string | undefined {
    return this.data.notice_HandedOverDateTime;
  }

  get notice_PostedDate(): string | undefined {
    return this.data.notice_PostedDate;
  }

  get notice_OtherElectronicDateTime(): string | undefined {
    return this.data.notice_OtherElectronicDateTime;
  }

  get notice_DeliveredDate(): string | undefined {
    return this.data.notice_DeliveredDate;
  }

  get notice_EmailSentDateTime(): string | undefined {
    return this.data.notice_EmailSentDateTime;
  }

  get notice_OtherDateTime(): string | undefined {
    return this.data.notice_OtherDateTime;
  }

  get tenancy_TypeOfTenancyLicence(): string | undefined {
    return this.data.tenancy_TypeOfTenancyLicence;
  }

  get occupationLicenceTypeWales(): string | undefined {
    return this.data.occupationLicenceTypeWales;
  }

  get licenceStartDate(): string | undefined {
    return this.data.licenceStartDate;
  }

  /**
   * Combined tenancy/licence start date used in respondent flows.
   *
   * England: tenancy_TenancyLicenceDate
   * Wales: licenceStartDate
   */
  get tenancyStartDate(): string | undefined {
    return this.tenancy_TenancyLicenceDate ?? this.licenceStartDate;
  }

  /**
   * Convenience boolean for routing decisions that depend on whether
   * a tenancy/licence start date exists in CCD.
   */
  get hasTenancyStartDate(): boolean {
    const start = this.tenancyStartDate;
    return !!(start && start.trim());
  }

  get possessionClaimResponse(): PossessionClaimResponse | undefined {
    return this.data.possessionClaimResponse;
  }

  get submitDraftAnswers(): string | undefined {
    return this.data.submitDraftAnswers;
  }

  get claimantName(): string {
    if (this.data.isClaimantNameCorrect === YesNoEnum.NO && this.data.overriddenClaimantName?.trim()) {
      return this.data.overriddenClaimantName.trim();
    }

    if (this.data.claimantName?.trim()) {
      return this.data.claimantName.trim();
    }

    return this.data.possessionClaimResponse?.claimantOrganisations?.[0]?.value ?? '';
  }

  get claimantEnteredDefendantDetails(): CcdClaimantEnteredDefendantDetails {
    return (
      this.data.possessionClaimResponse?.claimantEnteredDefendantDetails ?? ({} as CcdClaimantEnteredDefendantDetails)
    );
  }

  get claimantEnteredDefendantDetailsNameKnown(): string {
    return this.claimantEnteredDefendantDetails.nameKnown ?? '';
  }

  get claimantEnteredDefendantDetailsAddressKnown(): string {
    return this.claimantEnteredDefendantDetails.addressKnown ?? '';
  }

  get claimantEnteredDefendantDetailsAddressSameAsProperty(): string {
    return this.claimantEnteredDefendantDetails.addressSameAsProperty ?? '';
  }

  get claimantEnteredDefendantDetailsName(): string {
    if (this.defendantName?.trim()) {
      return this.defendantName.trim();
    }

    const { firstName, lastName } = this.claimantEnteredDefendantDetails;
    return firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
  }

  get defendantContactDetailsParty(): CcdDefendantParty {
    return this.data.possessionClaimResponse?.defendantContactDetails?.party ?? ({} as CcdDefendantParty);
  }

  get defendantContactDetailsPartyEmailAddress(): string | undefined {
    return this.defendantContactDetailsParty.emailAddress ?? undefined;
  }

  get defendantContactDetailsPartyAddress(): CcdCaseAddress | undefined {
    const { address } = this.defendantContactDetailsParty;
    if (!address || Array.isArray(address) || !('AddressLine1' in address)) {
      return undefined;
    }

    return address as CcdCaseAddress;
  }

  get defendantResponses(): CcdDefendantResponses | undefined {
    return this.data.possessionClaimResponse?.defendantResponses ?? undefined;
  }

  get defendantResponsesTenancyStartDateConfirmation(): string | undefined {
    return this.defendantResponses?.tenancyStartDateConfirmation ?? undefined;
  }

  get defendantResponsesTenancyStartDate(): string | undefined {
    return this.defendantResponses?.tenancyStartDate ?? undefined;
  }

  get defendantResponsesFreeLegalAdvice(): string | undefined {
    return this.defendantResponses?.freeLegalAdvice ?? undefined;
  }

  get defendantResponsesDefendantNameConfirmation(): string | undefined {
    return this.defendantResponses?.defendantNameConfirmation ?? undefined;
  }

  get defendantResponsesDateOfBirth(): string | undefined {
    return this.defendantResponses?.dateOfBirth ?? undefined;
  }

  get defendantResponsesContactByPhone(): string | undefined {
    return this.defendantResponses?.contactByPhone ?? undefined;
  }

  get defendantResponsesContactByText(): string | undefined {
    return this.defendantResponses?.contactByText ?? undefined;
  }

  get isDefendantContactByPhone(): boolean {
    return this.defendantResponsesContactByPhone === YesNoEnum.YES;
  }

  get isDefendantContactByEmail(): boolean {
    return this.defendantResponsesContactByEmail === YesNoEnum.YES;
  }

  get isDefendantContactByPost(): boolean {
    return this.defendantResponsesContactByPost === YesNoEnum.YES;
  }

  get isDefendantContactByText(): boolean {
    return this.defendantResponsesContactByText === YesNoEnum.YES;
  }

  get defendantResponsesContactByEmail(): string | undefined {
    return this.defendantResponses?.contactByEmail ?? undefined;
  }

  get defendantResponsesContactByPost(): string | undefined {
    return this.defendantResponses?.contactByPost ?? undefined;
  }

  get defendantResponsesLandlordLicensed(): string | undefined {
    return this.defendantResponses?.landlordLicensed ?? undefined;
  }

  get defendantResponsesCounterClaimWantToUploadFiles(): string | undefined {
    return this.defendantResponses?.counterClaimWantToUploadFiles ?? undefined;
  }

  get defendantResponsesCounterClaim(): CcdCounterClaim | undefined {
    return this.defendantResponses?.counterClaim ?? undefined;
  }

  get introGroundsIntroductoryDemotedOrOtherGrounds(): string[] {
    return this.data.introGrounds_IntroductoryDemotedOrOtherGrounds ?? [];
  }

  get secureGroundsWalesDiscretionaryGrounds(): string[] {
    return this.data.secureGroundsWales_DiscretionaryGrounds ?? [];
  }

  get defendantContactDetailsPartyPhoneNumber(): string | undefined {
    return this.defendantContactDetailsParty.phoneNumber ?? undefined;
  }

  get defendantContactDetailsPartyName(): string {
    const { firstName, lastName } = this.defendantContactDetailsParty;
    return firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
  }

  /** Defendant's answer to "were you given notice" (normalised to yes/no/imNotSure). Used for arrears back-navigation after resume. */
  get defendantResponsesPossessionNoticeReceived(): string | undefined {
    const raw = this.defendantResponses?.possessionNoticeReceived;
    if (raw === undefined || raw === null) {
      return undefined;
    }
    const normalized = String(raw).trim().toUpperCase();

    if (normalized === 'YES') {
      return 'yes';
    }

    if (normalized === 'NO') {
      return 'no';
    }

    if (normalized === 'NOT_SURE' || normalized === 'IM_NOT_SURE' || normalized === 'IMNOTSURE') {
      return 'imNotSure';
    }

    return String(raw).trim();
  }

  get noticeDate(): string | undefined {
    const populatedNoticeField = [
      this.notice_PostedDate,
      this.notice_DeliveredDate,
      this.notice_HandedOverDateTime,
      this.notice_EmailSentDateTime,
      this.notice_OtherElectronicDateTime,
      this.notice_OtherDateTime,
    ].find(Boolean);

    return populatedNoticeField?.slice(0, 10);
  }
}
