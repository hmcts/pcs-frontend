import { Module } from '@nestjs/common';

import { NestJourneyModule } from './journey/nest-journey.module';
import { PostcodeModule } from './postcode/postcode.module';

@Module({
  imports: [PostcodeModule, NestJourneyModule],
})
export class AppModule {}
