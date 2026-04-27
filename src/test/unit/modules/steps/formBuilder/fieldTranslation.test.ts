import type { TFunction } from 'i18next';
import type { Environment } from 'nunjucks';

import { translateFields } from '../../../../../main/modules/steps/formBuilder/fieldTranslation';

import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';

describe('translateFields', () => {
  let mockT: jest.Mock;
  let mockNunjucksEnv: Environment;

  beforeEach(() => {
    mockT = jest.fn((key: string) => key);
    mockNunjucksEnv = { render: jest.fn().mockReturnValue('') } as unknown as Environment;
  });

  const fields: FormFieldConfig[] = [
    {
      name: 'confirmTenancyDate',
      type: 'radio',
      options: [
        {
          value: 'no',
          subFields: {
            tenancyStartDate: {
              name: 'tenancyStartDate',
              type: 'date',
              required: true,
            },
          },
        },
      ],
    },
  ];

  function runTranslate(dataSource: Record<string, unknown>) {
    return translateFields(fields, mockT as unknown as TFunction, {}, {}, false, '', dataSource, mockNunjucksEnv);
  }

  function getDateInputItems(result: FormFieldConfig[]) {
    const subField = result[0].options?.[0]?.subFields?.['tenancyStartDate'] as FormFieldConfig;
    return (subField?.component as { items?: { value: string }[] })?.items ?? [];
  }

  it('prepopulates date subfield from submitted form values on error re-render', () => {
    const result = runTranslate({
      'confirmTenancyDate.tenancyStartDate-day': '15',
      'confirmTenancyDate.tenancyStartDate-month': '6',
      'confirmTenancyDate.tenancyStartDate-year': '2020',
    });

    const [day, month, year] = getDateInputItems(result);
    expect(day.value).toBe('15');
    expect(month.value).toBe('6');
    expect(year.value).toBe('2020');
  });

  it('prepopulates date subfield from saved draft data on page revisit', () => {
    const result = runTranslate({
      tenancyStartDate: { day: '10', month: '3', year: '2022' },
    });

    const [day, month, year] = getDateInputItems(result);
    expect(day.value).toBe('10');
    expect(month.value).toBe('3');
    expect(year.value).toBe('2022');
  });

  it('renders date subfield with empty values when no data is available', () => {
    const result = runTranslate({});

    const [day, month, year] = getDateInputItems(result);
    expect(day.value).toBe('');
    expect(month.value).toBe('');
    expect(year.value).toBe('');
  });

  it('translates option labels and hints for radio items', () => {
    mockT = jest.fn((key: string) => {
      const translations: Record<string, string> = {
        question: 'Have you had free legal advice?',
        'options.yes': 'Yes',
        'options.yesHint': 'This includes advice from a solicitor.',
      };
      return translations[key] || key;
    });

    const result = translateFields(
      [
        {
          name: 'hadLegalAdvice',
          type: 'radio',
          translationKey: {
            label: 'question',
          },
          options: [{ value: 'yes', translationKey: 'options.yes', hint: 'options.yesHint' }],
        },
      ],
      mockT as unknown as TFunction,
      {},
      {},
      false,
      '',
      {},
      mockNunjucksEnv
    );

    const items = result[0].component?.items as Record<string, unknown>[];
    expect(items).toEqual([
      {
        value: 'yes',
        text: 'Yes',
        hint: { text: 'This includes advice from a solicitor.' },
        checked: false,
      },
    ]);
  });
});
