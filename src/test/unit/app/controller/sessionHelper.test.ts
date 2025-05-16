import { getFormData, setFormData } from 'app/controller/sessionHelper';
import { Request } from 'express';

describe('sessionHelper', () => {
  it('should return empty object if no formData is present', () => {
    const req = { session: {} } as any;
    expect(getFormData(req, 'step1')).toEqual({});
  });
  it('should retrieve form data for a given step', () => {
    const req = {
      session: {
        formData: {
          step1: { answer: 'Yes' }
        }
      }
    } as unknown as Request;

    expect(getFormData(req, 'step1')).toEqual({ answer: 'Yes' });
  });

  it('should set form data for a given step', () => {
    const req = {
      session: {
        formData: {}
      }
    } as unknown as Request;

    setFormData(req, 'step2', { answer: 'No' });

    expect(req.session.formData?.step2).toEqual({ answer: 'No' });
  });
});
