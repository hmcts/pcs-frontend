import { Controller, Get, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';

import { OidcGuard } from '../guards/oidc.guard';

import { PostcodeFinderSchema } from './dto/postcode-finder.dto';
import { RespondToClaimSessionService } from './respond-to-claim-session.service';
import { RespondToClaimService } from './respond-to-claim.service';
import { RespondToClaimValidationService } from './validation.service';

interface StepViewData {
  backUrl: string | null;
  t: unknown;
  postcode?: string;
  errors?: Record<string, { text: string }>;
  errorSummary?: { errorList: { text: string; href: string }[] };
}

@Controller('respond-to-claim')
@UseGuards(OidcGuard)
export class RespondToClaimController {
  constructor(
    private readonly respondToClaimService: RespondToClaimService,
    private readonly sessionService: RespondToClaimSessionService,
    private readonly validationService: RespondToClaimValidationService
  ) {}

  // ============================================
  // STEP 1: Start Now
  // ============================================

  @Get('start-now')
  @Render('respond-to-claim/start-now.njk')
  getStartNow(@Req() req: Request): StepViewData {
    return {
      backUrl: '/dashboard',
      t: req.t,
    };
  }

  @Post('start-now')
  postStartNow(@Res() res: Response): void {
    const nextUrl = this.respondToClaimService.getNextStep('start-now');
    res.redirect(303, nextUrl || '/dashboard');
  }

  // ============================================
  // STEP 2: Postcode Finder
  // ============================================

  @Get('postcode-finder')
  @Render('respond-to-claim/postcode-finder.njk')
  getPostcodeFinder(@Req() req: Request): StepViewData {
    const sessionData = this.sessionService.getStepData(req, 'postcodeFinder');

    return {
      backUrl: this.respondToClaimService.getPreviousStep('postcode-finder'),
      postcode: sessionData?.postcode || '',
      t: req.t,
    };
  }

  @Post('postcode-finder')
  postPostcodeFinder(@Req() req: Request, @Res() res: Response): void {
    const result = PostcodeFinderSchema.safeParse(req.body);

    if (!result.success) {
      const { errors, errorSummary } = this.validationService.formatZodErrors(result.error);

      res.render('respond-to-claim/postcode-finder.njk', {
        backUrl: this.respondToClaimService.getPreviousStep('postcode-finder'),
        postcode: req.body.postcode || '',
        errors,
        errorSummary,
        t: req.t,
      });
      return;
    }

    this.sessionService.saveStepData(req, 'postcodeFinder', result.data);

    const nextUrl = this.respondToClaimService.getNextStep('postcode-finder');
    res.redirect(303, nextUrl || '/dashboard');
  }

  // ============================================
  // STEP 3: Free Legal Advice
  // ============================================

  @Get('free-legal-advice')
  @Render('respond-to-claim/free-legal-advice.njk')
  getFreeLegalAdvice(@Req() req: Request): StepViewData {
    return {
      backUrl: this.respondToClaimService.getPreviousStep('free-legal-advice'),
      t: req.t,
    };
  }

  @Post('free-legal-advice')
  postFreeLegalAdvice(@Res() res: Response): void {
    const nextUrl = this.respondToClaimService.getNextStep('free-legal-advice');
    res.redirect(303, nextUrl || '/dashboard');
  }
}
