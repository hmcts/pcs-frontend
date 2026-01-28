# NestJS Dependency Injection Deep Dive

## Table of Contents
1. [What is Dependency Injection?](#what-is-dependency-injection)
2. [Express vs NestJS Patterns](#express-vs-nestjs-patterns)
3. [How NestJS DI Works](#how-nestjs-di-works)
4. [Real-World Example](#real-world-example)
5. [Testing Benefits](#testing-benefits)
6. [Advanced Patterns](#advanced-patterns)

---

## What is Dependency Injection?

**Dependency Injection (DI)** is a design pattern where a class receives its dependencies from external sources rather than creating them itself.

### Without DI (Tight Coupling)
```typescript
class RegisterInterestController {
  private service: RegisterInterestService;
  
  constructor() {
    this.service = new RegisterInterestService(); // ❌ Controller creates its own dependency
  }
}
```

### With DI (Loose Coupling)
```typescript
class RegisterInterestController {
  constructor(private readonly service: RegisterInterestService) {} // ✅ Dependency injected
}
```

**Benefits:**
- **Testability**: Easy to inject mock dependencies for testing
- **Flexibility**: Swap implementations without changing the class
- **Maintainability**: Clear declaration of what a class needs
- **Lifecycle Management**: Framework handles instance creation and cleanup

---

## Express vs NestJS Patterns

### Express Pattern (Manual Dependency Management)

#### Option 1: Direct Function Imports
```typescript
// services/registerInterestService.ts
export function getNextStep(currentStep: string): string {
  switch (currentStep) {
    case 'step1': return '/register-interest/step2';
    case 'step2': return '/register-interest/step3';
    default: return '/register-interest/step1';
  }
}

// routes/registerInterest.ts
import { getNextStep } from '../services/registerInterestService';

router.post('/register-interest/step1', async (req, res) => {
  const nextUrl = getNextStep('step1');
  req.session.registerInterest.step1 = req.body;
  res.redirect(nextUrl);
});
```

**Pros:**
- Simple and straightforward
- No class instantiation needed

**Cons:**
- Hard to mock for testing
- No state management
- Functions are stateless

#### Option 2: Manual Class Instantiation
```typescript
// services/registerInterestService.ts
export class RegisterInterestService {
  getNextStep(currentStep: string): string {
    switch (currentStep) {
      case 'step1': return '/register-interest/step2';
      case 'step2': return '/register-interest/step3';
      default: return '/register-interest/step1';
    }
  }
}

// routes/registerInterest.ts
import { RegisterInterestService } from '../services/registerInterestService';

const registerInterestService = new RegisterInterestService(); // ← Manual creation

router.post('/register-interest/step1', async (req, res) => {
  const nextUrl = registerInterestService.getNextStep('step1');
  req.session.registerInterest.step1 = req.body;
  res.redirect(nextUrl);
});
```

**Pros:**
- Can maintain state in the service
- Can use class methods

**Cons:**
- You manually manage the instance
- Hard to control singleton vs multiple instances
- Testing requires manual mocking

#### Option 3: Singleton Pattern
```typescript
// services/registerInterestService.ts
class RegisterInterestService {
  getNextStep(currentStep: string): string {
    // Implementation...
  }
}

// Create singleton instance
export const registerInterestService = new RegisterInterestService();

// routes/registerInterest.ts
import { registerInterestService } from '../services/registerInterestService';

router.post('/register-interest/step1', async (req, res) => {
  const nextUrl = registerInterestService.getNextStep('step1');
  res.redirect(nextUrl);
});
```

**Pros:**
- Single instance shared across the app
- Consistent state

**Cons:**
- Still manual management
- Testing requires module mocking
- Hard to swap implementations

#### Option 4: Factory Pattern
```typescript
// services/registerInterestService.ts
export class RegisterInterestService {
  constructor(private config: Config) {} // Service has dependencies
  
  getNextStep(currentStep: string): string {
    // Use this.config...
  }
}

export function createRegisterInterestService(config: Config): RegisterInterestService {
  return new RegisterInterestService(config);
}

// routes/registerInterest.ts
import { createRegisterInterestService } from '../services/registerInterestService';
import { config } from '../config';

const registerInterestService = createRegisterInterestService(config);

router.post('/register-interest/step1', async (req, res) => {
  const nextUrl = registerInterestService.getNextStep('step1');
  res.redirect(nextUrl);
});
```

**Pros:**
- Handles complex initialization
- Can inject dependencies

**Cons:**
- More boilerplate
- Still manual wiring

---

### NestJS Pattern (Automatic Dependency Injection)

```typescript
// register-interest.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class RegisterInterestService {
  getNextStep(currentStep: string): string {
    switch (currentStep) {
      case 'step1': return '/register-interest/step2';
      case 'step2': return '/register-interest/step3';
      default: return '/register-interest/step1';
    }
  }
}

// register-interest.controller.ts
import { Controller, Post, Req } from '@nestjs/common';
import { RegisterInterestService } from './register-interest.service';

@Controller('register-interest')
export class RegisterInterestController {
  constructor(private readonly registerInterestService: RegisterInterestService) {}
  // ↑ NestJS automatically injects the service instance
  
  @Post('step1')
  async postStep1(@Req() req: Request) {
    const nextUrl = this.registerInterestService.getNextStep('step1');
    req.session.registerInterest.step1 = req.body;
    return { redirect: nextUrl };
  }
}

// register-interest.module.ts
import { Module } from '@nestjs/common';
import { RegisterInterestController } from './register-interest.controller';
import { RegisterInterestService } from './register-interest.service';

@Module({
  controllers: [RegisterInterestController],
  providers: [RegisterInterestService], // ← Tells NestJS this service is available
})
export class RegisterInterestModule {}
```

**Pros:**
- ✅ Automatic instance creation and management
- ✅ Singleton by default (one instance shared)
- ✅ Easy to test (inject mocks)
- ✅ Clear dependency declaration
- ✅ Framework handles complex dependency chains

**Cons:**
- Requires understanding of decorators and NestJS concepts
- More initial setup

---

## How NestJS DI Works

### Step 1: Mark a Class as Injectable

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class RegisterInterestService {
  getNextStep(currentStep: string): string {
    return '/register-interest/step2';
  }
}
```

The `@Injectable()` decorator tells NestJS: *"This class can be injected into other classes"*

### Step 2: Register the Provider in a Module

```typescript
import { Module } from '@nestjs/common';

@Module({
  providers: [RegisterInterestService], // ← Register the service
  controllers: [RegisterInterestController],
})
export class RegisterInterestModule {}
```

The module tells NestJS: *"This service is available for injection within this module"*

### Step 3: Inject via Constructor

```typescript
@Controller('register-interest')
export class RegisterInterestController {
  constructor(private readonly registerInterestService: RegisterInterestService) {}
  //          ↑ TypeScript shorthand: creates property and assigns parameter
  
  @Post('step1')
  async postStep1() {
    // Use the injected service
    const next = this.registerInterestService.getNextStep('step1');
    return { redirect: next };
  }
}
```

**What happens:**
1. NestJS sees `RegisterInterestService` in the constructor
2. Looks for a provider with that type in the module
3. Creates an instance (or reuses existing singleton)
4. Injects it into the controller

### Constructor Shorthand Explained

```typescript
// This NestJS/TypeScript shorthand:
constructor(private readonly registerInterestService: RegisterInterestService) {}

// Is equivalent to:
private readonly registerInterestService: RegisterInterestService;

constructor(registerInterestService: RegisterInterestService) {
  this.registerInterestService = registerInterestService;
}
```

**Modifiers:**
- `private` - Only accessible within the class
- `readonly` - Cannot be reassigned after initialization
- `public` - Accessible outside the class (rarely used)

---

## Real-World Example

### Complex Dependency Chain

```typescript
// database.service.ts
@Injectable()
export class DatabaseService {
  query(sql: string): Promise<any[]> {
    // Database logic
  }
}

// register-interest.repository.ts
@Injectable()
export class RegisterInterestRepository {
  constructor(private readonly db: DatabaseService) {} // ← Depends on DatabaseService
  
  async saveContactPreference(userId: string, preference: string): Promise<void> {
    await this.db.query('INSERT INTO contact_preferences...');
  }
}

// register-interest.service.ts
@Injectable()
export class RegisterInterestService {
  constructor(private readonly repository: RegisterInterestRepository) {} // ← Depends on Repository
  
  async saveStep1(userId: string, data: any): Promise<void> {
    await this.repository.saveContactPreference(userId, data.contactPreference);
  }
  
  getNextStep(currentStep: string): string {
    return '/register-interest/step2';
  }
}

// register-interest.controller.ts
@Controller('register-interest')
export class RegisterInterestController {
  constructor(private readonly service: RegisterInterestService) {} // ← Depends on Service
  
  @Post('step1')
  async postStep1(@Req() req: Request) {
    await this.service.saveStep1(req.user.id, req.body);
    const nextUrl = this.service.getNextStep('step1');
    return { redirect: nextUrl };
  }
}

// register-interest.module.ts
@Module({
  providers: [
    DatabaseService,           // ← NestJS resolves the entire chain
    RegisterInterestRepository,
    RegisterInterestService,
  ],
  controllers: [RegisterInterestController],
})
export class RegisterInterestModule {}
```

**Dependency Chain:**
```
Controller → Service → Repository → DatabaseService
```

**In Express, you'd need:**
```typescript
const db = new DatabaseService();
const repo = new RegisterInterestRepository(db);
const service = new RegisterInterestService(repo);
const controller = new RegisterInterestController(service);
```

**In NestJS:**
```typescript
// Just declare what you need, NestJS handles the rest!
constructor(private readonly service: RegisterInterestService) {}
```

---

## Testing Benefits

### Express Testing (Manual Mocking)

```typescript
// Hard to test - service is created inside the route
router.post('/register-interest/step1', async (req, res) => {
  const service = new RegisterInterestService(); // ← Can't mock this
  const nextUrl = service.getNextStep('step1');
  res.redirect(nextUrl);
});

// You'd need to use module mocking
jest.mock('../services/registerInterestService', () => ({
  RegisterInterestService: jest.fn().mockImplementation(() => ({
    getNextStep: jest.fn().mockReturnValue('/mocked-url'),
  })),
}));
```

### NestJS Testing (Easy Mocking)

```typescript
import { Test } from '@nestjs/testing';
import { RegisterInterestController } from './register-interest.controller';
import { RegisterInterestService } from './register-interest.service';

describe('RegisterInterestController', () => {
  let controller: RegisterInterestController;
  let service: RegisterInterestService;
  
  beforeEach(async () => {
    // Create a testing module with a mock service
    const module = await Test.createTestingModule({
      controllers: [RegisterInterestController],
      providers: [
        {
          provide: RegisterInterestService,
          useValue: {
            getNextStep: jest.fn().mockReturnValue('/mocked-url'),
            saveStep1: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();
    
    controller = module.get<RegisterInterestController>(RegisterInterestController);
    service = module.get<RegisterInterestService>(RegisterInterestService);
  });
  
  it('should redirect to next step', async () => {
    const result = await controller.postStep1(mockRequest);
    
    expect(service.getNextStep).toHaveBeenCalledWith('step1');
    expect(result.redirect).toBe('/mocked-url');
  });
});
```

**Key Benefits:**
- ✅ Clean mock injection
- ✅ No module-level mocking needed
- ✅ Easy to test different scenarios
- ✅ Clear test setup

---

## Advanced Patterns

### 1. Custom Providers

```typescript
@Module({
  providers: [
    {
      provide: 'CONFIG',
      useValue: { apiUrl: 'https://api.example.com' },
    },
  ],
})
export class AppModule {}

// Inject with @Inject decorator
@Injectable()
export class MyService {
  constructor(@Inject('CONFIG') private config: any) {}
}
```

### 2. Factory Providers

```typescript
@Module({
  providers: [
    {
      provide: RegisterInterestService,
      useFactory: (config: ConfigService) => {
        return new RegisterInterestService(config.get('FEATURE_FLAG'));
      },
      inject: [ConfigService],
    },
  ],
})
export class RegisterInterestModule {}
```

### 3. Scope Options

```typescript
@Injectable({ scope: Scope.REQUEST }) // New instance per request
export class RequestScopedService {}

@Injectable({ scope: Scope.TRANSIENT }) // New instance every time it's injected
export class TransientService {}

@Injectable({ scope: Scope.DEFAULT }) // Singleton (default)
export class SingletonService {}
```

### 4. Optional Dependencies

```typescript
@Injectable()
export class MyService {
  constructor(
    @Optional() private optionalService?: OptionalService,
  ) {}
  
  doSomething() {
    if (this.optionalService) {
      this.optionalService.execute();
    }
  }
}
```

### 5. Exporting Providers

```typescript
// shared.module.ts
@Module({
  providers: [SharedService],
  exports: [SharedService], // ← Make available to other modules
})
export class SharedModule {}

// feature.module.ts
@Module({
  imports: [SharedModule], // ← Import to use SharedService
  controllers: [FeatureController],
})
export class FeatureModule {}
```

---

## Summary: Why NestJS DI is Better

| Aspect | Express | NestJS |
|--------|---------|--------|
| **Instance Creation** | Manual (`new Service()`) | Automatic |
| **Lifecycle** | You manage | Framework manages |
| **Testing** | Module mocking required | Clean mock injection |
| **Dependency Chains** | Manual wiring | Automatic resolution |
| **Singletons** | Manual implementation | Built-in |
| **Flexibility** | High boilerplate | Declarative |
| **Learning Curve** | Lower | Higher initially |
| **Scalability** | Harder for large apps | Excellent |

---

## Quick Reference

### Creating an Injectable Service
```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class MyService {
  doSomething(): string {
    return 'Hello';
  }
}
```

### Registering in Module
```typescript
@Module({
  providers: [MyService],
  controllers: [MyController],
})
export class MyModule {}
```

### Injecting into Controller
```typescript
@Controller('my-route')
export class MyController {
  constructor(private readonly myService: MyService) {}
  
  @Get()
  getData() {
    return this.myService.doSomething();
  }
}
```

### Testing with Mocks
```typescript
const module = await Test.createTestingModule({
  controllers: [MyController],
  providers: [
    {
      provide: MyService,
      useValue: { doSomething: jest.fn().mockReturnValue('Mocked') },
    },
  ],
}).compile();
```

---

## Key Takeaways

1. **DI = Inversion of Control**: Classes declare what they need, framework provides it
2. **NestJS handles the complexity**: No manual `new` statements, no singleton management
3. **Testing becomes easier**: Inject mocks cleanly without module-level hacks
4. **Scales well**: Complex dependency chains are automatically resolved
5. **Type-safe**: TypeScript ensures you inject the right types
6. **Express is simpler initially**: But NestJS pays off in larger applications

The mental model: **"I declare what I need, NestJS figures out how to provide it"**
