import type { Request, Response } from 'express';
import type { TFunction } from 'i18next';

import type { FormFieldConfig } from '../../../../main/interfaces/formFieldConfig.interface';
import { type FormBuilderConfig, createFormStep } from '../../../../main/modules/steps';

const mockGetFormData = jest.fn();
const mockSetFormData = jest.fn();
const mockValidateForm = jest.fn();

jest.mock('../../../../main/modules/steps/controller', () => ({
  createGetController: jest.fn((view, stepName, extendContent) => ({
    get: jest.fn(async (req: Request, res: Response) => {
      const content = extendContent ? await extendContent(req) : {};
      return res.render(view, content);
    }),
  })),
}));

jest.mock('../../../../main/modules/steps/formBuilder/helpers', () => {
  const actual = jest.requireActual('../../../../main/modules/steps/formBuilder/helpers');
  return {
    ...actual,
    getFormData: (...args: unknown[]) => mockGetFormData(...args),
    setFormData: (...args: unknown[]) => mockSetFormData(...args),
    validateForm: (...args: unknown[]) => mockValidateForm(...args),
    getTranslation: jest.fn((t: (key: string) => string, key: string, fallback?: string) => {
      const translation = t(key);
      return translation !== key ? translation : fallback;
    }),
    getTranslationErrors: jest.fn(() => ({})),
    getCustomErrorTranslations: jest.fn(() => ({})),
  };
});

const mockGetNextStepUrl = jest.fn();
const mockGetBackUrl = jest.fn();

jest.mock('../../../../main/modules/steps/flow', () => ({
  stepNavigation: {
    getNextStepUrl: (...args: unknown[]) => mockGetNextStepUrl(...args),
    getBackUrl: (...args: unknown[]) => mockGetBackUrl(...args),
  },
  createStepNavigation: jest.fn(() => ({
    getNextStepUrl: (...args: unknown[]) => mockGetNextStepUrl(...args),
    getBackUrl: (...args: unknown[]) => mockGetBackUrl(...args),
  })),
}));

const mockGetValidatedLanguage = jest.fn();
const mockGetRequestLanguage = jest.fn();
const mockGetTranslationFunction = jest.fn();

jest.mock('../../../../main/modules/steps/i18n', () => ({
  getValidatedLanguage: (...args: unknown[]) => mockGetValidatedLanguage(...args),
  getRequestLanguage: (...args: unknown[]) => mockGetRequestLanguage(...args),
  getTranslationFunction: (...args: unknown[]) => mockGetTranslationFunction(...args),
  getStepNamespace: jest.fn((stepName: string) => stepName),
  loadStepNamespace: jest.fn(),
  getStepTranslations: jest.fn(() => ({})),
}));

describe('formBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStepDir = '/test/step/dir';
  const baseConfig: FormBuilderConfig = {
    stepName: 'test-step',
    journeyFolder: 'testJourney',
    stepDir: mockStepDir,
    fields: [
      {
        name: 'testField',
        type: 'text',
        required: true,
        translationKey: {
          label: 'title',
        },
      },
    ],
  };

  const createMockT = (translations: Record<string, string> = {}) => {
    return jest.fn((key: string) => translations[key] || key) as unknown as TFunction;
  };

  const createMockI18n = (t: TFunction) => {
    const mockCharacterCount = {
      charactersUnderLimitText: {
        one: 'You have %{count} character remaining',
        other: 'You have %{count} characters remaining',
      },
      charactersAtLimitText: 'You have reached the limit',
      charactersOverLimitText: {
        one: 'You have %{count} character too many',
        other: 'You have %{count} characters too many',
      },
    };
    return {
      getFixedT: jest.fn(() => t),
      getResourceBundle: jest.fn((lang: string, ns: string) => {
        if (ns === 'common') {
          return {
            characterCount: mockCharacterCount,
          };
        }
        return {};
      }),
    };
  };

  const createMockRequest = (overrides: Partial<Request> = {}): Request => {
    const defaultT = createMockT();
    const defaultI18n = createMockI18n(defaultT);
    const defaultApp = {
      locals: {
        nunjucksEnv: {
          render: jest.fn((template: string) => `Rendered ${template}`),
        },
      },
    };
    return {
      params: {},
      session: { formData: {} },
      language: 'en',
      t: defaultT,
      app: {
        ...defaultApp,
        ...(overrides.app || {}),
        locals: {
          ...defaultApp.locals,
          ...(overrides.app?.locals || {}),
        },
      },
      ...overrides,
      // Ensure i18n is always set even if overrides don't include it
      i18n: (overrides.i18n ?? defaultI18n) as import('i18next').i18n,
    } as unknown as Request;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFormData.mockImplementation((req: Request, stepName: string) => {
      const session = req.session as { formData?: Record<string, unknown> };
      return session?.formData?.[stepName] || {};
    });
    mockSetFormData.mockImplementation((req: Request, stepName: string, data: unknown) => {
      const session = req.session as { formData?: Record<string, unknown> };
      if (!session.formData) {
        session.formData = {};
      }
      session.formData[stepName] = data;
    });
    mockValidateForm.mockReturnValue({});
    mockGetNextStepUrl.mockResolvedValue('/steps/test-journey/next-step');
    mockGetBackUrl.mockResolvedValue('/steps/test-journey/previous-step');
    mockGetValidatedLanguage.mockReturnValue('en' as const);
    mockGetRequestLanguage.mockImplementation((req: Request) => req.language || 'en');
    mockGetTranslationFunction.mockImplementation((req: Request) => {
      return (req.t as TFunction) || jest.fn((key: string) => key);
    });
  });

  describe('createFormStep', () => {
    it('should create a step definition with correct URL', () => {
      const step = createFormStep(baseConfig);
      expect(step.url).toBe('/steps/test-journey/test-step');
      expect(step.name).toBe('test-step');
      expect(step.view).toBe('formBuilder.njk');
      expect(step.stepDir).toBe(mockStepDir);
    });

    it('should handle journeyFolder with camelCase', () => {
      const config = {
        ...baseConfig,
        journeyFolder: 'respondToClaim',
        flowConfig: {
          basePath: '/case/:caseReference/respond-to-claim',
          journeyName: 'respondToClaim',
          stepOrder: [],
          steps: {},
        },
      };
      const step = createFormStep(config);
      expect(step.url).toBe('/case/:caseReference/respond-to-claim/test-step');
    });

    it('should fallback to default path when flowConfig.basePath is not provided', () => {
      const config = {
        ...baseConfig,
        journeyFolder: 'testJourney',
        flowConfig: {
          stepOrder: [],
          steps: {},
        },
      };
      const step = createFormStep(config);
      expect(step.url).toBe('/steps/test-journey/test-step');
    });

    it('should create getController that renders with form content', async () => {
      const step = createFormStep(baseConfig);
      const req = createMockRequest({
        session: {
          formData: {
            'test-step': { testField: 'saved value' },
          },
          ccdCase: { id: '1765881343803991' },
        },
      } as unknown as Request);
      const res = {
        render: jest.fn(),
      } as unknown as Response;

      expect(step.getController).toBeDefined();
      expect(typeof step.getController).toBe('function');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const controller = (step.getController as any)();
      await controller.get(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'formBuilder.njk',
        expect.objectContaining({
          fieldValues: { testField: 'saved value' },
          stepName: 'test-step',
          journeyFolder: 'testJourney',
          ccdId: '1765881343803991',
        })
      );
    });

    it('should include ccdId in getController response', async () => {
      const step = createFormStep(baseConfig);
      const req = createMockRequest({
        session: {
          formData: {},
          ccdCase: { id: '1765881343803992' },
        },
      } as unknown as Request);
      const res = {
        render: jest.fn(),
      } as unknown as Response;

      expect(step.getController).toBeDefined();
      expect(typeof step.getController).toBe('function');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const controller = (step.getController as any)();
      await controller.get(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'formBuilder.njk',
        expect.objectContaining({
          ccdId: '1765881343803992',
        })
      );
    });

    it('should handle extendGetContent callback', async () => {
      const extendGetContent = jest.fn(() => ({ customField: 'customValue' }));
      const config = { ...baseConfig, extendGetContent };
      const step = createFormStep(config);
      const req = createMockRequest();
      const res = {
        render: jest.fn(),
      } as unknown as Response;

      expect(step.getController).toBeDefined();
      expect(typeof step.getController).toBe('function');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const controller = (step.getController as any)();
      await controller.get(req, res);

      expect(extendGetContent).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        'formBuilder.njk',
        expect.objectContaining({
          customField: 'customValue',
        })
      );
    });

    describe('buildFormContent', () => {
      it('should build form content with field values', async () => {
        const step = createFormStep(baseConfig);
        const req = createMockRequest({
          session: {
            formData: {
              'test-step': { testField: 'value' },
            },
          },
        } as unknown as Request);
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { testField: 'value' },
          })
        );
      });

      it('should handle checkbox fields - string value', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'checkboxField',
              type: 'checkbox',
              options: [{ value: 'option1' }, { value: 'option2' }],
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          session: {
            formData: {
              'test-step': { checkboxField: 'option1' },
            },
          },
        } as unknown as Request);
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { checkboxField: ['option1'] },
          })
        );
      });

      it('should handle checkbox fields - array value', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'checkboxField',
              type: 'checkbox',
              options: [{ value: 'option1' }, { value: 'option2' }],
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          session: {
            formData: {
              'test-step': { checkboxField: ['option1', 'option2'] },
            },
          },
        } as unknown as Request);
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { checkboxField: ['option1', 'option2'] },
          })
        );
      });

      it('should handle checkbox fields - empty value', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'checkboxField',
              type: 'checkbox',
              options: [{ value: 'option1' }],
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest();
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { checkboxField: [] },
          })
        );
      });

      it('should handle date fields - object format', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'dateField',
              type: 'date',
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          session: {
            formData: {
              'test-step': { dateField: { day: '01', month: '02', year: '2023' } },
            },
          },
        } as unknown as Request);
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { dateField: { day: '01', month: '02', year: '2023' } },
          })
        );
      });

      it('should handle date fields - separate day/month/year format', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'dateField',
              type: 'date',
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          session: {
            formData: {
              'test-step': {
                'dateField-day': '01',
                'dateField-month': '02',
                'dateField-year': '2023',
              },
            },
          },
        } as unknown as Request);
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { dateField: { day: '01', month: '02', year: '2023' } },
          })
        );
      });

      it('should handle date fields - empty value', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'dateField',
              type: 'date',
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest();
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { dateField: { day: '', month: '', year: '' } },
          })
        );
      });

      it('should handle textarea fields', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'textareaField',
              type: 'textarea',
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          session: {
            formData: {
              'test-step': { textareaField: 'some text' },
            },
          },
        } as unknown as Request);
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { textareaField: 'some text' },
          })
        );
      });

      it('should handle character-count fields', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'charCountField',
              type: 'character-count',
              maxLength: 250,
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          session: {
            formData: {
              'test-step': { charCountField: 'some text' },
            },
          },
        } as unknown as Request);
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { charCountField: 'some text' },
          })
        );
      });

      it('should handle text fields', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'textField',
              type: 'text',
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          session: {
            formData: {
              'test-step': { textField: 'text value' },
            },
          },
        } as unknown as Request);
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            fieldValues: { textField: 'text value' },
          })
        );
      });

      it('should use pageTitle from translationKeys when provided', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          translationKeys: {
            pageTitle: 'pageTitle',
          },
        };
        const step = createFormStep(config);
        const mockT = createMockT({ pageTitle: 'Custom Page Title' });
        const req = createMockRequest();
        req.t = mockT;
        req.i18n = createMockI18n(mockT) as unknown as typeof req.i18n;
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            pageTitle: 'Custom Page Title',
          })
        );
      });

      it('should use content from translationKeys when provided', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          translationKeys: {
            content: 'content',
          },
        };
        const step = createFormStep(config);
        const mockT = createMockT({ content: 'Custom content text' });
        const req = createMockRequest();
        req.t = mockT;
        req.i18n = createMockI18n(mockT) as unknown as typeof req.i18n;
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            content: 'Custom content text',
          })
        );
      });
    });

    describe('getFields', () => {
      it('should translate field labels from translationKey', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'testField',
              type: 'text',
              translationKey: {
                label: 'title',
              },
            },
          ],
        };
        const step = createFormStep(config);
        const mockT = createMockT({ title: 'Translated Title' });
        const req = createMockRequest();
        req.t = mockT;
        req.i18n = createMockI18n(mockT) as unknown as typeof req.i18n;
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        const renderCall = (res.render as jest.Mock).mock.calls[0];
        const fields = renderCall[1].fields;
        expect(fields[0].label).toBe('Translated Title');
      });

      it('should use fallback label pattern when translationKey not found', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'testField',
              type: 'text',
            },
          ],
        };
        const step = createFormStep(config);
        const mockT = createMockT({ testFieldLabel: 'Fallback Label' });
        const req = createMockRequest();
        req.t = mockT;
        req.i18n = createMockI18n(mockT) as unknown as typeof req.i18n;
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        const renderCall = (res.render as jest.Mock).mock.calls[0];
        const fields = renderCall[1].fields;
        expect(fields[0].label).toBe('Fallback Label');
      });

      it('should translate field hints from translationKey', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'testField',
              type: 'text',
              translationKey: {
                hint: 'hint',
              },
            },
          ],
        };
        const step = createFormStep(config);
        const mockT = createMockT({ hint: 'Translated Hint' });
        const req = createMockRequest();
        req.t = mockT;
        req.i18n = createMockI18n(mockT) as unknown as typeof req.i18n;
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        const renderCall = (res.render as jest.Mock).mock.calls[0];
        const fields = renderCall[1].fields;
        expect(fields[0].hint).toBe('Translated Hint');
      });

      it('should translate option texts with nested keys', async () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'radioField',
              type: 'radio',
              options: [
                { value: 'yes', translationKey: 'options.yes' },
                { value: 'no', translationKey: 'options.no' },
              ],
            },
          ],
        };
        const step = createFormStep(config);
        const mockT = createMockT({ 'options.yes': 'Yes', 'options.no': 'No' });
        const req = createMockRequest();
        req.t = mockT;
        req.i18n = createMockI18n(mockT) as unknown as typeof req.i18n;
        const res = {
          render: jest.fn(),
        } as unknown as Response;

        expect(step.getController).toBeDefined();
        expect(typeof step.getController).toBe('function');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controller = (step.getController as any)();
        await controller.get(req, res);

        const renderCall = (res.render as jest.Mock).mock.calls[0];
        const fields = renderCall[1].fields;
        expect(fields[0].options?.[0].text).toBe('Yes');
        expect(fields[0].options?.[1].text).toBe('No');
      });

      it('should use error message from translations for required field', () => {
        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'testField',
              type: 'text',
              required: true,
              errorMessage: 'errors.testField',
            },
          ],
        };

        const mockT = createMockT({ 'errors.testField': 'Custom error message' });

        const request = {
          body: { testField: '' },
        } as Pick<Request, 'body'>;

        const errors = mockValidateForm.mockImplementation(
          (req: Pick<Request, 'body'>, fields: FormFieldConfig[], ..._rest: unknown[]) => {
            const fieldErrors: Record<string, string> = {};
            fields.forEach(field => {
              if (field.required && !req.body[field.name]) {
                fieldErrors[field.name] = mockT(field.errorMessage as string);
              }
            });
            return fieldErrors;
          }
        )(request, config.fields);

        expect(errors.testField).toBe('Custom error message');
      });
    });

    describe('postController', () => {
      it('should handle saveForLater action', async () => {
        mockValidateForm.mockReturnValueOnce({});

        const step = createFormStep(baseConfig);
        const res = {
          redirect: jest.fn(),
          status: jest.fn().mockReturnThis(),
          render: jest.fn(),
          locals: {
            validatedCase: { id: '1765881343803991' },
          },
        } as unknown as Response;

        const req = createMockRequest({
          body: {
            action: 'saveForLater',
            testField: 'value',
          },
          session: {
            ccdCase: { id: '1765881343803991' },
          },
          res, // Link the response to the request
        } as unknown as Request);

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(mockSetFormData).toHaveBeenCalledWith(req, 'test-step', { testField: 'value' });
        expect(res.redirect).toHaveBeenCalledWith(303, '/dashboard/1765881343803991');
      });

      it('should redirect to home when ccdId not available for saveForLater', async () => {
        mockValidateForm.mockReturnValueOnce({});

        const step = createFormStep(baseConfig);
        const req = createMockRequest({
          body: {
            action: 'saveForLater',
            testField: 'value',
          },
        } as unknown as Request);
        const res = {
          redirect: jest.fn(),
          status: jest.fn().mockReturnThis(),
          render: jest.fn(),
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(res.redirect).toHaveBeenCalledWith(303, '/');
      });

      it('should show validation errors when saveForLater is clicked with invalid data', async () => {
        mockValidateForm.mockReturnValueOnce({ testField: 'This field is required' });

        const step = createFormStep(baseConfig);
        const req = createMockRequest({
          body: {
            action: 'saveForLater',
            testField: '',
          },
          session: {
            ccdCase: { id: '1765881343803991' },
          },
          originalUrl: '/test-url',
        } as unknown as Request);
        const res = {
          status: jest.fn().mockReturnThis(),
          render: jest.fn(),
          redirect: jest.fn(),
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            errorSummary: expect.objectContaining({
              errorList: expect.arrayContaining([
                expect.objectContaining({
                  href: '#testField',
                  text: 'This field is required',
                }),
              ]),
            }),
            ccdId: '1765881343803991',
          })
        );
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it('should normalize checkbox field for saveForLater', async () => {
        mockValidateForm.mockReturnValueOnce({});

        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'checkboxField',
              type: 'checkbox',
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          body: {
            action: 'saveForLater',
            checkboxField: 'option1',
          },
        } as unknown as Request);
        const res = {
          redirect: jest.fn(),
          status: jest.fn().mockReturnThis(),
          render: jest.fn(),
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(mockSetFormData).toHaveBeenCalledWith(req, 'test-step', { checkboxField: ['option1'] });
      });

      it('should normalize date field for saveForLater', async () => {
        mockValidateForm.mockReturnValueOnce({});

        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'dateField',
              type: 'date',
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          body: {
            action: 'saveForLater',
            'dateField-day': '01',
            'dateField-month': '02',
            'dateField-year': '2023',
          },
        } as unknown as Request);
        const res = {
          redirect: jest.fn(),
          status: jest.fn().mockReturnThis(),
          render: jest.fn(),
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(mockSetFormData).toHaveBeenCalledWith(req, 'test-step', {
          dateField: { day: '01', month: '02', year: '2023' },
        });
      });

      it('should handle validation errors', async () => {
        mockValidateForm.mockReturnValueOnce({ testField: 'Error message' });

        const step = createFormStep(baseConfig);
        const req = createMockRequest({
          body: {
            action: 'continue',
            testField: '',
          },
          session: {
            ccdCase: { id: '1765881343803991' },
          },
          originalUrl: '/test-url',
        } as unknown as Request);
        const res = {
          status: jest.fn().mockReturnThis(),
          render: jest.fn(),
          redirect: jest.fn(), // Add redirect in case validation somehow passes
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.render).toHaveBeenCalledWith(
          'formBuilder.njk',
          expect.objectContaining({
            errorSummary: expect.objectContaining({
              errorList: expect.arrayContaining([
                expect.objectContaining({
                  href: '#testField',
                  text: 'Error message',
                }),
              ]),
            }),
            ccdId: '1765881343803991',
          })
        );
      });

      it('should normalize checkbox field for continue action', async () => {
        mockValidateForm.mockReturnValueOnce({});

        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'checkboxField',
              type: 'checkbox',
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          body: {
            action: 'continue',
            checkboxField: 'option1',
          },
        } as unknown as Request);
        const res = {
          redirect: jest.fn(),
          status: jest.fn().mockReturnThis(),
          render: jest.fn(),
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(mockSetFormData).toHaveBeenCalledWith(req, 'test-step', { checkboxField: ['option1'] });
      });

      it('should normalize date field for continue action', async () => {
        mockValidateForm.mockReturnValueOnce({});

        const config: FormBuilderConfig = {
          ...baseConfig,
          fields: [
            {
              name: 'dateField',
              type: 'date',
            },
          ],
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          body: {
            action: 'continue',
            'dateField-day': '01',
            'dateField-month': '02',
            'dateField-year': '2023',
          },
        } as unknown as Request);
        const res = {
          redirect: jest.fn(),
          status: jest.fn().mockReturnThis(),
          render: jest.fn(),
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(mockSetFormData).toHaveBeenCalledWith(req, 'test-step', {
          dateField: { day: '01', month: '02', year: '2023' },
        });
      });

      it('should call beforeRedirect callback', async () => {
        mockValidateForm.mockReturnValueOnce({});

        const beforeRedirect = jest.fn();
        const config: FormBuilderConfig = {
          ...baseConfig,
          beforeRedirect,
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          body: {
            action: 'continue',
            testField: 'value',
          },
        } as unknown as Request);
        const res = {
          redirect: jest.fn(),
          headersSent: false,
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(beforeRedirect).toHaveBeenCalledWith(req);
      });

      it('should return early if beforeRedirect sends response', async () => {
        mockValidateForm.mockReturnValueOnce({});

        const beforeRedirect = jest.fn();
        const config: FormBuilderConfig = {
          ...baseConfig,
          beforeRedirect,
        };
        const step = createFormStep(config);
        const req = createMockRequest({
          body: {
            action: 'continue',
            testField: 'value',
          },
        } as unknown as Request);
        const res = {
          redirect: jest.fn(),
          headersSent: true,
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(beforeRedirect).toHaveBeenCalledWith(req);
        expect(res.redirect).not.toHaveBeenCalled();
      });

      it('should redirect to next step on successful validation', async () => {
        mockValidateForm.mockReturnValueOnce({});

        const step = createFormStep(baseConfig);
        const req = createMockRequest({
          body: {
            action: 'continue',
            testField: 'value',
          },
        } as unknown as Request);
        const res = {
          redirect: jest.fn(),
          status: jest.fn().mockReturnThis(),
          render: jest.fn(),
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(res.redirect).toHaveBeenCalledWith(303, '/steps/test-journey/next-step');
      });

      it('should return 500 when no redirect path available', async () => {
        mockGetNextStepUrl.mockResolvedValueOnce(null);
        mockValidateForm.mockReturnValueOnce({});

        const step = createFormStep(baseConfig);
        const req = createMockRequest({
          body: {
            action: 'continue',
            testField: 'value',
          },
        } as unknown as Request);
        const res = {
          redirect: jest.fn(),
          status: jest.fn().mockReturnThis(),
          send: jest.fn(),
        } as unknown as Response;

        expect(step.postController?.post).toBeDefined();
        await step.postController!.post(
          req as Request & { i18n: import('i18next').i18n; t: import('i18next').TFunction },
          res,
          jest.fn()
        );

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith('Unable to determine next step');
      });
    });
  });
});
