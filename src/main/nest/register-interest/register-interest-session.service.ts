import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

export interface RegisterInterestSession {
  step1?: {
    contactPreference?: string;
  };
  step2?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  step3?: {
    confirmAccuracy?: string;
  };
}

@Injectable()
export class RegisterInterestSessionService {
  getSessionData(req: Request): RegisterInterestSession {
    const session = req.session as unknown as Record<string, unknown>;
    return (session.registerInterest as RegisterInterestSession) || {};
  }

  getStepData<K extends keyof RegisterInterestSession>(
    req: Request,
    step: K
  ): RegisterInterestSession[K] | undefined {
    const sessionData = this.getSessionData(req);
    return sessionData[step];
  }

  saveStepData<K extends keyof RegisterInterestSession>(
    req: Request,
    step: K,
    data: RegisterInterestSession[K]
  ): void {
    const session = req.session as unknown as Record<string, unknown>;
    if (!session.registerInterest) {
      session.registerInterest = {};
    }
    (session.registerInterest as RegisterInterestSession)[step] = data;
  }

  clearSession(req: Request): void {
    const session = req.session as unknown as Record<string, unknown>;
    delete session.registerInterest;
  }

  getSummaryData(req: Request): {
    step1: RegisterInterestSession['step1'];
    step2: RegisterInterestSession['step2'];
  } {
    const sessionData = this.getSessionData(req);
    return {
      step1: sessionData.step1 || {},
      step2: sessionData.step2 || {},
    };
  }
}
