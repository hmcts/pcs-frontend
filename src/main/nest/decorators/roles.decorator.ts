import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> => SetMetadata(ROLES_KEY, roles);
