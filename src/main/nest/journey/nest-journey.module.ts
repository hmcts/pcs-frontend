import { Module } from '@nestjs/common';

import { NestJourneyController } from './nest-journey.controller';
import { NestJourneyService } from './nest-journey.service';

@Module({
  controllers: [NestJourneyController],
  providers: [NestJourneyService],
  exports: [NestJourneyService],
})
export class NestJourneyModule {}
