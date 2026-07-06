jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { getTranslationFunction } from '../../../../main/modules/steps';
import { step } from '../../../../main/steps/respond-to-claim/confirmation-of-notice-date-when-provided';

import type { CcdCaseData } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';

type ConfirmationOfNoticeDateWhenProvidedStep = {
  extendGetContent: (req: {
    res?: {
      locals?: {
        validatedCase?: CcdCaseModel;
      };
    };
  }) => Record<string, string | undefined>;
};

const makeValidatedCase = (data: CcdCaseData = {}) =>
  new CcdCaseModel({
    id: 'case-1',
    data,
  });

describe('confirmation-of-notice-date-when-provided step', () => {
  const testedStep = step as unknown as ConfirmationOfNoticeDateWhenProvidedStep;
  const tMock = jest.fn((key: string, options?: Record<string, unknown>) => {
    if (options?.returnObjects) {
      return key;
    }

    if (key.startsWith('methodOfService.')) {
      const suffix = key.replace('methodOfService.', '');
      const params = Object.entries(options ?? {})
        .map(([paramKey, value]) => `${paramKey}=${value}`)
        .join(',');
      return params ? `${suffix}[${params}]` : suffix;
    }

    return key;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getTranslationFunction as jest.Mock).mockReturnValue(tMock);
  });

  describe('extendGetContent', () => {
    it('sets noticeDocumentId and noticeDocumentFilename when a notice document is uploaded', () => {
      const content = testedStep.extendGetContent({
        res: {
          locals: {
            validatedCase: makeValidatedCase({
              claimantName: 'Test Claimant',
              notice_Documents: [
                {
                  id: 'doc-123',
                  value: {
                    document_filename: 'notice.pdf',
                    document_url: 'http://doc-store/notice',
                    document_binary_url: 'http://doc-store/notice/binary',
                  },
                },
              ],
            }),
          },
        },
      });

      expect(content.noticeDocumentId).toBe('doc-123');
      expect(content.noticeDocumentFilename).toBe('notice.pdf');
    });

    it('omits noticeDocumentId when no notice document is uploaded', () => {
      const content = testedStep.extendGetContent({
        res: {
          locals: {
            validatedCase: makeValidatedCase({
              claimantName: 'Test Claimant',
              notice_Documents: [],
            }),
          },
        },
      });

      expect(content.noticeDocumentId).toBeUndefined();
      expect(content.noticeDocumentFilename).toBeUndefined();
    });

    it.each([
      [
        'PERSONALLY_HANDED',
        { notice_ServiceMethod: 'PERSONALLY_HANDED', notice_PersonName: 'Jane Doe' },
        ['methodOfService.PERSONALLY_HANDED', { name: 'Jane Doe' }],
        'PERSONALLY_HANDED[name=Jane Doe]',
      ],
      [
        'EMAIL',
        { notice_ServiceMethod: 'EMAIL', notice_EmailAddress: 'jane@example.com' },
        ['methodOfService.EMAIL', { emailAddress: 'jane@example.com' }],
        'EMAIL[emailAddress=jane@example.com]',
      ],
      [
        'DELIVERED_PERMITTED_PLACE',
        { notice_ServiceMethod: 'DELIVERED_PERMITTED_PLACE', notice_DeliveredDate: '2024-01-15' },
        ['methodOfService.DELIVERED_PERMITTED_PLACE', { date: '15 January 2024' }],
        'DELIVERED_PERMITTED_PLACE[date=15 January 2024]',
      ],
      [
        'FIRST_CLASS_POST',
        { notice_ServiceMethod: 'FIRST_CLASS_POST' },
        ['methodOfService.FIRST_CLASS_POST'],
        'FIRST_CLASS_POST',
      ],
      [
        'OTHER_ELECTRONIC',
        {
          notice_ServiceMethod: 'OTHER_ELECTRONIC',
          notice_OtherElectronicExplanation: 'via secure portal',
        },
        ['methodOfService.OTHER_ELECTRONIC', { details: 'via secure portal' }],
        'OTHER_ELECTRONIC[details=via secure portal]',
      ],
      [
        'OTHER',
        { notice_ServiceMethod: 'OTHER', notice_OtherExplanation: 'handed to neighbour' },
        ['methodOfService.OTHER', { details: 'handed to neighbour' }],
        'OTHER[details=handed to neighbour]',
      ],
    ] as const)('returns noticeMethodText for %s', (_label, caseData, expectedTranslationCall, expectedText) => {
      const content = testedStep.extendGetContent({
        res: {
          locals: {
            validatedCase: makeValidatedCase(caseData),
          },
        },
      });

      expect(tMock).toHaveBeenCalledWith(...expectedTranslationCall);
      expect(content.noticeMethodText).toBe(expectedText);
    });

    it('omits noticeMethodText when service method is missing or unknown', () => {
      const missingMethodContent = testedStep.extendGetContent({
        res: {
          locals: {
            validatedCase: makeValidatedCase({}),
          },
        },
      });

      const unknownMethodContent = testedStep.extendGetContent({
        res: {
          locals: {
            validatedCase: makeValidatedCase({ notice_ServiceMethod: 'UNKNOWN_METHOD' }),
          },
        },
      });

      expect(missingMethodContent.noticeMethodText).toBeUndefined();
      expect(unknownMethodContent.noticeMethodText).toBeUndefined();
    });
  });
});
