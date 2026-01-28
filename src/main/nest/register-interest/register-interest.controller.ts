import {
  Controller,
  Get,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { getTranslationFunction, loadStepNamespace } from '../../modules/steps/i18n';
import { OidcGuard } from '../guards/oidc.guard';
import { Step1Schema } from './dto/step1.dto';
import { Step2Schema } from './dto/step2.dto';
import { Step3Schema } from './dto/step3.dto';
import { RegisterInterestService } from './register-interest.service';

@Controller('register-interest')
@UseGuards(OidcGuard)
export class RegisterInterestController {
  constructor(private readonly registerInterestService: RegisterInterestService) {}

  // ============================================
  // STEP 1: Contact Preference
  // ============================================

  @Get('step1')
  @Render('register-interest/step1.njk')
  async getStep1(@Req() req: Request) {
    await loadStepNamespace(req, 'step1', 'registerInterest');
    const t = getTranslationFunction(req, 'step1', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;
    const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

    return {
      form: registerInterest.step1 || {},
      backLink: null,
      t,
    };
  }

  @Post('step1')
  async postStep1(@Req() req: Request, @Res() res: Response) {
    await loadStepNamespace(req, 'step1', 'registerInterest');
    const t = getTranslationFunction(req, 'step1', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;

    // Validate form data
    const result = Step1Schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const firstErrorField = Object.keys(errors)[0];
      const error = {
        field: firstErrorField,
        text: (errors as Record<string, string[]>)[firstErrorField]?.[0] || 'Validation error',
      };

      return res.render('register-interest/step1.njk', {
        form: req.body,
        error,
        errorSummary: {
          titleText: 'There is a problem',
          errorList: [{ text: error.text, href: `#${error.field}` }],
        },
        backLink: null,
        t,
      });
    }

    // Save to session
    if (!session.registerInterest) {
      session.registerInterest = {};
    }
    (session.registerInterest as Record<string, unknown>).step1 = result.data;

    // Navigate to next step
    const nextStep = this.registerInterestService.getNextStep('step1', result.data);
    return res.redirect(nextStep);
  }

  // ============================================
  // STEP 2: Contact Details
  // ============================================

  @Get('step2')
  @Render('register-interest/step2.njk')
  async getStep2(@Req() req: Request) {
    await loadStepNamespace(req, 'step2', 'registerInterest');
    const t = getTranslationFunction(req, 'step2', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;
    const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

    return {
      form: registerInterest.step2 || {},
      backLink: this.registerInterestService.getPreviousStep('step2'),
      t,
    };
  }

  @Post('step2')
  async postStep2(@Req() req: Request, @Res() res: Response) {
    await loadStepNamespace(req, 'step2', 'registerInterest');
    const t = getTranslationFunction(req, 'step2', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;

    // Validate form data
    const result = Step2Schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const errorList = Object.entries(errors).map(([field, messages]) => ({
        text: messages?.[0] || 'Validation error',
        href: `#${field}`,
      }));

      return res.render('register-interest/step2.njk', {
        form: req.body,
        errors: Object.fromEntries(
          Object.entries(errors).map(([field, messages]) => [
            field,
            { text: messages?.[0] },
          ])
        ),
        errorSummary: {
          titleText: 'There is a problem',
          errorList,
        },
        backLink: this.registerInterestService.getPreviousStep('step2'),
        t,
      });
    }

    // Save to session
    if (!session.registerInterest) {
      session.registerInterest = {};
    }
    (session.registerInterest as Record<string, unknown>).step2 = result.data;

    // Navigate to next step
    const nextStep = this.registerInterestService.getNextStep('step2', result.data);
    return res.redirect(nextStep);
  }

  // ============================================
  // STEP 3: Confirmation
  // ============================================

  @Get('step3')
  @Render('register-interest/step3.njk')
  async getStep3(@Req() req: Request) {
    await loadStepNamespace(req, 'step3', 'registerInterest');
    const t = getTranslationFunction(req, 'step3', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;
    const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

    return {
      form: registerInterest.step3 || {},
      summary: {
        step1: registerInterest.step1 || {},
        step2: registerInterest.step2 || {},
      },
      backLink: this.registerInterestService.getPreviousStep('step3'),
      t,
    };
  }

  @Post('step3')
  async postStep3(@Req() req: Request, @Res() res: Response) {
    await loadStepNamespace(req, 'step3', 'registerInterest');
    const t = getTranslationFunction(req, 'step3', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;

    // Validate form data
    const result = Step3Schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const firstErrorField = Object.keys(errors)[0];
      const error = {
        field: firstErrorField,
        text: (errors as Record<string, string[]>)[firstErrorField]?.[0] || 'Validation error',
      };

      const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

      return res.render('register-interest/step3.njk', {
        form: req.body,
        error,
        errorSummary: {
          titleText: 'There is a problem',
          errorList: [{ text: error.text, href: `#${error.field}` }],
        },
        summary: {
          step1: registerInterest.step1 || {},
          step2: registerInterest.step2 || {},
        },
        backLink: this.registerInterestService.getPreviousStep('step3'),
        t,
      });
    }

    // Save to session
    if (!session.registerInterest) {
      session.registerInterest = {};
    }
    (session.registerInterest as Record<string, unknown>).step3 = result.data;

    // Navigate to confirmation
    const nextStep = this.registerInterestService.getNextStep('step3', result.data);
    return res.redirect(nextStep);
  }

  // ============================================
  // CONFIRMATION PAGE
  // ============================================

  @Get('confirmation')
  @Render('register-interest/confirmation.njk')
  async getConfirmation(@Req() req: Request) {
    await loadStepNamespace(req, 'confirmation', 'registerInterest');
    const t = getTranslationFunction(req, 'confirmation', ['common']);
    req.t = t;

    const session = req.session as unknown as Record<string, unknown>;
    const registerInterest = (session.registerInterest as Record<string, unknown>) || {};

    return {
      data: {
        step1: registerInterest.step1 || {},
        step2: registerInterest.step2 || {},
        step3: registerInterest.step3 || {},
      },
      t,
    };
  }
}