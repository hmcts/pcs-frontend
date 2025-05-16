import { validateForm } from 'app/controller/validation';
import type { FormFieldConfig } from '../../../../main/interfaces/formFieldConfig.interface';

describe('validateForm', () => {
  it('should return error for missing required radio field', () => {
    const fields: FormFieldConfig[] = [
      { name: 'answer', type: 'radio', required: true, errorMessage: 'Please choose an option' }
    ];

    const req = { body: {} } as any;
    const errors = validateForm(req, fields);

    expect(errors.answer).toBe('Please choose an option');
  });

  it('should return error for empty checkbox', () => {
    const fields: FormFieldConfig[] = [
      { name: 'choices', type: 'checkbox', required: true, errorMessage: 'Please select at least one' }
    ];

    const req = { body: { choices: [] } } as any;
    const errors = validateForm(req, fields);

    expect(errors.choices).toBe('Please select at least one');
  });

  it('should return no error if required fields are filled', () => {
    const fields: FormFieldConfig[] = [
      { name: 'answer', type: 'radio', required: true },
      { name: 'choices', type: 'checkbox', required: true }
    ];

    const req = {
      body: {
        answer: 'Yes',
        choices: ['option1']
      }
    } as any;

    const errors = validateForm(req, fields);
    expect(errors).toEqual({});
  });
});
