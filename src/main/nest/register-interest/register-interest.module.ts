import { Module } from '@nestjs/common';

import { RegisterInterestController } from './register-interest.controller';
import { RegisterInterestService } from './register-interest.service';

@Module({
  controllers: [RegisterInterestController],
  providers: [RegisterInterestService],
})
export class RegisterInterestModule {}