import type { Request } from 'express';
import { TFunction } from 'i18next';

import { buildSummaryListRows } from '../../../../../main/steps/make-an-application/check-your-answers/summaryListRowFactory';

const mockVisibleFormDataView = createMockVisibleFormDataView();
jest.mock('../../../../../main/steps/make-an-application/check-your-answers/visibleFormDataView', () => {
  return jest.fn().mockImplementation(() => {
    return mockVisibleFormDataView;
  });
});

const t = ((key: string) => {
  return `translation for: ${key}`;
}) as TFunction;

describe('buildSummaryListRows', () => {
  const req: Request = {} as Request;

  beforeEach(() => {
    resetMockVisibleFormDataView();
  });

  it('creates empty summary when no fields visible', () => {
    const summaryListRows = buildSummaryListRows(req, t);

    expect(summaryListRows).toHaveLength(0);
  });

  it('creates summary list row for application type field', () => {
    (mockVisibleFormDataView.getApplicationTypeField as jest.Mock).mockReturnValue({
      stepName: 'app-type',
      fieldValue: 'ADJOURN',
    });

    const summaryListRows = buildSummaryListRows(req, t);

    const expected = {
      actions: {
        items: [
          {
            href: './app-type',
            text: 'translation for: change',
            visuallyHiddenText: 'translation for: answers.typeOfApplication.changeHint',
          },
        ],
      },
      key: { text: 'translation for: answers.typeOfApplication.label' },
      value: { text: 'translation for: answers.typeOfApplication.options.ADJOURN' },
    };

    expect(summaryListRows).toEqual([expected]);
  });

  it('creates summary list row for hearing in next 14 days field', () => {
    (mockVisibleFormDataView.getHearingInNext14DaysField as jest.Mock).mockReturnValue({
      stepName: 'hearing-soon',
      fieldValue: 'yes',
    });

    const summaryListRows = buildSummaryListRows(req, t);

    const expected = {
      actions: {
        items: [
          {
            href: './hearing-soon',
            text: 'translation for: change',
            visuallyHiddenText: 'translation for: answers.hearingInNext14Days.changeHint',
          },
        ],
      },
      key: { text: 'translation for: answers.hearingInNext14Days.label' },
      value: { text: 'translation for: options.yes' },
    };

    expect(summaryListRows).toEqual([expected]);
  });

  it('creates summary list row for Help with Feeds needed field', () => {
    (mockVisibleFormDataView.getHelpWithFeesNeededField as jest.Mock).mockReturnValue({
      stepName: 'hwf-needed',
      fieldValue: 'yes',
    });

    const summaryListRows = buildSummaryListRows(req, t);

    const expected = {
      actions: {
        items: [
          {
            href: './hwf-needed',
            text: 'translation for: change',
            visuallyHiddenText: 'translation for: answers.helpWithFeesNeeded.changeHint',
          },
        ],
      },
      key: { text: 'translation for: answers.helpWithFeesNeeded.label' },
      value: { text: 'translation for: answers.helpWithFeesNeeded.options.yes' },
    };

    expect(summaryListRows).toEqual([expected]);
  });

  it('creates summary list row for already applied for HWF field', () => {
    (mockVisibleFormDataView.getAlreadyAppliedForHwfField as jest.Mock).mockReturnValue({
      stepName: 'hwf-applied-for',
      fieldValue: 'yes',
    });

    const summaryListRows = buildSummaryListRows(req, t);

    const expected = {
      actions: {
        items: [
          {
            href: './hwf-applied-for',
            text: 'translation for: change',
            visuallyHiddenText: 'translation for: answers.alreadyAppliedForHwf.changeHint',
          },
        ],
      },
      key: { text: 'translation for: answers.alreadyAppliedForHwf.label' },
      value: { text: 'translation for: options.yes' },
    };

    expect(summaryListRows).toEqual([expected]);
  });

  it('creates summary list row for HWF reference field', () => {
    (mockVisibleFormDataView.getHwfReferenceField as jest.Mock).mockReturnValue({
      stepName: 'hwf-applied-for',
      fieldValue: 'HWF-1234',
    });

    const summaryListRows = buildSummaryListRows(req, t);

    const expected = {
      actions: {
        items: [
          {
            href: './hwf-applied-for',
            text: 'translation for: change',
            visuallyHiddenText: 'translation for: answers.hwfReference.changeHint',
          },
        ],
      },
      key: { text: 'translation for: answers.hwfReference.label' },
      value: { text: 'HWF-1234' },
    };

    expect(summaryListRows).toEqual([expected]);
  });

  it('creates summary list row for other parties agreed field', () => {
    (mockVisibleFormDataView.getOtherPartiesAgreedField as jest.Mock).mockReturnValue({
      stepName: 'other-parties-agreed',
      fieldValue: 'yes',
    });

    const summaryListRows = buildSummaryListRows(req, t);

    const expected = {
      actions: {
        items: [
          {
            href: './other-parties-agreed',
            text: 'translation for: change',
            visuallyHiddenText: 'translation for: answers.otherPartiesAgreed.changeHint',
          },
        ],
      },
      key: { text: 'translation for: answers.otherPartiesAgreed.label' },
      value: { text: 'translation for: options.yes' },
    };

    expect(summaryListRows).toEqual([expected]);
  });

  it('creates summary list row for any reason not to share field', () => {
    (mockVisibleFormDataView.getAnyReasonsNotToShareField as jest.Mock).mockReturnValue({
      stepName: 'reasons-not-to-share',
      fieldValue: 'yes',
    });

    const summaryListRows = buildSummaryListRows(req, t);

    const expected = {
      actions: {
        items: [
          {
            href: './reasons-not-to-share',
            text: 'translation for: change',
            visuallyHiddenText: 'translation for: answers.anyReasonNotToShare.changeHint',
          },
        ],
      },
      key: { text: 'translation for: answers.anyReasonNotToShare.label' },
      value: { text: 'translation for: options.yes' },
    };

    expect(summaryListRows).toEqual([expected]);
  });

  it('creates summary list row for reason for not sharing field', () => {
    (mockVisibleFormDataView.getReasonForNotSharingField as jest.Mock).mockReturnValue({
      stepName: 'hwf-applied-for',
      fieldValue: 'This is an example reason',
    });

    const summaryListRows = buildSummaryListRows(req, t);

    const expected = {
      actions: {
        items: [
          {
            href: './hwf-applied-for',
            text: 'translation for: change',
            visuallyHiddenText: 'translation for: answers.reasonForNotSharing.changeHint',
          },
        ],
      },
      key: { text: 'translation for: answers.reasonForNotSharing.label' },
      value: { text: 'This is an example reason' },
    };

    expect(summaryListRows).toEqual([expected]);
  });

  it('creates summary list row for reason for which language field', () => {
    (mockVisibleFormDataView.getWhichLanguageField as jest.Mock).mockReturnValue({
      stepName: 'which-language',
      fieldValue: 'WELSH',
    });

    const summaryListRows = buildSummaryListRows(req, t);

    const expected = {
      actions: {
        items: [
          {
            href: './which-language',
            text: 'translation for: change',
            visuallyHiddenText: 'translation for: answers.whichLanguage.changeHint',
          },
        ],
      },
      key: { text: 'translation for: answers.whichLanguage.label' },
      value: { text: 'translation for: answers.whichLanguage.options.WELSH' },
    };

    expect(summaryListRows).toEqual([expected]);
  });
});

function createMockVisibleFormDataView() {
  return {
    getApplicationTypeField: jest.fn(),
    getHearingInNext14DaysField: jest.fn(),
    getHelpWithFeesNeededField: jest.fn(),
    getAlreadyAppliedForHwfField: jest.fn(),
    getHwfReferenceField: jest.fn(),
    getOtherPartiesAgreedField: jest.fn(),
    getAnyReasonsNotToShareField: jest.fn(),
    getReasonForNotSharingField: jest.fn(),
    getWhichLanguageField: jest.fn(),
  };
}

function resetMockVisibleFormDataView() {
  (mockVisibleFormDataView.getApplicationTypeField as jest.Mock).mockReset();
  (mockVisibleFormDataView.getHearingInNext14DaysField as jest.Mock).mockReset();
  (mockVisibleFormDataView.getHelpWithFeesNeededField as jest.Mock).mockReset();
  (mockVisibleFormDataView.getAlreadyAppliedForHwfField as jest.Mock).mockReset();
  (mockVisibleFormDataView.getHwfReferenceField as jest.Mock).mockReset();
  (mockVisibleFormDataView.getOtherPartiesAgreedField as jest.Mock).mockReset();
  (mockVisibleFormDataView.getAnyReasonsNotToShareField as jest.Mock).mockReset();
  (mockVisibleFormDataView.getReasonForNotSharingField as jest.Mock).mockReset();
  (mockVisibleFormDataView.getWhichLanguageField as jest.Mock).mockReset();
}
