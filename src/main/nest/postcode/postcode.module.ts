import { Module } from '@nestjs/common';

import { PostcodeController } from './postcode.controller';
import { PostcodeService } from './postcode.service';

@Module({
  controllers: [PostcodeController],
  providers: [PostcodeService],
  exports: [PostcodeService],
})
export class PostcodeModule {}
