# NestJS Quick Reference Cheat Sheet

## Core Concepts

### 1. **Decorators**
Functions that add metadata to classes, methods, or parameters. They start with `@`.

**Types:**
- **Class decorators**: `@Controller()`, `@Injectable()`, `@Module()`
- **Method decorators**: `@Get()`, `@Post()`, `@UseGuards()`
- **Parameter decorators**: `@Body()`, `@Query()`, `@Param()`

**Example:**
```typescript
@Controller('api')        // Class decorator
export class MyController {
  @Get('users')          // Method decorator
  getUsers(@Query() query) {  // Parameter decorator
    return users;
  }
}
```

---

### 2. **Injectable (`@Injectable()`)**
Marks a class as available for dependency injection. Used for services, guards, pipes, etc.

**Purpose:** Tells NestJS "this class can be injected into other classes"

**Example:**
```typescript
@Injectable()
export class PostcodeService {
  async getAddresses(postcode: string) {
    // Business logic here
  }
}
```

**Usage:**
```typescript
@Controller('api')
export class PostcodeController {
  constructor(private readonly postcodeService: PostcodeService) {}
  // NestJS automatically injects PostcodeService
}
```

---

### 3. **Controller (`@Controller()`)**
Defines a class that handles HTTP requests. Sets the route prefix.

**Purpose:** Creates routes and handles HTTP requests

**Example:**
```typescript
@Controller('api')  // All routes start with /api
export class PostcodeController {
  @Get('postcode')  // Creates route: GET /api/postcode
  lookup() { ... }
}
```

---

### 4. **Module (`@Module()`)**
Organizes application structure. Groups related controllers, services, and imports.

**Purpose:** Encapsulates features and manages dependencies

**Example:**
```typescript
@Module({
  imports: [OtherModule],           // Other modules to use
  controllers: [PostcodeController], // HTTP handlers
  providers: [PostcodeService],      // Services to inject
  exports: [PostcodeService],        // Make available to other modules
})
export class PostcodeModule {}
```

---

### 5. **Providers**
Any class that can be injected. Usually services, but can be guards, pipes, etc.

**Purpose:** Reusable business logic

**Example:**
```typescript
@Injectable()
export class MyService {
  doSomething() { ... }
}

// Register in module:
@Module({
  providers: [MyService],  // <-- This is a provider
})
```

---

### 6. **Dependency Injection (DI)**
NestJS automatically creates and provides instances of classes.

**How it works:**
1. Mark class with `@Injectable()`
2. Register in module's `providers`
3. Request in constructor

**Example:**
```typescript
// 1. Mark as injectable
@Injectable()
export class UserService { ... }

// 2. Register in module
@Module({
  providers: [UserService],
})

// 3. Inject via constructor
@Controller()
export class UserController {
  constructor(private userService: UserService) {}
  // NestJS creates UserService instance automatically
}
```

---

### 7. **Guards (`@UseGuards()`)**
Control access to routes. Run before route handlers.

**Purpose:** Authentication, authorization, validation

**Example:**
```typescript
@Injectable()
export class OidcGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Return true to allow, false to block
  }
}

// Use it:
@Controller('api')
@UseGuards(OidcGuard)  // Applies to all routes in controller
export class MyController { ... }
```

---

### 8. **DTOs (Data Transfer Objects)**
Define the shape and validation of data.

**Purpose:** Type safety and validation

**Example:**
```typescript
// Using Zod
export const PostcodeSchema = z.object({
  postcode: z.string().min(1, 'Postcode required'),
});

export type PostcodeDto = z.infer<typeof PostcodeSchema>;

// Use in controller:
const result = PostcodeSchema.safeParse(req.body);
if (!result.success) {
  throw new BadRequestException();
}
```

---

## HTTP Method Decorators

| Decorator | HTTP Method | Example |
|-----------|-------------|---------|
| `@Get()` | GET | `@Get('users')` |
| `@Post()` | POST | `@Post('users')` |
| `@Put()` | PUT | `@Put('users/:id')` |
| `@Patch()` | PATCH | `@Patch('users/:id')` |
| `@Delete()` | DELETE | `@Delete('users/:id')` |
| `@All()` | All methods | `@All('*')` |

---

## Parameter Decorators

| Decorator | Extracts | Example |
|-----------|----------|---------|
| `@Body()` | Request body | `@Body() dto: CreateUserDto` |
| `@Query()` | Query params | `@Query() query: { page: number }` |
| `@Param()` | Route params | `@Param('id') id: string` |
| `@Req()` | Full request | `@Req() req: Request` |
| `@Res()` | Full response | `@Res() res: Response` |
| `@Headers()` | Headers | `@Headers('authorization') auth` |

---

## Common Decorators Quick Reference

### Class Level
```typescript
@Controller('path')       // Define controller with route prefix
@Injectable()            // Mark as injectable service
@Module({ ... })         // Define module
@UseGuards(Guard)        // Apply guard to all routes
@UseInterceptors(Int)    // Apply interceptor to all routes
```

### Method Level
```typescript
@Get('path')             // GET route
@Post('path')            // POST route
@Render('template.njk')  // Render template
@UseGuards(Guard)        // Apply guard to this route
@HttpCode(201)           // Set status code
```

### Parameter Level
```typescript
@Body()                  // Get request body
@Query()                 // Get query params
@Param('id')             // Get route param
@Req()                   // Get request object
@Res()                   // Get response object
```

---

## Exception Handling

| Exception | Status | Use Case |
|-----------|--------|----------|
| `BadRequestException` | 400 | Validation errors |
| `UnauthorizedException` | 401 | Auth required |
| `ForbiddenException` | 403 | No permission |
| `NotFoundException` | 404 | Resource not found |
| `BadGatewayException` | 502 | External API failed |

**Example:**
```typescript
if (!postcode) {
  throw new BadRequestException('Postcode required');
}
```

---

## Module Structure Pattern

```typescript
@Module({
  imports: [
    // Other modules this module depends on
    ConfigModule,
    DatabaseModule,
  ],
  controllers: [
    // HTTP request handlers
    UserController,
  ],
  providers: [
    // Services, guards, pipes, etc.
    UserService,
    AuthGuard,
  ],
  exports: [
    // Make available to other modules
    UserService,
  ],
})
export class UserModule {}
```

---

## Lifecycle Hooks

| Hook | When | Use Case |
|------|------|----------|
| `onModuleInit()` | After module init | Setup logic |
| `onModuleDestroy()` | Before shutdown | Cleanup |
| `onApplicationBootstrap()` | After all modules init | Final setup |

---

## Quick Tips

### 1. **Route Construction**
```typescript
@Controller('api')     // Prefix: /api
export class MyController {
  @Get('users')        // Route: GET /api/users
  @Post('users/:id')   // Route: POST /api/users/:id
}
```

### 2. **Dependency Injection Shorthand**
```typescript
// Long form:
constructor(private readonly service: MyService) {}

// What it means:
private readonly service: MyService;
constructor(service: MyService) {
  this.service = service;
}
```

### 3. **Guard vs Middleware**
- **Guard**: NestJS-specific, uses `ExecutionContext`
- **Middleware**: Express-style, uses `req, res, next`

### 4. **When to Use What**
- **Controller**: HTTP routing only
- **Service**: Business logic
- **DTO**: Validation schemas
- **Guard**: Authentication/authorization
- **Module**: Group related features

---

## Common Patterns

### Pattern 1: Simple API Endpoint
```typescript
@Controller('api')
@UseGuards(OidcGuard)
export class PostcodeController {
  constructor(private readonly service: PostcodeService) {}

  @Get('postcode')
  async lookup(@Query() query: Record<string, unknown>) {
    const result = PostcodeSchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException();
    }
    return this.service.getAddresses(result.data.postcode);
  }
}
```

### Pattern 2: Form Journey Step
```typescript
@Controller('journey')
export class JourneyController {
  constructor(private readonly service: JourneyService) {}

  @Get('step1')
  @Render('step1.njk')
  async getStep1(@Req() req) {
    return { formData: req.session.data };
  }

  @Post('step1')
  async postStep1(@Body() body, @Res() res) {
    const result = Step1Schema.safeParse(body);
    if (!result.success) {
      return res.status(400).render('step1.njk', { errors });
    }
    res.redirect('/journey/step2');
  }
}
```

---

## Glossary

| Term | Definition |
|------|------------|
| **Decorator** | Function that adds metadata to classes/methods |
| **Injectable** | Class that can be injected via DI |
| **Provider** | Any injectable class (service, guard, etc.) |
| **Module** | Feature container that groups related code |
| **Guard** | Controls access to routes |
| **DTO** | Data Transfer Object - defines data shape |
| **DI** | Dependency Injection - automatic instance creation |
| **Controller** | Handles HTTP requests |
| **Service** | Contains business logic |

---

*Quick reference for NestJS implementation - January 2026*
