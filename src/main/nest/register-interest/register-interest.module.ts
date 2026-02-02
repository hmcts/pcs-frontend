import { Module } from '@nestjs/common';

import { I18nInterceptor } from './i18n.interceptor';
import { RegisterInterestSessionService } from './register-interest-session.service';
import { RegisterInterestController } from './register-interest.controller';
import { RegisterInterestService } from './register-interest.service';
import { ValidationService } from './validation.service';

@Module({
  controllers: [RegisterInterestController],
  providers: [
    RegisterInterestService,
    RegisterInterestSessionService,
    ValidationService,
    I18nInterceptor,
  ],
})
export class RegisterInterestModule {}