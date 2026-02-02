import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

import { getTranslationFunction, loadStepNamespace } from '../../modules/steps/i18n';

@Injectable()
export class I18nInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const handlerName = context.getHandler().name;

    const stepName = this.extractStepName(handlerName);
    if (stepName) {
      await loadStepNamespace(request, stepName, 'registerInterest');
      const t = getTranslationFunction(request, stepName, ['common']);
      request.t = t;
    }

    return next.handle();
  }

  private extractStepName(handlerName: string): string | null {
    const stepMatch = handlerName.match(/(?:get|post)(Step\d+|Confirmation)/i);
    if (stepMatch) {
      return stepMatch[1].toLowerCase();
    }
    return null;
  }
}
