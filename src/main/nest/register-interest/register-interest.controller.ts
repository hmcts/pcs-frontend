import {
  Controller,
  Get,
  Post,
  Render,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { OidcGuard } from '../guards/oidc.guard';
import { Step1Schema } from './dto/step1.dto';
import { Step2Schema } from './dto/step2.dto';
import { Step3Schema } from './dto/step3.dto';
import { I18nInterceptor } from './i18n.interceptor';
import { RegisterInterestSessionService } from './register-interest-session.service';
import { RegisterInterestService } from './register-interest.service';
import { ValidationService } from './validation.service';

@Controller('register-interest')
@UseGuards(OidcGuard)
@UseInterceptors(I18nInterceptor)
export class RegisterInterestController {
  constructor(
    private readonly registerInterestService: RegisterInterestService,
    private readonly sessionService: RegisterInterestSessionService,
    private readonly validationService: ValidationService
  ) {}

  // ============================================
  // STEP 1: Contact Preference
  // ============================================

  @Get('step1')
  @Render('register-interest/step1.njk')
  async getStep1(@Req() req: Request) {
    const stepData = this.sessionService.getStepData(req, 'step1');

    return {
      form: stepData || {},
      backLink: null,
      t: req.t,
    };
  }

  @Post('step1')
  async postStep1(@Req() req: Request, @Res() res: Response) {
    const result = Step1Schema.safeParse(req.body);

    if (!result.success) {
      const { errors, errorSummary } = this.validationService.formatZodErrors(result.error);
      const firstError = this.validationService.getFirstError(result.error);

      return res.render('register-interest/step1.njk', {
        form: req.body,
        error: firstError,
        errors,
        errorSummary,
        backLink: null,
        t: req.t,
      });
    }

    this.sessionService.saveStepData(req, 'step1', result.data);
    const nextStep = this.registerInterestService.getNextStep('step1', result.data);

    return res.redirect(nextStep);
  }

  // ============================================
  // STEP 2: Contact Details
  // ============================================

  @Get('step2')
  @Render('register-interest/step2.njk')
  async getStep2(@Req() req: Request) {
    const stepData = this.sessionService.getStepData(req, 'step2');
    const backLink = this.registerInterestService.getPreviousStep('step2');

    return {
      form: stepData || {},
      backLink,
      t: req.t,
    };
  }

  @Post('step2')
  async postStep2(@Req() req: Request, @Res() res: Response) {
    const result = Step2Schema.safeParse(req.body);

    if (!result.success) {
      const { errors, errorSummary } = this.validationService.formatZodErrors(result.error);
      const backLink = this.registerInterestService.getPreviousStep('step2');

      return res.render('register-interest/step2.njk', {
        form: req.body,
        errors,
        errorSummary,
        backLink,
        t: req.t,
      });
    }

    this.sessionService.saveStepData(req, 'step2', result.data);
    const nextStep = this.registerInterestService.getNextStep('step2', result.data);

    return res.redirect(nextStep);
  }

  // ============================================
  // STEP 3: Review & Confirm
  // ============================================

  @Get('step3')
  @Render('register-interest/step3.njk')
  async getStep3(@Req() req: Request) {
    const stepData = this.sessionService.getStepData(req, 'step3');
    const summary = this.sessionService.getSummaryData(req);
    const backLink = this.registerInterestService.getPreviousStep('step3');

    return {
      form: stepData || {},
      summary,
      backLink,
      t: req.t,
    };
  }

  @Post('step3')
  async postStep3(@Req() req: Request, @Res() res: Response) {
    const result = Step3Schema.safeParse(req.body);

    if (!result.success) {
      const { errors, errorSummary } = this.validationService.formatZodErrors(result.error);
      const firstError = this.validationService.getFirstError(result.error);
      const summary = this.sessionService.getSummaryData(req);
      const backLink = this.registerInterestService.getPreviousStep('step3');

      return res.render('register-interest/step3.njk', {
        form: req.body,
        error: firstError,
        errors,
        errorSummary,
        summary,
        backLink,
        t: req.t,
      });
    }

    this.sessionService.saveStepData(req, 'step3', result.data);
    const nextStep = this.registerInterestService.getNextStep('step3', result.data);

    return res.redirect(nextStep);
  }

  // ============================================
  // CONFIRMATION PAGE
  // ============================================

  @Get('confirmation')
  @Render('register-interest/confirmation.njk')
  async getConfirmation(@Req() req: Request) {
    const sessionData = this.sessionService.getSessionData(req);

    return {
      data: {
        step1: sessionData.step1 || {},
        step2: sessionData.step2 || {},
        step3: sessionData.step3 || {},
      },
      t: req.t,
    };
  }
}