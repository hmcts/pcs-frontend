import type { PossessionClaimResponse } from '../../../../../main/services/ccdCase.interface';
import { normaliseCounterClaim } from '../../../../../main/steps/respond-to-claim/normalise/normaliseCounterClaim';

describe('normaliseCounterClaim', () => {
  it('drops the entire counterClaim object when makeCounterClaim is NO', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'NO',
        counterClaim: {
          claimType: 'PAYMENT_OR_COMPENSATION',
          isClaimAmountKnown: 'YES',
          claimAmount: '50000',
          estimatedMaxClaimAmount: '100000',
        },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses).toEqual({ makeCounterClaim: 'NO' });
  });

  it('drops counterClaimDocuments and counterClaimWantToUploadFiles when makeCounterClaim is NO', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'NO',
        counterClaimWantToUploadFiles: 'YES',
        counterClaimDocuments: [
          {
            id: 'doc-1',
            value: {
              document: {
                document_url: 'http://cdam/documents/abc',
                document_filename: 'a.png',
                document_binary_url: 'http://cdam/documents/abc/binary',
              },
              contentType: 'image/png',
              sizeInBytes: 1,
            },
          },
        ],
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses).toEqual({ makeCounterClaim: 'NO' });
  });

  it('drops counterClaimDocuments when counterClaimWantToUploadFiles is NO', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'YES',
        counterClaimWantToUploadFiles: 'NO',
        counterClaimDocuments: [
          {
            id: 'doc-1',
            value: {
              document: {
                document_url: 'http://cdam/documents/abc',
                document_filename: 'a.png',
                document_binary_url: 'http://cdam/documents/abc/binary',
              },
              contentType: 'image/png',
              sizeInBytes: 1,
            },
          },
        ],
        counterClaim: { claimType: 'OTHER' },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses?.counterClaimDocuments).toBeUndefined();
    expect(response.defendantResponses?.counterClaimWantToUploadFiles).toBe('NO');
  });

  it('drops counterClaimDocuments when counterClaimWantToUploadFiles is undefined', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'YES',
        counterClaimDocuments: [
          {
            id: 'doc-1',
            value: {
              document: {
                document_url: 'http://cdam/documents/abc',
                document_filename: 'a.png',
                document_binary_url: 'http://cdam/documents/abc/binary',
              },
              contentType: 'image/png',
              sizeInBytes: 1,
            },
          },
        ],
        counterClaim: { claimType: 'OTHER' },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses?.counterClaimDocuments).toBeUndefined();
  });

  it('preserves counterClaimDocuments when counterClaimWantToUploadFiles is YES', () => {
    const docs = [
      {
        id: 'doc-1',
        value: {
          document: {
            document_url: 'http://cdam/documents/abc',
            document_filename: 'a.png',
            document_binary_url: 'http://cdam/documents/abc/binary',
          },
          contentType: 'image/png',
          sizeInBytes: 1,
        },
      },
    ];
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'YES',
        counterClaimWantToUploadFiles: 'YES',
        counterClaimDocuments: docs,
        counterClaim: { claimType: 'OTHER' },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses?.counterClaimDocuments).toEqual(docs);
  });

  it('drops the entire counterClaim object when makeCounterClaim is undefined', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        counterClaim: {
          claimType: 'SOMETHING_ELSE',
        },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses).toEqual({});
  });

  it('drops the amount fields when claimType is SOMETHING_ELSE (specific-sum step is skipped)', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'YES',
        counterClaim: {
          claimType: 'SOMETHING_ELSE',
          isClaimAmountKnown: 'YES',
          claimAmount: '50000',
          estimatedMaxClaimAmount: '100000',
        },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses?.counterClaim).toEqual({ claimType: 'SOMETHING_ELSE' });
  });

  it('drops estimatedMaxClaimAmount when isClaimAmountKnown is YES', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'YES',
        counterClaim: {
          claimType: 'PAYMENT_OR_COMPENSATION',
          isClaimAmountKnown: 'YES',
          claimAmount: '50000',
          estimatedMaxClaimAmount: '100000',
        },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses?.counterClaim).toEqual({
      claimType: 'PAYMENT_OR_COMPENSATION',
      isClaimAmountKnown: 'YES',
      claimAmount: '50000',
    });
  });

  it('drops claimAmount when isClaimAmountKnown is NO', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'YES',
        counterClaim: {
          claimType: 'BOTH',
          isClaimAmountKnown: 'NO',
          claimAmount: '50000',
          estimatedMaxClaimAmount: '100000',
        },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses?.counterClaim).toEqual({
      claimType: 'BOTH',
      isClaimAmountKnown: 'NO',
      estimatedMaxClaimAmount: '100000',
    });
  });

  it('keeps the full chain when YES + PAYMENT_OR_COMPENSATION + isClaimAmountKnown YES', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'YES',
        counterClaim: {
          claimType: 'PAYMENT_OR_COMPENSATION',
          isClaimAmountKnown: 'YES',
          claimAmount: '50000',
        },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses?.counterClaim).toEqual({
      claimType: 'PAYMENT_OR_COMPENSATION',
      isClaimAmountKnown: 'YES',
      claimAmount: '50000',
    });
  });

  it('does nothing when defendantResponses is undefined', () => {
    const response: PossessionClaimResponse = {};

    normaliseCounterClaim(response);

    expect(response).toEqual({});
  });

  it('does nothing when counterClaim is undefined and makeCounterClaim is YES', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: { makeCounterClaim: 'YES' },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses).toEqual({ makeCounterClaim: 'YES' });
  });

  // CCD echoes YesOrNo PascalCase since pcs-api PR #1678 — keep counterClaim alive when
  // makeCounterClaim comes back as "Yes" instead of "YES".
  it('treats PascalCase "Yes" on makeCounterClaim the same as "YES"', () => {
    const response = {
      defendantResponses: {
        // Cast simulates BE returning out-of-type casing — the static type is 'YES'/'NO'.
        makeCounterClaim: 'Yes' as 'YES',
        counterClaim: { claimType: 'OTHER' },
      },
    } as PossessionClaimResponse;

    normaliseCounterClaim(response);

    expect(response.defendantResponses?.counterClaim).toEqual({ claimType: 'OTHER' });
  });

  it('drops other-order fields when claimType is PAYMENT_OR_COMPENSATION (other-order step is skipped)', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        makeCounterClaim: 'YES',
        counterClaim: {
          claimType: 'PAYMENT_OR_COMPENSATION',
          isClaimAmountKnown: 'YES',
          claimAmount: '50000',
          otherOrderRequestDetails: 'Stale detail from when SOMETHING_ELSE was selected',
          otherOrderRequestFacts: 'Stale facts',
        },
      },
    };

    normaliseCounterClaim(response);

    expect(response.defendantResponses?.counterClaim).toEqual({
      claimType: 'PAYMENT_OR_COMPENSATION',
      isClaimAmountKnown: 'YES',
      claimAmount: '50000',
    });
  });

  describe('HWF fields when needHelpWithFees is not YES', () => {
    it('deletes appliedForHwf and hwfReferenceNumber when needHelpWithFees is NO', () => {
      const response: PossessionClaimResponse = {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'OTHER',
            needHelpWithFees: 'NO',
            appliedForHwf: 'NO',
            hwfReferenceNumber: 'HWF-123',
          },
        },
      };

      normaliseCounterClaim(response);

      expect(response.defendantResponses?.counterClaim).toEqual({
        claimType: 'OTHER',
        needHelpWithFees: 'NO',
      });
    });

    it('deletes appliedForHwf and hwfReferenceNumber when needHelpWithFees is undefined', () => {
      const response: PossessionClaimResponse = {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'OTHER',
            appliedForHwf: 'YES',
            hwfReferenceNumber: 'HWF-456',
          },
        },
      };

      normaliseCounterClaim(response);

      expect(response.defendantResponses?.counterClaim).toEqual({
        claimType: 'OTHER',
      });
    });

    it('preserves appliedForHwf and hwfReferenceNumber when needHelpWithFees is YES', () => {
      const response: PossessionClaimResponse = {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'OTHER',
            needHelpWithFees: 'YES',
            appliedForHwf: 'YES',
            hwfReferenceNumber: 'HWF-789',
          },
        },
      };

      normaliseCounterClaim(response);

      expect(response.defendantResponses?.counterClaim).toEqual({
        claimType: 'OTHER',
        needHelpWithFees: 'YES',
        appliedForHwf: 'YES',
        hwfReferenceNumber: 'HWF-789',
      });
    });
  });

  describe('counter-claim-against-whom and counter-claim-about become unreachable when needsHelp=YES + applied !== YES', () => {
    it('drops counterClaimAgainst, counterClaimFor and counterClaimReasons when applied is NO', () => {
      const response: PossessionClaimResponse = {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'OTHER',
            needHelpWithFees: 'YES',
            appliedForHwf: 'NO',
            counterClaimAgainst: [{ id: 'p1', value: { firstName: 'Jane', lastName: 'Doe' } }],
            counterClaimFor: 'Stale "for" answer from a previous walk-through',
            counterClaimReasons: 'Stale reasons',
          },
        },
      };

      normaliseCounterClaim(response);

      expect(response.defendantResponses?.counterClaim).toEqual({
        claimType: 'OTHER',
        needHelpWithFees: 'YES',
        appliedForHwf: 'NO',
      });
    });

    it('drops counterClaimAgainst, counterClaimFor and counterClaimReasons when appliedForHwf is undefined', () => {
      const response: PossessionClaimResponse = {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'OTHER',
            needHelpWithFees: 'YES',
            counterClaimAgainst: [{ id: 'p1', value: { firstName: 'Jane', lastName: 'Doe' } }],
            counterClaimFor: 'Stale',
            counterClaimReasons: 'Stale',
          },
        },
      };

      normaliseCounterClaim(response);

      expect(response.defendantResponses?.counterClaim).toEqual({
        claimType: 'OTHER',
        needHelpWithFees: 'YES',
      });
    });

    it('preserves counterClaimAgainst, counterClaimFor and counterClaimReasons when applied is YES', () => {
      const response: PossessionClaimResponse = {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'OTHER',
            needHelpWithFees: 'YES',
            appliedForHwf: 'YES',
            hwfReferenceNumber: 'HWF-123',
            counterClaimAgainst: [{ id: 'p1', value: { firstName: 'Jane', lastName: 'Doe' } }],
            counterClaimFor: 'Real for',
            counterClaimReasons: 'Real reasons',
          },
        },
      };

      normaliseCounterClaim(response);

      expect(response.defendantResponses?.counterClaim?.counterClaimAgainst).toBeDefined();
      expect(response.defendantResponses?.counterClaim?.counterClaimFor).toBe('Real for');
      expect(response.defendantResponses?.counterClaim?.counterClaimReasons).toBe('Real reasons');
    });

    it('preserves counterClaimAgainst, counterClaimFor and counterClaimReasons when needsHelp is NO', () => {
      const response: PossessionClaimResponse = {
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: {
            claimType: 'OTHER',
            needHelpWithFees: 'NO',
            counterClaimAgainst: [{ id: 'p1', value: { firstName: 'Jane', lastName: 'Doe' } }],
            counterClaimFor: 'Real for',
            counterClaimReasons: 'Real reasons',
          },
        },
      };

      normaliseCounterClaim(response);

      expect(response.defendantResponses?.counterClaim?.counterClaimAgainst).toBeDefined();
      expect(response.defendantResponses?.counterClaim?.counterClaimFor).toBe('Real for');
      expect(response.defendantResponses?.counterClaim?.counterClaimReasons).toBe('Real reasons');
    });
  });
});
