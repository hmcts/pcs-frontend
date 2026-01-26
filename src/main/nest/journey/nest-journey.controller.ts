import { Controller, Get, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';

import { getTranslationFunction, loadStepNamespace } from '../../modules/steps/i18n';
import { OidcGuard } from '../guards/oidc.guard';

import { Step1Schema } from './dto/step1.dto';
import { Step2Schema } from './dto/step2.dto';
import { Step3Schema } from './dto/step3.dto';
import { type JourneyData, type JourneyStep, NestJourneyService } from './nest-journey.service';

interface SessionWithJourney extends Request {
  session: Request['session'] & {
    nestJourney?: JourneyData;
  };
}

@Controller('nest-journey')
@UseGuards(OidcGuard)
export class NestJourneyController {
  constructor(private readonly journeyService: NestJourneyService) {}

  private getJourneyData(req: SessionWithJourney): JourneyData {
    if (!req.session.nestJourney) {
      req.session.nestJourney = {
        completedSteps: [],
      };
    }
    return req.session.nestJourney;
  }

  private checkStepAccess(req: SessionWithJourney, res: Response, step: JourneyStep): boolean {
    const journeyData = this.getJourneyData(req);
    if (!this.journeyService.canAccessStep(step, journeyData)) {
      const firstIncomplete = this.journeyService.getFirstIncompleteStep(journeyData);
      res.redirect(303, this.journeyService.getStepUrl(firstIncomplete));
      return false;
    }
    return true;
  }

  @Get('step1')
  @Render('nest-journey/step1.njk')
  async getStep1(@Req() req: SessionWithJourney, @Res() res: Response): Promise<Record<string, unknown> | void> {
    // Load translation namespace for this step
    await loadStepNamespace(req, 'step1', 'nestJourney');

    if (!this.checkStepAccess(req, res, 'step1')) {
      return;
    }

    const journeyData = this.getJourneyData(req);
    const t = getTranslationFunction(req, 'step1', ['common']);
    req.t = t;

    return {
      backUrl: '/dashboard',
      formData: journeyData.step1 || {},
      error: null,
      t,
    };
  }

  @Post('step1')
  async postStep1(@Req() req: SessionWithJourney, @Res() res: Response): Promise<void> {
    // Load translation namespace for this step
    await loadStepNamespace(req, 'step1', 'nestJourney');
    const t = getTranslationFunction(req, 'step1', ['common']);
    req.t = t;

    const journeyData = this.getJourneyData(req);
    const result = Step1Schema.safeParse(req.body);

    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || 'Select an option';
      res.status(400).render('nest-journey/step1.njk', {
        pageTitle: 'Error: Make a decision - Nest Journey',
        backUrl: '/dashboard',
        formData: req.body,
        error: {
          field: 'decision',
          text: errorMessage,
        },
        errorSummary: {
          titleText: 'There is a problem',
          errorList: [
            {
              text: errorMessage,
              href: '#decision',
            },
          ],
        },
      });
      return;
    }

    journeyData.step1 = result.data;
    this.journeyService.markStepComplete(journeyData, 'step1');

    const nextStep = this.journeyService.getNextStep('step1');
    res.redirect(303, this.journeyService.getStepUrl(nextStep!));
  }

  @Get('step2')
  @Render('nest-journey/step2.njk')
  async getStep2(@Req() req: SessionWithJourney, @Res() res: Response): Promise<Record<string, unknown> | void> {
    // Load translation namespace for this step
    await loadStepNamespace(req, 'step2', 'nestJourney');
    const t = getTranslationFunction(req, 'step2', ['common']);
    req.t = t;

    if (!this.checkStepAccess(req, res, 'step2')) {
      return;
    }

    const journeyData = this.getJourneyData(req);

    return {
      backUrl: this.journeyService.getBackUrl('step2'),
      formData: journeyData.step2 || {},
      error: null,
      t,
    };
  }

  @Post('step2')
  async postStep2(@Req() req: SessionWithJourney, @Res() res: Response): Promise<void> {
    // Load translation namespace for this step
    await loadStepNamespace(req, 'step2', 'nestJourney');
    const t = getTranslationFunction(req, 'step2', ['common']);
    req.t = t;

    const journeyData = this.getJourneyData(req);
    const result = Step2Schema.safeParse(req.body);

    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || 'Enter your feedback';
      res.status(400).render('nest-journey/step2.njk', {
        pageTitle: 'Error: Provide feedback - Nest Journey',
        backUrl: this.journeyService.getBackUrl('step2'),
        formData: req.body,
        error: {
          field: 'feedback',
          text: errorMessage,
        },
        errorSummary: {
          titleText: 'There is a problem',
          errorList: [
            {
              text: errorMessage,
              href: '#feedback',
            },
          ],
        },
      });
      return;
    }

    journeyData.step2 = result.data;
    this.journeyService.markStepComplete(journeyData, 'step2');

    const nextStep = this.journeyService.getNextStep('step2');
    res.redirect(303, this.journeyService.getStepUrl(nextStep!));
  }

  @Get('step3')
  @Render('nest-journey/step3.njk')
  async getStep3(@Req() req: SessionWithJourney, @Res() res: Response): Promise<Record<string, unknown> | void> {
    // Load translation namespace for this step
    await loadStepNamespace(req, 'step3', 'nestJourney');
    const t = getTranslationFunction(req, 'step3', ['common']);
    req.t = t;

    if (!this.checkStepAccess(req, res, 'step3')) {
      return;
    }

    const journeyData = this.getJourneyData(req);

    return {
      backUrl: this.journeyService.getBackUrl('step3'),
      formData: journeyData.step3 || {},
      errors: {},
      t,
    };
  }

  @Post('step3')
  async postStep3(@Req() req: SessionWithJourney, @Res() res: Response): Promise<void> {
    // Load translation namespace for this step
    await loadStepNamespace(req, 'step3', 'nestJourney');
    const t = getTranslationFunction(req, 'step3', ['common']);
    req.t = t;

    const journeyData = this.getJourneyData(req);
    const result = Step3Schema.safeParse(req.body);

    if (!result.success) {
      const errors: Record<string, string> = {};
      const errorList: { text: string; href: string }[] = [];

      for (const error of result.error.errors) {
        const field = error.path[0] as string;
        if (!errors[field]) {
          errors[field] = error.message;
          errorList.push({
            text: error.message,
            href: `#${field}`,
          });
        }
      }

      res.status(400).render('nest-journey/step3.njk', {
        pageTitle: 'Error: Your details - Nest Journey',
        backUrl: this.journeyService.getBackUrl('step3'),
        formData: req.body,
        errors,
        errorSummary: {
          titleText: 'There is a problem',
          errorList,
        },
      });
      return;
    }

    journeyData.step3 = result.data;
    this.journeyService.markStepComplete(journeyData, 'step3');

    const nextStep = this.journeyService.getNextStep('step3');
    res.redirect(303, this.journeyService.getStepUrl(nextStep!));
  }

  @Get('confirmation')
  @Render('nest-journey/confirmation.njk')
  async getConfirmation(@Req() req: SessionWithJourney, @Res() res: Response): Promise<Record<string, unknown> | void> {
    // Load translation namespace for this step
    await loadStepNamespace(req, 'confirmation', 'nestJourney');
    const t = getTranslationFunction(req, 'confirmation', ['common']);
    req.t = t;

    if (!this.checkStepAccess(req, res, 'confirmation')) {
      return;
    }

    const journeyData = this.getJourneyData(req);

    return {
      journeyData,
      referenceNumber: `NEST-${Date.now().toString(36).toUpperCase()}`,
      t,
    };
  }
}
