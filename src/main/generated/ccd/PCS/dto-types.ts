/* tslint:disable */
/* eslint-disable */

export interface CreateClaimData {
    propertyAddress: AddressUK;
    legislativeCountry: LegislativeCountry;
    feeAmount: string;
    showCrossBorderPage: YesOrNo;
    showPropertyNotEligiblePage: YesOrNo;
    showPostcodeNotAssignedToCourt: YesOrNo;
    crossBorderCountriesList: DynamicStringList;
    crossBorderCountry1: string;
    crossBorderCountry2: string;
    postcodeNotAssignedView: string;
}

export interface SubmitDefendantResponseData {
    correspondenceAddress: AddressUK;
    submitDraftAnswers: YesOrNo;
}

export interface AddressUK extends Address {
}

export interface DynamicStringList {
    value: DynamicStringListElement;
    list_items: DynamicStringListElement[];
    valueCode: string;
}

export interface Address {
    AddressLine1: string;
    AddressLine2: string;
    AddressLine3: string;
    PostTown: string;
    County: string;
    PostCode: string;
    Country: string;
}

export interface DynamicStringListElement {
    code: string;
    label: string;
}

export type LegislativeCountry = "England" | "Northern Ireland" | "Scotland" | "Wales" | "Isle of Man" | "Channel Islands";

export type YesOrNo = "Yes" | "No";
