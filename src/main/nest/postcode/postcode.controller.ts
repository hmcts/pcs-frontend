import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';

import { OidcGuard } from '../guards/oidc.guard';

import { type PostcodeLookupDto, PostcodeLookupSchema } from './dto/postcode-lookup.dto';
import { PostcodeService } from './postcode.service';

@Controller('api')
@UseGuards(OidcGuard)
export class PostcodeController {
  constructor(private readonly postcodeService: PostcodeService) {}

  @Get('postcode-lookup-nest')
  async lookup(@Query() query: Record<string, unknown>): Promise<{ addresses: unknown[] }> {
    const result = PostcodeLookupSchema.safeParse(query);

    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || 'Invalid postcode';
      throw new BadRequestException({ error: errorMessage });
    }

    const dto: PostcodeLookupDto = result.data;
    const addresses = await this.postcodeService.getAddressesByPostcode(dto.postcode);

    return { addresses };
  }
}
