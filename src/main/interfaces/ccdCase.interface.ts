export enum CaseState {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
}

export type YesNoValue = 'Yes' | 'No' | null;

export interface CcdUserCase {
  id: string;
  state: CaseState;
  jurisdiction: string;
  case_type_id: string;
  case_data: UserJourneyCaseData;
}

export interface CcdUserCases {
  total: number;
  cases: CcdUserCase[];
}

export interface CcdCase {
  id: string;
  data: UserJourneyCaseData;
}

export interface OrdersDemoAttendance {
  party: string;
  mode: string | null;
  name: string | null;
}

export interface OrdersDemoPayload {
  orderType?: string;
  previewText?: string;
  previewStatus?: string;
  previewWasEdited?: boolean;
  judicialNotes?: {
    dateOfTenancy?: string;
    dateNoticeServed?: string;
    groundsText?: string;
    arrearsOnIssue?: string;
    arrearsAtNotice?: string;
    arrearsAtHearing?: string;
    currentRent?: string;
    currentRentFrequency?: string;
    hearingNotes?: string;
  };
  attendance?: {
    claimant?: OrdersDemoAttendance;
    defendants?: OrdersDemoAttendance[];
  };
  orderDetails?: {
    groundsMode?: string | null;
    mandatoryGroundsDetails?: string | null;
    discretionaryGroundsDetails?: string | null;
    outright?: {
      timing?: string | null;
      possessionDate?: string | null;
    };
    suspended?: {
      possessionDate?: string | null;
      arrears?: {
        enabled: boolean;
        amount?: string | null;
        dueBy?: string | null;
      };
      initialPayment?: {
        enabled: boolean;
        amount?: string | null;
        dueBy?: string | null;
      };
      instalments?: {
        enabled: boolean;
        amount?: string | null;
        frequency?: string | null;
        frequencyOther?: string | null;
        frequencyOtherValue?: string | null;
        frequencyOtherUnit?: string | null;
        dueBy?: string | null;
      };
    };
    dismissal?: {
      outcome?: string | null;
    };
    adjournment?: {
      mode?: string | null;
      nextHearingMode?: string | null;
      firstAvailableAfter?: string | null;
      onDate?: string | null;
      timeEstimate?: string | null;
      listingNotes?: string | null;
      directions?: string | null;
      generally?: {
        paymentEnabled: boolean;
        paymentAmount?: string | null;
        paymentFrequency?: string | null;
        paymentFrequencyOther?: string | null;
        firstPaymentBy?: string | null;
        strikeOutEnabled: boolean;
        strikeOutBy?: string | null;
      };
      // Legacy v1 fields used by `/orders-demo-v1`.
      nextHearingDate?: string | null;
      time?: string | null;
      hearingType?: string | null;
      location?: string | null;
      reason?: string | null;
    };
  };
  judgment?: {
    enabled?: boolean;
    defendants?: string[];
    arrears?: {
      enabled: boolean;
      amount?: string | null;
    };
    interest?: {
      enabled: boolean;
      amount?: string | null;
    };
    useAndOccupation?: {
      enabled: boolean;
      dailyRate?: string | null;
      from?: string | null;
    };
    suspendedOnSameTerms?: boolean;
    instalments?: {
      enabled: boolean;
      amount?: string | null;
      frequency?: string | null;
      frequencyOther?: string | null;
      frequencyOtherValue?: string | null;
      frequencyOtherUnit?: string | null;
      firstPaymentBy?: string | null;
    };
  };
  costs?: {
    mode?: string | null;
    fixedAmount?: number | null;
    assessedAmount?: number | null;
    // Legacy v1 field used by `/orders-demo-v1`.
    assessedBasis?: string | null;
    payBy?: string | null;
    addToDebt?: boolean;
    otherText?: string | null;
    suspendedOnSameTerms?: boolean;
  };
}

export interface UserJourneyFormDataMap {
  'enter-user-details'?: {
    applicantForename: string;
    applicantSurname: string;
  };
  'enter-address'?: {
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    town: string;
    county: string;
    postcode: string;
    country: string;
  };
}

export interface UserJourneyCaseData {
  applicantForename?: string;
  applicantSurname?: string;
  userPcqId?: string;
  userPcqIdSet?: YesNoValue;
  propertyAddress?: {
    AddressLine1: string;
    AddressLine2: string;
    AddressLine3: string;
    PostTown: string;
    County: string;
    PostCode: string;
    Country: string;
  };
  ordersDemoPayload?: OrdersDemoPayload;
}
