import type { Request } from 'express';

import type { FormFieldConfig } from '../../../../main/interfaces/formFieldConfig.interface';
import { validateForm } from '../../../../main/modules/steps';

describe('validateForm', () => {
  it('should return error for missing required radio field', () => {
    const fields: FormFieldConfig[] = [
      { name: 'answer', type: 'radio', required: true, errorMessage: 'Please choose an option' },
    ];

    const req = { body: {}, session: {} } as Partial<Request>;
    // Pass empty translations object so field.errorMessage is used as fallback
    const errors = validateForm(req as Request, fields, {});

    expect(errors.answer).toBe('Please choose an option');
  });

  it('should return error for empty checkbox', () => {
    const fields: FormFieldConfig[] = [
      { name: 'choices', type: 'checkbox', required: true, errorMessage: 'Please select at least one' },
    ];

    const req = { body: { choices: [] }, session: {} } as Partial<Request>;
    // Pass empty translations object so field.errorMessage is used as fallback
    const errors = validateForm(req as Request, fields, {});

    expect(errors.choices).toBe('Please select at least one');
  });

  it('should return no error if required fields are filled', () => {
    const fields: FormFieldConfig[] = [
      { name: 'answer', type: 'radio', required: true },
      { name: 'choices', type: 'checkbox', required: true },
    ];

    const req = {
      body: {
        answer: 'Yes',
        choices: ['option1'],
      },
      session: {},
    } as Partial<Request>;

    const errors = validateForm(req as Request, fields);
    expect(errors).toEqual({});
  });
});
