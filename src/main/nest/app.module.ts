import { Module } from '@nestjs/common';

import { NestJourneyModule } from './journey/nest-journey.module';
import { PostcodeModule } from './postcode/postcode.module';
import { RegisterInterestModule } from './register-interest/register-interest.module'; // Add this

@Module({
  imports: [PostcodeModule, 
    NestJourneyModule,
    RegisterInterestModule, // Add this
  ],
})
export class AppModule {}
