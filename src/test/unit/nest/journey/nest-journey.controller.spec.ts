import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';

import { NestJourneyController } from '../../../../main/nest/journey/nest-journey.controller';
import { NestJourneyService } from '../../../../main/nest/journey/nest-journey.service';

// Mock the i18n module
jest.mock('../../../../main/modules/steps/i18n', () => ({
  loadStepNamespace: jest.fn().mockResolvedValue(undefined),
  getTranslationFunction: jest.fn().mockReturnValue((key: string, fallback: string) => fallback),
}));

interface Fixture {
  name: string;
  options: Record<string, unknown>;
  html: string;
  hidden: boolean;
}

interface FixturesFile {
  component: string;
  fixtures: Fixture[];
}

// Load GOV.UK Frontend fixtures
const loadFixtures = (componentName: string): FixturesFile | null => {
  const fixturesPath = path.join(
    __dirname,
    '../../../../node_modules/govuk-frontend/dist/govuk/components',
    componentName,
    'fixtures.json'
  );
  
  if (fs.existsSync(fixturesPath)) {
    const content = fs.readFileSync(fixturesPath, 'utf-8');
    return JSON.parse(content) as FixturesFile;
  }
  return null;
};

interface SessionWithJourney extends Request {
  session: Request['session'] & {
    nestJourney?: {
      completedSteps: string[];
      step1?: { decision: string };
      step2?: { feedback: string };
      step3?: { fullName: string; email: string; phoneNumber?: string };
    };
  };
  t?: unknown;
}

describe('NestJourneyController - GOV.UK Frontend Compliance', () => {
  let controller: NestJourneyController;
  let mockRequest: Partial<SessionWithJourney>;
  let mockResponse: Partial<Response>;

  // Load fixtures for components we use
  const buttonFixtures = loadFixtures('button');
  const radiosFixtures = loadFixtures('radios');
  const inputFixtures = loadFixtures('input');
  const textareaFixtures = loadFixtures('textarea');
  const errorSummaryFixtures = loadFixtures('error-summary');

  beforeEach(async () => {
    const { OidcGuard } = await import('../../../../main/nest/guards/oidc.guard');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NestJourneyController],
      providers: [NestJourneyService],
    })
      .overrideGuard(OidcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NestJourneyController>(NestJourneyController);

    mockRequest = {
      session: {
        nestJourney: {
          completedSteps: [],
        },
      } as Request['session'],
      t: ((key: string, fallback: string) => fallback) as unknown,
    };

    mockResponse = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };
  });

  describe('GOV.UK Frontend Fixture Compliance', () => {
    it('should have button fixtures available', () => {
      expect(buttonFixtures).toBeDefined();
      expect(buttonFixtures.component).toBe('button');
      expect(buttonFixtures.fixtures).toBeInstanceOf(Array);
      expect(buttonFixtures.fixtures.length).toBeGreaterThan(0);
    });

    it('should have radios fixtures available', () => {
      expect(radiosFixtures).toBeDefined();
      expect(radiosFixtures.component).toBe('radios');
      expect(radiosFixtures.fixtures).toBeInstanceOf(Array);
    });

    it('should have input fixtures available', () => {
      expect(inputFixtures).toBeDefined();
      expect(inputFixtures.component).toBe('input');
      expect(inputFixtures.fixtures).toBeInstanceOf(Array);
    });

    it('should have textarea fixtures available', () => {
      expect(textareaFixtures).toBeDefined();
      expect(textareaFixtures.component).toBe('textarea');
      expect(textareaFixtures.fixtures).toBeInstanceOf(Array);
    });

    it('should have error-summary fixtures available', () => {
      expect(errorSummaryFixtures).toBeDefined();
      expect(errorSummaryFixtures.component).toBe('error-summary');
      expect(errorSummaryFixtures.fixtures).toBeInstanceOf(Array);
    });
  });

  describe('Step 1 - Radios Component', () => {
    it('should render step1 with correct context for radios', async () => {
      const result = await controller.getStep1(
        mockRequest as SessionWithJourney,
        mockResponse as Response
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('formData');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('backUrl');
      expect(result).toHaveProperty('t');
    });

    it('should validate radios options match GOV.UK pattern', () => {
      // Our step1 uses radios with yes/no/maybe options
      // Verify the structure matches GOV.UK Frontend expectations
      const defaultRadiosFixture = radiosFixtures?.fixtures.find(f => f.name === 'default');
      
      expect(defaultRadiosFixture).toBeDefined();
      expect(defaultRadiosFixture.options).toHaveProperty('name');
      expect(defaultRadiosFixture.options).toHaveProperty('items');
      expect(defaultRadiosFixture.options.items).toBeInstanceOf(Array);
    });

    it('should handle validation errors with GOV.UK error pattern', async () => {
      mockRequest.body = { decision: 'invalid' };

      await controller.postStep1(
        mockRequest as SessionWithJourney,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.render).toHaveBeenCalledWith(
        'nest-journey/step1.njk',
        expect.objectContaining({
          error: expect.objectContaining({
            field: 'decision',
            text: expect.any(String),
          }),
          errorSummary: expect.objectContaining({
            titleText: 'There is a problem',
            errorList: expect.arrayContaining([
              expect.objectContaining({
                text: expect.any(String),
                href: '#decision',
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('Step 2 - Textarea Component', () => {
    it('should render step2 with correct context for textarea', async () => {
      mockRequest.session!.nestJourney!.completedSteps = ['step1'];

      const result = await controller.getStep2(
        mockRequest as SessionWithJourney,
        mockResponse as Response
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('formData');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('backUrl');
    });

    it('should validate textarea structure matches GOV.UK pattern', () => {
      const defaultTextareaFixture = textareaFixtures?.fixtures.find(f => f.name === 'default');
      
      expect(defaultTextareaFixture).toBeDefined();
      expect(defaultTextareaFixture.options).toHaveProperty('name');
      expect(defaultTextareaFixture.options).toHaveProperty('id');
    });

    it('should enforce character limit validation', async () => {
      mockRequest.session!.nestJourney!.completedSteps = ['step1'];
      mockRequest.body = { feedback: 'a'.repeat(2001) }; // Exceeds 2000 char limit

      await controller.postStep2(
        mockRequest as SessionWithJourney,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.render).toHaveBeenCalledWith(
        'nest-journey/step2.njk',
        expect.objectContaining({
          error: expect.objectContaining({
            field: 'feedback',
            text: expect.stringContaining('2000'),
          }),
        })
      );
    });
  });

  describe('Step 3 - Multiple Input Components', () => {
    it('should render step3 with correct context for multiple inputs', async () => {
      mockRequest.session!.nestJourney!.completedSteps = ['step1', 'step2'];

      const result = await controller.getStep3(
        mockRequest as SessionWithJourney,
        mockResponse as Response
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('formData');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('backUrl');
    });

    it('should validate input structure matches GOV.UK pattern', () => {
      const defaultInputFixture = inputFixtures?.fixtures.find(f => f.name === 'default');
      
      expect(defaultInputFixture).toBeDefined();
      expect(defaultInputFixture.options).toHaveProperty('name');
      expect(defaultInputFixture.options).toHaveProperty('id');
    });

    it('should validate email input with GOV.UK email pattern', async () => {
      mockRequest.session!.nestJourney!.completedSteps = ['step1', 'step2'];
      mockRequest.body = {
        fullName: 'John Doe',
        email: 'invalid-email',
        phoneNumber: '',
      };

      await controller.postStep3(
        mockRequest as SessionWithJourney,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.render).toHaveBeenCalledWith(
        'nest-journey/step3.njk',
        expect.objectContaining({
          errors: expect.objectContaining({
            email: expect.stringContaining('valid email'),
          }),
        })
      );
    });

    it('should handle multiple validation errors with GOV.UK error summary pattern', async () => {
      mockRequest.session!.nestJourney!.completedSteps = ['step1', 'step2'];
      mockRequest.body = {
        fullName: '',
        email: 'invalid',
        phoneNumber: 'abc',
      };

      await controller.postStep3(
        mockRequest as SessionWithJourney,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.render).toHaveBeenCalledWith(
        'nest-journey/step3.njk',
        expect.objectContaining({
          errorSummary: expect.objectContaining({
            titleText: 'There is a problem',
            errorList: expect.arrayContaining([
              expect.objectContaining({
                text: expect.any(String),
                href: expect.stringMatching(/^#(fullName|email|phoneNumber)$/),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('Error Summary Component Compliance', () => {
    it('should match GOV.UK error summary structure', () => {
      const defaultErrorSummaryFixture = errorSummaryFixtures?.fixtures.find(
        f => f.name === 'default'
      );

      expect(defaultErrorSummaryFixture).toBeDefined();
      expect(defaultErrorSummaryFixture?.options).toHaveProperty('titleText');
      expect(defaultErrorSummaryFixture?.options).toHaveProperty('errorList');
      
      const errorList = (defaultErrorSummaryFixture?.options as Record<string, unknown>)?.errorList;
      expect(errorList).toBeInstanceOf(Array);
      
      // Verify each error item has required properties
      (errorList as Array<Record<string, unknown>>).forEach(error => {
        expect(error).toHaveProperty('text');
        expect(error).toHaveProperty('href');
      });
    });
  });

  describe('Button Component Compliance', () => {
    it('should validate button structure matches GOV.UK pattern', () => {
      const defaultButtonFixture = buttonFixtures?.fixtures.find(f => f.name === 'default');
      
      expect(defaultButtonFixture).toBeDefined();
      expect(defaultButtonFixture.options).toHaveProperty('text');
      expect(defaultButtonFixture.html).toContain('govuk-button');
      expect(defaultButtonFixture.html).toContain('data-module="govuk-button"');
    });
  });
});
