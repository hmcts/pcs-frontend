import { Module } from '@nestjs/common';

import { NestJourneyModule } from './journey/nest-journey.module';
import { PostcodeModule } from './postcode/postcode.module';
import { RegisterInterestModule } from './register-interest/register-interest.module';
import { RespondToClaimModule } from './respond-to-claim/respond-to-claim.module';

@Module({
  imports: [
    PostcodeModule,
    NestJourneyModule,
    RegisterInterestModule,
    RespondToClaimModule,
  ],
})
export class AppModule {}
