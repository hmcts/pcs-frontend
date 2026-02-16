import type { Environment } from 'nunjucks';

import type { FormFieldConfig } from '../../../../../main/interfaces/formFieldConfig.interface';
import { buildSubFieldsHTML } from '../../../../../main/modules/steps/formBuilder/subFieldsRenderer';

describe('subFieldsRenderer', () => {
  describe('buildSubFieldsHTML', () => {
    let mockNunjucksEnv: Environment;
    let renderSpy: jest.SpyInstance;

    beforeEach(() => {
      mockNunjucksEnv = {
        render: jest.fn().mockReturnValue('<rendered-template>'),
      } as unknown as Environment;
      renderSpy = jest.spyOn(mockNunjucksEnv, 'render');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return empty string when subFields is empty', () => {
      const result = buildSubFieldsHTML({}, mockNunjucksEnv);
      expect(result).toBe('');
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should return empty string when subFields is null', () => {
      const result = buildSubFieldsHTML(null as unknown as Record<string, FormFieldConfig>, mockNunjucksEnv);
      expect(result).toBe('');
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should return empty string when subFields is undefined', () => {
      const result = buildSubFieldsHTML(undefined as unknown as Record<string, FormFieldConfig>, mockNunjucksEnv);
      expect(result).toBe('');
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should skip subFields without component', () => {
      const subFields: Record<string, FormFieldConfig> = {
        field1: {
          name: 'field1',
          type: 'text',
          componentType: 'input',
        } as FormFieldConfig,
      };

      const result = buildSubFieldsHTML(subFields, mockNunjucksEnv);
      expect(result).toBe('');
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should skip subFields without componentType', () => {
      const subFields: Record<string, FormFieldConfig> = {
        field1: {
          name: 'field1',
          type: 'text',
          component: {},
        } as FormFieldConfig,
      };

      const result = buildSubFieldsHTML(subFields, mockNunjucksEnv);
      expect(result).toBe('');
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should filter out invalid subFields and render valid ones', () => {
      const subFields: Record<string, FormFieldConfig> = {
        validField: {
          name: 'validField',
          type: 'text',
          component: {
            id: 'validField',
            name: 'validField',
            label: { text: 'Valid Field' },
          },
          componentType: 'input',
        } as FormFieldConfig,
        invalidField1: {
          name: 'invalidField1',
          type: 'text',
          componentType: 'input',
        } as FormFieldConfig,
        invalidField2: {
          name: 'invalidField2',
          type: 'text',
          component: {},
        } as FormFieldConfig,
      };

      buildSubFieldsHTML(subFields, mockNunjucksEnv);

      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
        subFields: [subFields.validField],
      });
    });

    describe('input fields', () => {
      it('should render input field with component data', () => {
        const subFields: Record<string, FormFieldConfig> = {
          emailAddress: {
            name: 'emailAddress',
            type: 'text',
            component: {
              id: 'contactMethod.emailAddress',
              name: 'contactMethod.emailAddress',
              label: { text: 'Email address' },
              hint: { text: 'Enter your email' },
              value: 'test@example.com',
              classes: 'govuk-!-width-three-quarters',
              attributes: {
                autocomplete: 'email',
                'data-testid': 'email-input',
                maxlength: 100,
              },
            },
            componentType: 'input',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledTimes(1);
        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.emailAddress],
        });
      });

      it('should render input field with error message', () => {
        const subFields: Record<string, FormFieldConfig> = {
          emailAddress: {
            name: 'emailAddress',
            type: 'text',
            component: {
              id: 'emailAddress',
              name: 'emailAddress',
              label: { text: 'Email address' },
              errorMessage: { text: 'Enter a valid email address' },
              value: '',
            },
            componentType: 'input',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.emailAddress],
        });
      });

      it('should render input field with minimal properties', () => {
        const subFields: Record<string, FormFieldConfig> = {
          field1: {
            name: 'field1',
            type: 'text',
            component: {
              id: 'field1',
              name: 'field1',
              label: { text: 'Field 1' },
              value: 'test value',
            },
            componentType: 'input',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.field1],
        });
      });
    });

    describe('textarea fields', () => {
      it('should render textarea field with component data', () => {
        const subFields: Record<string, FormFieldConfig> = {
          otherDetails: {
            name: 'otherDetails',
            type: 'textarea',
            component: {
              id: 'otherDetails',
              name: 'otherDetails',
              label: { text: 'Other details' },
              hint: { text: 'Provide more information' },
              value: 'Some text',
              rows: 4,
              attributes: {
                maxlength: 500,
              },
            },
            componentType: 'textarea',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.otherDetails],
        });
      });

      it('should render textarea field with error message', () => {
        const subFields: Record<string, FormFieldConfig> = {
          field1: {
            name: 'field1',
            type: 'textarea',
            component: {
              id: 'field1',
              name: 'field1',
              label: { text: 'Field 1' },
              errorMessage: { text: 'This field is required' },
              value: '',
            },
            componentType: 'textarea',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.field1],
        });
      });
    });

    describe('character-count fields', () => {
      it('should render character-count field with component data', () => {
        const subFields: Record<string, FormFieldConfig> = {
          field1: {
            name: 'field1',
            type: 'character-count',
            component: {
              id: 'field1',
              name: 'field1',
              label: { text: 'Field 1' },
              value: 'Some text',
              rows: 5,
              maxlength: 250,
            },
            componentType: 'characterCount',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.field1],
        });
      });
    });

    describe('default case (unknown component type)', () => {
      it('should render unknown component types as input', () => {
        const subFields: Record<string, FormFieldConfig> = {
          field1: {
            name: 'field1',
            type: 'text',
            component: {
              id: 'field1',
              name: 'field1',
              label: { text: 'Field 1' },
              value: 'test',
            },
            componentType: 'radios' as unknown as 'input',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.field1],
        });
      });
    });

    describe('multiple subFields', () => {
      it('should render all valid subFields', () => {
        const subFields: Record<string, FormFieldConfig> = {
          emailAddress: {
            name: 'emailAddress',
            type: 'text',
            component: {
              id: 'emailAddress',
              name: 'emailAddress',
              label: { text: 'Email' },
              value: '',
            },
            componentType: 'input',
          } as FormFieldConfig,
          phoneNumber: {
            name: 'phoneNumber',
            type: 'text',
            component: {
              id: 'phoneNumber',
              name: 'phoneNumber',
              label: { text: 'Phone' },
              value: '',
            },
            componentType: 'input',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.emailAddress, subFields.phoneNumber],
        });
      });

      it('should filter out invalid subFields when rendering multiple', () => {
        const subFields: Record<string, FormFieldConfig> = {
          validField1: {
            name: 'validField1',
            type: 'text',
            component: {
              id: 'validField1',
              name: 'validField1',
              label: { text: 'Valid 1' },
            },
            componentType: 'input',
          } as FormFieldConfig,
          invalidField: {
            name: 'invalidField',
            type: 'text',
            componentType: 'input',
          } as FormFieldConfig,
          validField2: {
            name: 'validField2',
            type: 'textarea',
            component: {
              id: 'validField2',
              name: 'validField2',
              label: { text: 'Valid 2' },
            },
            componentType: 'textarea',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.validField1, subFields.validField2],
        });
      });
    });

    describe('error handling', () => {
      it('should return empty string when render throws an error', () => {
        const errorNunjucksEnv = {
          render: jest.fn().mockImplementation(() => {
            throw new Error('Template rendering failed');
          }),
        } as unknown as Environment;

        const subFields: Record<string, FormFieldConfig> = {
          field1: {
            name: 'field1',
            type: 'text',
            component: {
              id: 'field1',
              name: 'field1',
              label: { text: 'Field 1' },
            },
            componentType: 'input',
          } as FormFieldConfig,
        };

        const result = buildSubFieldsHTML(subFields, errorNunjucksEnv);
        expect(result).toBe('');
      });

      it('should handle render errors gracefully without throwing', () => {
        const errorNunjucksEnv = {
          render: jest.fn().mockImplementation(() => {
            throw new Error('Template rendering failed');
          }),
        } as unknown as Environment;

        const subFields: Record<string, FormFieldConfig> = {
          field1: {
            name: 'field1',
            type: 'text',
            component: {
              id: 'field1',
              name: 'field1',
              label: { text: 'Field 1' },
            },
            componentType: 'input',
          } as FormFieldConfig,
        };

        expect(() => buildSubFieldsHTML(subFields, errorNunjucksEnv)).not.toThrow();
      });
    });

    describe('edge cases', () => {
      it('should handle empty string values in component', () => {
        const subFields: Record<string, FormFieldConfig> = {
          field1: {
            name: 'field1',
            type: 'text',
            component: {
              id: 'field1',
              name: 'field1',
              label: { text: 'Field 1' },
              value: '',
            },
            componentType: 'input',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.field1],
        });
      });

      it('should handle missing component properties', () => {
        const subFields: Record<string, FormFieldConfig> = {
          field1: {
            name: 'field1',
            type: 'text',
            component: {
              id: 'field1',
              name: 'field1',
            } as Record<string, unknown>,
            componentType: 'input',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.field1],
        });
      });

      it('should handle nested field names correctly', () => {
        const subFields: Record<string, FormFieldConfig> = {
          emailAddress: {
            name: 'contactMethod.emailAddress',
            type: 'text',
            component: {
              id: 'contactMethod.emailAddress',
              name: 'contactMethod.emailAddress',
              label: { text: 'Email' },
              value: '',
            },
            componentType: 'input',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.emailAddress],
        });
      });

      it('should preserve order of subFields', () => {
        const subFields: Record<string, FormFieldConfig> = {
          field1: {
            name: 'field1',
            type: 'text',
            component: {
              id: 'field1',
              name: 'field1',
              label: { text: 'Field 1' },
            },
            componentType: 'input',
          } as FormFieldConfig,
          field2: {
            name: 'field2',
            type: 'textarea',
            component: {
              id: 'field2',
              name: 'field2',
              label: { text: 'Field 2' },
            },
            componentType: 'textarea',
          } as FormFieldConfig,
          field3: {
            name: 'field3',
            type: 'text',
            component: {
              id: 'field3',
              name: 'field3',
              label: { text: 'Field 3' },
            },
            componentType: 'input',
          } as FormFieldConfig,
        };

        buildSubFieldsHTML(subFields, mockNunjucksEnv);

        expect(renderSpy).toHaveBeenCalledWith('components/subFields.njk', {
          subFields: [subFields.field1, subFields.field2, subFields.field3],
        });
      });
    });
  });
});
