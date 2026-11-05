export const claimantCreateGenAppApiData = () => {
  return {
    claimantCreateGenAppEventName: 'claimantMakeAnApplication',

    claimantCreateGenAppEventTokenApiEndPoint: (): string =>
      `/cases/${process.env.CASE_NUMBER}/event-triggers/claimantMakeAnApplication?ignore-warning=false`,

    claimantCreateGenAppPayload: {
      xui_genapp_StandardFee: '£126',
      xui_genapp_MaxFee: '£321',
      xui_genapp_ApplicationType: 'ADJOURN',
      xui_genapp_ClaimantGenAppType: 'ADJOURN',
      xui_genapp_Within14Days: 'YES',
      xui_genapp_OtherPartiesAgreed: 'YES',
      xui_genapp_WhatOrderWanted: 'test',
      xui_genapp_HasSupportingDocuments: 'NO',
      xui_genapp_LanguageUsed: 'ENGLISH',
      xui_genapp_SotCompletedBy: 'CLAIMANT',
      xui_genapp_AgreementClaimant: ['BELIEVE_TRUE'],
      xui_genapp_SotFullName: 'Test1',
      xui_genapp_SotPositionHeld: 'Manager',
    },

    claimantCreateGenAppApiEndPoint: (): string => `/cases/${process.env.CASE_NUMBER}/events`,
  };
};
