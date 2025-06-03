import { Request, Response } from 'express';

import { GetController } from '../../../../main/app/controller/GetController';
import {
  createGetController,
  createPostRedirectController,
  validateAndStoreForm,
} from '../../../../main/app/controller/controllerFactory';
import { getFormData, setFormData } from '../../../../main/app/controller/sessionHelper';
import { validateForm } from '../../../../main/app/controller/validation';
import type { FormFieldConfig } from '../../../../main/interfaces/formFieldConfig.interface';
import type { StepFormData } from '../../../../main/interfaces/stepFormData.interface';

jest.mock('../../../../main/app/controller/GetController');
jest.mock('../../../../main/app/controller/sessionHelper');
jest.mock('../../../../main/app/controller/validation');

const mockGetFormData = getFormData as jest.MockedFunction<typeof getFormData>;
const mockSetFormData = setFormData as jest.MockedFunction<typeof setFormData>;
const mockValidateForm = validateForm as jest.MockedFunction<typeof validateForm>;

describe('controllerFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGetController', () => {
    const mockContent = { title: 'Test Page', serviceName: 'Test Service' };
    const mockGetControllerConstructor = GetController as jest.MockedClass<typeof GetController>;

    beforeEach(() => {
      (mockGetFormData as jest.Mock).mockReturnValue(null);
    });

    it('should create a GetController with expected view path and content', () => {
      const controller = createGetController('steps/page1.njk', 'page1', mockContent);

      expect(controller).toBeInstanceOf(GetController);
      expect(mockGetControllerConstructor).toHaveBeenCalledWith('steps/page1.njk', expect.any(Function));
    });

    it('should merge content with form data from session when available', () => {
      const sessionFormData: StepFormData = { answer: 'sessionAnswer', choices: ['choice1'] };
      (mockGetFormData as jest.Mock).mockReturnValue(sessionFormData);

      createGetController('steps/page1.njk', 'page1', mockContent);

      // Get the content function that was passed to GetController
      const contentFunction = mockGetControllerConstructor.mock.calls[0][1];
      const req = { body: {} } as Request;

      const result = contentFunction(req);

      expect(mockGetFormData).toHaveBeenCalledWith(req, 'page1');
      expect(result).toEqual({
        ...mockContent,
        selected: 'sessionAnswer',
        answer: 'sessionAnswer',
        choices: ['choice1'],
        error: undefined,
      });
    });

    it('should prioritize post data over session data', () => {
      const sessionFormData: StepFormData = { answer: 'sessionAnswer' };
      const postData = { answer: 'postAnswer', error: 'Test error' };

      (mockGetFormData as jest.Mock).mockReturnValue(sessionFormData);

      createGetController('steps/page1.njk', 'page1', mockContent);

      const contentFunction = mockGetControllerConstructor.mock.calls[0][1];
      const req = { body: postData } as Request;

      const result = contentFunction(req);

      expect(result).toEqual({
        ...mockContent,
        selected: 'sessionAnswer',
        answer: 'postAnswer',
        choices: undefined,
        error: 'Test error',
      });
    });

    it('should handle choices from session data when answer is not available', () => {
      const sessionFormData: StepFormData = { choices: ['choice1', 'choice2'] };
      (mockGetFormData as jest.Mock).mockReturnValue(sessionFormData);

      createGetController('steps/page1.njk', 'page1', mockContent);

      const contentFunction = mockGetControllerConstructor.mock.calls[0][1];
      const req = { body: {} } as Request;

      const result = contentFunction(req);

      expect(result.selected).toEqual(['choice1', 'choice2']);
      expect(result.choices).toEqual(['choice1', 'choice2']);
    });

    it('should handle choices from post data when answer is not available', () => {
      const postData = { choices: ['postChoice1', 'postChoice2'] };
      (mockGetFormData as jest.Mock).mockReturnValue(null);

      createGetController('steps/page1.njk', 'page1', mockContent);

      const contentFunction = mockGetControllerConstructor.mock.calls[0][1];
      const req = { body: postData } as Request;

      const result = contentFunction(req);

      expect(result.selected).toEqual(['postChoice1', 'postChoice2']);
      expect(result.choices).toEqual(['postChoice1', 'postChoice2']);
    });

    it('should extend content when extendContent function is provided', () => {
      const extendContent = jest.fn().mockReturnValue({ additionalData: 'extra' });

      createGetController('steps/page1.njk', 'page1', mockContent, extendContent);

      const contentFunction = mockGetControllerConstructor.mock.calls[0][1];
      const req = { body: {} } as Request;

      const result = contentFunction(req);

      expect(extendContent).toHaveBeenCalledWith(req);
      expect(result).toEqual(
        expect.objectContaining({
          additionalData: 'extra',
        })
      );
    });

    it('should handle undefined req.body', () => {
      (mockGetFormData as jest.Mock).mockReturnValue(null);

      createGetController('steps/page1.njk', 'page1', mockContent);

      const contentFunction = mockGetControllerConstructor.mock.calls[0][1];
      const req = {} as Request;

      const result = contentFunction(req);

      expect(result).toEqual({
        ...mockContent,
        selected: undefined,
        answer: undefined,
        choices: undefined,
        error: undefined,
      });
    });

    it('should handle null form data from session', () => {
      (mockGetFormData as jest.Mock).mockReturnValue(null);

      createGetController('steps/page1.njk', 'page1', mockContent);

      const contentFunction = mockGetControllerConstructor.mock.calls[0][1];
      const req = { body: {} } as Request;

      const result = contentFunction(req);

      expect(result.answer).toBeUndefined();
      expect(result.choices).toBeUndefined();
    });
  });

  describe('createPostRedirectController', () => {
    it('should redirect to the next URL', () => {
      const nextUrl = '/next-page';
      const controller = createPostRedirectController(nextUrl);

      const req = {} as Request;
      const res = { redirect: jest.fn() } as unknown as Response;

      controller.post(req, res);
      expect(res.redirect).toHaveBeenCalledWith(nextUrl);
    });

    it('should ignore request parameter and only use nextUrl', () => {
      const nextUrl = '/static-url';
      const controller = createPostRedirectController(nextUrl);

      const req = { body: { someData: 'value' } } as Request;
      const res = { redirect: jest.fn() } as unknown as Response;

      controller.post(req, res);
      expect(res.redirect).toHaveBeenCalledWith(nextUrl);
    });
  });

  describe('validateAndStoreForm', () => {
    const stepName = 'page1';
    const fields: FormFieldConfig[] = [{ name: 'answer', type: 'radio', required: true }];
    const nextPage = '/steps/page2';

    beforeEach(() => {
      mockValidateForm.mockReturnValue({});
      mockSetFormData.mockImplementation(() => {});
    });

    it('should validate, store form data, and redirect with string nextPage', () => {
      const req = {
        body: { answer: 'Yes' },
        session: { formData: {} },
      } as unknown as Request;
      const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, fields, nextPage);
      controller.post(req, res);

      expect(mockValidateForm).toHaveBeenCalledWith(req, fields);
      expect(mockSetFormData).toHaveBeenCalledWith(req, stepName, req.body);
      expect(res.redirect).toHaveBeenCalledWith(nextPage);
    });

    it('should validate, store form data, and redirect with function nextPage', () => {
      const nextPageFunction = jest.fn().mockReturnValue('/dynamic-next-page');
      const req = {
        body: { answer: 'Yes' },
        session: { formData: {} },
      } as unknown as Request;
      const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, fields, nextPageFunction);
      controller.post(req, res);

      expect(nextPageFunction).toHaveBeenCalledWith(req.body);
      expect(res.redirect).toHaveBeenCalledWith('/dynamic-next-page');
    });

    it('should return error and re-render template if validation fails', () => {
      const validationErrors = { answer: 'This field is required' };
      mockValidateForm.mockReturnValue(validationErrors);

      const req = {
        body: { answer: '' },
        session: { formData: {} },
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, fields, nextPage);
      controller.post(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith(
        'steps/page1.njk',
        expect.objectContaining({
          error: 'This field is required',
          answer: '',
        })
      );
      expect(mockSetFormData).not.toHaveBeenCalled();
    });

    it('should merge content with request body and error when validation fails', () => {
      const validationErrors = { answer: 'This field is required' };
      mockValidateForm.mockReturnValue(validationErrors);

      const content = { title: 'Test Page', serviceName: 'Test Service' };
      const req = {
        body: { answer: '', otherField: 'value' },
        session: { formData: {} },
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, fields, nextPage, content);
      controller.post(req, res);

      expect(res.render).toHaveBeenCalledWith('steps/page1.njk', {
        title: 'Test Page',
        serviceName: 'Test Service',
        error: 'This field is required',
        answer: '',
        otherField: 'value',
      });
    });

    it('should handle checkbox fields by converting single values to arrays', () => {
      const checkboxFields: FormFieldConfig[] = [
        { name: 'checkboxField', type: 'checkbox', required: false },
        { name: 'regularField', type: 'text', required: false },
      ];

      const req = {
        body: {
          checkboxField: 'singleValue',
          regularField: 'textValue',
        },
        session: { formData: {} },
      } as unknown as Request;
      const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, checkboxFields, nextPage);
      controller.post(req, res);

      expect(req.body.checkboxField).toEqual(['singleValue']);
      expect(req.body.regularField).toBe('textValue');
      expect(mockSetFormData).toHaveBeenCalledWith(req, stepName, req.body);
    });

    it('should not modify checkbox fields that are already arrays', () => {
      const checkboxFields: FormFieldConfig[] = [{ name: 'checkboxField', type: 'checkbox', required: false }];

      const req = {
        body: {
          checkboxField: ['value1', 'value2'],
        },
        session: { formData: {} },
      } as unknown as Request;
      const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, checkboxFields, nextPage);
      controller.post(req, res);

      expect(req.body.checkboxField).toEqual(['value1', 'value2']);
      expect(mockSetFormData).toHaveBeenCalledWith(req, stepName, req.body);
    });

    it('should handle multiple validation errors and use the first one', () => {
      const validationErrors = {
        answer: 'This field is required',
        otherField: 'This field is also required',
      };
      mockValidateForm.mockReturnValue(validationErrors);

      const req = {
        body: { answer: '', otherField: '' },
        session: { formData: {} },
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, fields, nextPage);
      controller.post(req, res);

      expect(res.render).toHaveBeenCalledWith(
        'steps/page1.njk',
        expect.objectContaining({
          error: 'This field is required',
        })
      );
    });

    it('should handle undefined content parameter', () => {
      const req = {
        body: { answer: 'Yes' },
        session: { formData: {} },
      } as unknown as Request;
      const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), render: jest.fn() } as unknown as Response;

      const controller = validateAndStoreForm(stepName, fields, nextPage);
      controller.post(req, res);

      expect(mockSetFormData).toHaveBeenCalledWith(req, stepName, req.body);
      expect(res.redirect).toHaveBeenCalledWith(nextPage);
    });

    it('should not call setFormData when validation fails', () => {
      const validationErrors = { answer: 'This field is required' };
      mockValidateForm.mockReturnValue(validationErrors);

      const req = {
        body: { answer: '' },
        session: { formData: {} },
      } as unknown as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      const controller = validateAndStoreForm(stepName, fields, nextPage);
      controller.post(req, res);

      expect(mockSetFormData).not.toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });
});
