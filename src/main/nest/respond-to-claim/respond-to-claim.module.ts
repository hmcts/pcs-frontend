import { Module } from '@nestjs/common';

import { RespondToClaimSessionService } from './respond-to-claim-session.service';
import { RespondToClaimController } from './respond-to-claim.controller';
import { RespondToClaimService } from './respond-to-claim.service';
import { RespondToClaimValidationService } from './validation.service';

@Module({
  controllers: [RespondToClaimController],
  providers: [
    RespondToClaimService,
    RespondToClaimSessionService,
    RespondToClaimValidationService,
  ],
})
export class RespondToClaimModule {}
