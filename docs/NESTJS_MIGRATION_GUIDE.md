# NestJS Migration Guide

This guide explains how to work with the NestJS integration in pcs-frontend, including how to run the service, add new endpoints, and migrate existing Express routes.

---

## Table of Contents

1. [Running the Service](#running-the-service)
2. [Project Structure](#project-structure)
3. [Adding a New Endpoint](#adding-a-new-endpoint)
4. [Migrating Express Routes](#migrating-express-routes)
5. [Testing](#testing)
6. [Common Patterns](#common-patterns)

---

## Running the Service

The service runs exactly as before - NestJS is bootstrapped alongside Express transparently:

```bash
# Development mode
yarn start:dev

# Development mode with SSL
yarn start:dev:ssl

# Production
yarn start
```

NestJS routes and Express routes both work simultaneously on the same server.

---

## Project Structure

NestJS modules are located in `src/main/nest/`:

```
src/main/nest/
├── index.ts                    # NestJS bootstrap function
├── app.module.ts               # Root module
├── guards/                     # Shared guards
│   └── oidc.guard.ts          # OIDC authentication guard
└── postcode/                   # Feature module (example)
    ├── postcode.module.ts
    ├── postcode.controller.ts
    ├── postcode.service.ts
    └── dto/
        └── postcode-lookup.dto.ts
```

---

## Adding a New Endpoint

### Step 1: Create a Feature Module

Create a new directory under `src/main/nest/` for your feature:

```bash
mkdir -p src/main/nest/my-feature/dto
```

### Step 2: Create the DTO (Data Transfer Object)

Use Zod for validation (consistent with existing patterns):

```typescript
// src/main/nest/my-feature/dto/my-feature.dto.ts
import { z } from 'zod';

export const MyFeatureSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().optional(),
});

export type MyFeatureDto = z.infer<typeof MyFeatureSchema>;
```

### Step 3: Create the Service

Services contain business logic and are injectable:

```typescript
// src/main/nest/my-feature/my-feature.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MyFeatureService {
  async getData(id: string): Promise<SomeType> {
    // Business logic here
  }
}
```

### Step 4: Create the Controller

Controllers handle HTTP requests and delegate to services:

```typescript
// src/main/nest/my-feature/my-feature.controller.ts
import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';

import { OidcGuard } from '../guards/oidc.guard';

import { MyFeatureSchema, type MyFeatureDto } from './dto/my-feature.dto';
import { MyFeatureService } from './my-feature.service';

@Controller('api')
@UseGuards(OidcGuard)
export class MyFeatureController {
  constructor(private readonly myFeatureService: MyFeatureService) {}

  @Get('my-feature')
  async getData(@Query() query: Record<string, unknown>): Promise<{ data: unknown }> {
    const result = MyFeatureSchema.safeParse(query);
    
    if (!result.success) {
      throw new BadRequestException({ error: result.error.errors[0]?.message });
    }

    const data = await this.myFeatureService.getData(result.data.id);
    return { data };
  }
}
```

### Step 5: Create the Module

Modules bundle controllers, providers, and exports:

```typescript
// src/main/nest/my-feature/my-feature.module.ts
import { Module } from '@nestjs/common';

import { MyFeatureController } from './my-feature.controller';
import { MyFeatureService } from './my-feature.service';

@Module({
  controllers: [MyFeatureController],
  providers: [MyFeatureService],
  exports: [MyFeatureService],
})
export class MyFeatureModule {}
```

### Step 6: Register the Module

Add the module to `app.module.ts`:

```typescript
// src/main/nest/app.module.ts
import { Module } from '@nestjs/common';

import { MyFeatureModule } from './my-feature/my-feature.module';
import { PostcodeModule } from './postcode/postcode.module';

@Module({
  imports: [
    PostcodeModule,
    MyFeatureModule,  // Add your module here
  ],
})
export class AppModule {}
```

---

## Migrating Express Routes

### Before (Express)

```typescript
// src/main/routes/myRoute.ts
import { Application, Request, Response } from 'express';
import { oidcMiddleware } from '../middleware/oidc';
import { myService } from '../services/myService';

export default function myRoutes(app: Application): void {
  app.get('/api/my-endpoint', oidcMiddleware, async (req: Request, res: Response) => {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }
    
    try {
      const data = await myService.getData(id);
      return res.json({ data });
    } catch (e) {
      return res.status(500).json({ error: 'Server error' });
    }
  });
}
```

### After (NestJS)

1. **Move business logic to a service** (if not already)
2. **Create controller with decorator-based routing**
3. **Use guards instead of middleware**
4. **Use DTOs for validation**
5. **Let NestJS handle error responses**

```typescript
// Controller handles routing and validation
@Controller('api')
@UseGuards(OidcGuard)
export class MyController {
  constructor(private readonly myService: MyService) {}

  @Get('my-endpoint')
  async getData(@Query() query: QueryDto): Promise<{ data: unknown }> {
    return { data: await this.myService.getData(query.id) };
  }
}
```

### Migration Checklist

- [ ] Create feature module directory
- [ ] Create DTO with Zod schema
- [ ] Create/move service with `@Injectable()` decorator
- [ ] Create controller with route decorators
- [ ] Create module and register providers
- [ ] Add module to `AppModule` imports
- [ ] Write unit tests using `@nestjs/testing`
- [ ] Remove old Express route file (or comment out)
- [ ] Test the endpoint works as expected

---

## Testing

### Unit Tests

Use NestJS testing utilities for isolated unit tests:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyController } from './my.controller';
import { MyService } from './my.service';

describe('MyController', () => {
  let controller: MyController;
  let service: jest.Mocked<MyService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MyController],
      providers: [
        {
          provide: MyService,
          useValue: { getData: jest.fn() },
        },
      ],
    })
      .overrideGuard(OidcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MyController>(MyController);
    service = module.get(MyService);
  });

  it('should return data', async () => {
    service.getData.mockResolvedValue({ id: '123' });
    const result = await controller.getData({ id: '123' });
    expect(result).toEqual({ data: { id: '123' } });
  });
});
```

### Running Tests

```bash
# Run all unit tests
yarn test:unit

# Run specific test file
yarn test:unit src/test/unit/nest/postcode/postcode.controller.spec.ts
```

---

## Common Patterns

### Authentication

Use the `OidcGuard` for authenticated endpoints:

```typescript
@Controller('api')
@UseGuards(OidcGuard)  // Apply to all routes in controller
export class MyController {
  // All routes require authentication
}

// Or apply to specific routes:
@Controller('api')
export class MyController {
  @Get('public')
  publicRoute() { }

  @Get('private')
  @UseGuards(OidcGuard)  // Only this route requires auth
  privateRoute() { }
}
```

### Error Handling

Throw NestJS exceptions - they're automatically converted to HTTP responses:

```typescript
import { BadRequestException, NotFoundException, BadGatewayException } from '@nestjs/common';

// 400 Bad Request
throw new BadRequestException('Invalid input');

// 404 Not Found
throw new NotFoundException('Resource not found');

// 502 Bad Gateway (for upstream service errors)
throw new BadGatewayException('External service unavailable');
```

### Using Existing Services

You can wrap existing services as NestJS providers:

```typescript
// Wrap existing service
import { getAddressesByPostcode } from '../../services/osPostcodeLookupService';

@Injectable()
export class PostcodeService {
  async getAddresses(postcode: string) {
    // Delegate to existing service
    return getAddressesByPostcode(postcode);
  }
}
```

Or inject the existing HTTP client:

```typescript
import { http } from '../../modules/http';

@Injectable()
export class ApiService {
  async callApi(url: string) {
    return http.get(url);
  }
}
```

---

## Questions or Issues?

For questions about the NestJS migration:

1. Check this guide and the [NestJS documentation](https://docs.nestjs.com/)
2. Review existing modules in `src/main/nest/` as examples
3. Raise issues in the team channel for discussion
