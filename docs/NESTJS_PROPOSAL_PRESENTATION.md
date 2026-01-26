# NestJS Migration Proposal
## Technical Assessment & 5-Day Spike Plan

**Prepared for:** Senior Development Team  
**Date:** January 19, 2026  
**Objective:** Evaluate NestJS adoption for improved structure and maintainability

---

## Executive Summary

This document proposes a **5-day spike** to evaluate introducing NestJS as an abstraction layer over our existing Express application. The goal is to provide guardrails (structure, standards, and reusable patterns) for ongoing frontend-related backend/API development.

**Recommendation:** Proceed with a **Hybrid Approach** - introduce NestJS for new API endpoints while preserving existing Express SSR architecture.

---

## Table of Contents

1. [What NestJS Would Give Us](#what-nestjs-would-give-us)
2. [Current Pain Points (With Real Examples)](#current-pain-points-with-real-examples)
3. [NestJS Solutions (With Code Comparisons)](#nestjs-solutions-with-code-comparisons)
4. [5-Day Spike Plan](#5-day-spike-plan)
5. [Pros & Cons of the Spike](#pros--cons-of-the-spike)
6. [Alternative: NestJS-Like Patterns Without Migration](#alternative-nestjs-like-patterns-without-migration)
7. [Decision Framework](#decision-framework)

---

## What NestJS Would Give Us

NestJS doesn't provide new functionality - it provides **enforced architectural patterns** that address current gaps in our Express codebase:

| Current Gap | NestJS Solution |
|------------|-----------------|
| ❌ No enforced structure | ✅ Controllers → Services → Repositories pattern |
| ❌ Manual dependency management | ✅ Dependency Injection with clear contracts |
| ❌ Inconsistent validation | ✅ Declarative DTOs with class-validator |
| ❌ Scattered error handling | ✅ Global exception filters |
| ❌ Complex testing setup | ✅ Built-in testing utilities |
| ❌ No API documentation | ✅ Auto-generated Swagger docs |
| ❌ Partial type safety | ✅ Full type safety with DTOs |
| ❌ Flat folder structure | ✅ Feature modules with boundaries |

---

## Current Pain Points (With Real Examples)

### 1. No Enforced Structure - Business Logic Mixed with HTTP Handling

**Current Code:** `src/main/routes/dashboard.ts` (Lines 111-135)

```typescript
app.get('/dashboard/:caseReference', oidcMiddleware, async (req: Request, res: Response) => {
  const { caseReference } = req.params;

  const sanitisedCaseReference = sanitiseCaseReference(caseReference);
  if (!sanitisedCaseReference) {
    return res.status(404).render('not-found');
  }

  const caseReferenceNumber = Number(sanitisedCaseReference);

  try {
    // Business logic mixed with HTTP handling
    const [notifications, taskGroups] = await Promise.all([
      getDashboardNotifications(caseReferenceNumber),
      getDashboardTaskGroups(caseReferenceNumber).then(mapTaskGroups(app, sanitisedCaseReference)),
    ]);

    return res.render('dashboard', {
      notifications,
      taskGroups,
    });
  } catch (e) {
    logger.error(`Failed to fetch dashboard data for case ${sanitisedCaseReference}. Error was: ${String(e)}`);
    throw e;
  }
});
```

**Problems:**
- ❌ Validation, business logic, error handling all in one function
- ❌ Hard to test without mocking Express req/res
- ❌ No clear separation of concerns
- ❌ Error handling obscures the happy path

**NestJS Solution:**

```typescript
// dashboard.controller.ts - HTTP layer only
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':caseReference')
  @UseGuards(OidcGuard)
  async getDashboard(@Param('caseReference') caseReference: string) {
    return this.dashboardService.getDashboardData(caseReference);
  }
}

// dashboard.service.ts - Business logic only
@Injectable()
export class DashboardService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly taskGroupService: TaskGroupService
  ) {}

  async getDashboardData(caseReference: string): Promise<DashboardData> {
    const sanitised = this.sanitiseCaseReference(caseReference);
    if (!sanitised) {
      throw new NotFoundException('Invalid case reference');
    }

    const [notifications, taskGroups] = await Promise.all([
      this.notificationService.getNotifications(sanitised),
      this.taskGroupService.getTaskGroups(sanitised),
    ]);

    return { notifications, taskGroups };
  }
}
```

**Benefits:**
- ✅ Clear separation: Controller handles HTTP, Service handles business logic
- ✅ Easy to test: Mock services, not Express objects
- ✅ Error handling automatic via exception filters
- ✅ Reusable: Service can be used by other controllers

---

### 2. Manual Dependency Management - Global Singletons Everywhere

**Current Code:** `src/main/services/ccdCaseService.ts` (Lines 1-48)

```typescript
import { Logger } from '@hmcts/nodejs-logging';
import { AxiosError } from 'axios';
import config from 'config';
import { http } from '../modules/http';

const logger = Logger.getLogger('ccdCaseService');

// Global functions with no dependency injection
function getBaseUrl(): string {
  return config.get('ccd.url');
}

function getCaseTypeId(): string {
  return config.get('ccd.caseTypeId');
}

function getCaseHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      experimental: true,
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  };
}

// Service as global singleton object
export const ccdCaseService = {
  async getCase(accessToken: string | undefined): Promise<CcdCase | null> {
    const url = `${getBaseUrl()}/searchCases?ctid=${getCaseTypeId()}`;
    const headersConfig = getCaseHeaders(accessToken || '');
    // ... implementation
  },
  // ... more methods
};
```

**Problems:**
- ❌ Global singleton - can't swap implementations
- ❌ Hard to test - can't mock dependencies
- ❌ Tight coupling to `config` and `http` modules
- ❌ No type safety for dependencies

**NestJS Solution:**

```typescript
@Injectable()
export class CcdCaseService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: Logger
  ) {}

  async getCase(accessToken: string): Promise<CcdCase | null> {
    const url = `${this.configService.get('CCD_URL')}/searchCases`;
    const headers = this.buildHeaders(accessToken);
    
    try {
      const response = await this.httpService.get(url, { headers });
      return this.mapResponse(response.data);
    } catch (error) {
      this.logger.error('Failed to get case', error);
      throw new HttpException('Case lookup failed', HttpStatus.BAD_GATEWAY);
    }
  }

  private buildHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
      experimental: true,
      Accept: '*/*',
      'Content-Type': 'application/json',
    };
  }
}
```

**Benefits:**
- ✅ Dependencies injected via constructor
- ✅ Easy to mock for testing
- ✅ Can swap implementations (e.g., mock HTTP service)
- ✅ Type-safe dependencies

**Testing Comparison:**

```typescript
// Current - Hard to test
describe('ccdCaseService', () => {
  it('should get case', async () => {
    // How do we mock the global 'http' module?
    // How do we mock 'config'?
    // Very difficult!
  });
});

// NestJS - Easy to test
describe('CcdCaseService', () => {
  let service: CcdCaseService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CcdCaseService,
        { provide: HttpService, useValue: { get: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(CcdCaseService);
    httpService = module.get(HttpService);
  });

  it('should get case', async () => {
    jest.spyOn(httpService, 'get').mockResolvedValue({ data: mockCase });
    const result = await service.getCase('token');
    expect(result).toEqual(mockCase);
  });
});
```

---

### 3. Inconsistent Validation - Manual Checks Everywhere

**Current Code:** `src/main/routes/postcodeLookup.ts` (Lines 8-26)

```typescript
app.get('/api/postcode-lookup', oidcMiddleware, async (req: Request, res: Response) => {
  // Manual validation
  const raw = req.query.postcode;
  let postcode = '';
  if (typeof raw === 'string') {
    postcode = raw.trim();
  } else if (Array.isArray(raw) && typeof raw[0] === 'string') {
    postcode = raw[0].trim();
  }
  
  if (!postcode) {
    return res.status(400).json({ error: 'Missing postcode' });
  }

  try {
    const addresses = await getAddressesByPostcode(postcode);
    return res.json({ addresses });
  } catch {
    return res.status(502).json({ error: 'Failed to lookup postcode' });
  }
});
```

**Problems:**
- ❌ Validation logic repeated in every route
- ❌ Inconsistent error formats (sometimes 400, sometimes 502)
- ❌ No type safety for query parameters
- ❌ Easy to forget validation

**NestJS Solution:**

```typescript
// postcode-lookup.dto.ts - Reusable validation
export class PostcodeLookupDto {
  @IsString()
  @IsNotEmpty({ message: 'Postcode is required' })
  @Matches(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, {
    message: 'Invalid UK postcode format',
  })
  postcode: string;
}

// postcode.controller.ts - Clean controller
@Controller('api/postcode')
export class PostcodeController {
  constructor(private readonly postcodeService: PostcodeService) {}

  @Get('lookup')
  @UseGuards(OidcGuard)
  async lookup(@Query() dto: PostcodeLookupDto) {
    // If we reach here, validation passed
    return this.postcodeService.getAddresses(dto.postcode);
  }
}

// postcode.service.ts - Business logic
@Injectable()
export class PostcodeService {
  constructor(private readonly httpService: HttpService) {}

  async getAddresses(postcode: string): Promise<Address[]> {
    const response = await this.httpService.get(
      `https://api.os.uk/search/places/v1/postcode`,
      { params: { postcode } }
    );
    return response.data.results;
  }
}
```

**Benefits:**
- ✅ Validation defined once, reused everywhere
- ✅ Automatic validation before controller method runs
- ✅ Type-safe query parameters
- ✅ Consistent error format via global exception filter

---

### 4. No Standard Error Handling - Try-Catch Everywhere

**Current Code:** Multiple patterns across the codebase

```typescript
// Pattern 1: dashboard.ts (Lines 121-134)
try {
  const [notifications, taskGroups] = await Promise.all([...]);
  return res.render('dashboard', { notifications, taskGroups });
} catch (e) {
  logger.error(`Failed to fetch dashboard data. Error was: ${String(e)}`);
  throw e; // Re-throw, but what catches it?
}

// Pattern 2: postcodeLookup.ts (Lines 20-25)
try {
  const addresses = await getAddressesByPostcode(postcode);
  return res.json({ addresses });
} catch {
  return res.status(502).json({ error: 'Failed to lookup postcode' });
}

// Pattern 3: ccdCaseService.ts (Lines 117-134)
try {
  const response = await http.post<CcdUserCases>(url, requestBody, headersConfig);
  return response?.data?.cases;
} catch (error) {
  const axiosError = error as AxiosError;
  if (axiosError.response?.status === 404) {
    return null;
  }
  if (axiosError.response?.status === 400) {
    return null;
  }
  throw convertAxiosErrorToHttpError(error, 'getCase');
}
```

**Problems:**
- ❌ Three different error handling patterns
- ❌ Inconsistent error responses
- ❌ Try-catch boilerplate in every function
- ❌ No centralized error logging

**NestJS Solution:**

```typescript
// Global exception filter - ONE place for all errors
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Centralized logging
    this.logger.error('Exception caught', {
      url: request.url,
      method: request.method,
      error: exception,
    });

    // Consistent error format
    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message || 'Internal server error',
    });
  }
}

// Controllers are clean - no try-catch needed
@Controller('dashboard')
export class DashboardController {
  @Get(':caseReference')
  async getDashboard(@Param('caseReference') caseReference: string) {
    // No try-catch - errors automatically caught by filter
    return this.dashboardService.getDashboardData(caseReference);
  }
}

// Services throw typed exceptions
@Injectable()
export class DashboardService {
  async getDashboardData(caseReference: string) {
    if (!this.isValid(caseReference)) {
      throw new BadRequestException('Invalid case reference');
    }
    
    const data = await this.fetchData(caseReference);
    if (!data) {
      throw new NotFoundException('Case not found');
    }
    
    return data;
  }
}
```

**Benefits:**
- ✅ One error handling pattern for entire app
- ✅ Consistent error responses
- ✅ Centralized logging and monitoring
- ✅ Clean code without try-catch boilerplate

---

### 5. Testing Complexity - Mocking Express Objects

**Current Testing Challenge:**

```typescript
// Testing current Express routes requires extensive mocking
describe('Dashboard route', () => {
  it('should render dashboard', async () => {
    // Mock Express request
    const req = {
      params: { caseReference: '1234567890123456' },
      session: { 
        token: 'abc123',
        ccdCase: { id: '1234567890123456' }
      },
      user: { id: 'user1' },
      app: {
        locals: {
          nunjucksEnv: {
            render: jest.fn().mockReturnValue('<html>')
          }
        }
      }
    } as unknown as Request;
    
    // Mock Express response
    const res = {
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn()
    } as unknown as Response;
    
    // Mock external services
    jest.mock('../services/pcsApi', () => ({
      getDashboardNotifications: jest.fn(),
      getDashboardTaskGroups: jest.fn(),
    }));
    
    // Finally test
    await dashboardRoute(req, res);
    
    expect(res.render).toHaveBeenCalled();
  });
});
```

**NestJS Testing:**

```typescript
describe('DashboardController', () => {
  let controller: DashboardController;
  let service: DashboardService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getDashboardData: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(DashboardController);
    service = module.get(DashboardService);
  });

  it('should return dashboard data', async () => {
    const mockData = { notifications: [], taskGroups: [] };
    jest.spyOn(service, 'getDashboardData').mockResolvedValue(mockData);

    const result = await controller.getDashboard('1234567890123456');

    expect(result).toEqual(mockData);
    expect(service.getDashboardData).toHaveBeenCalledWith('1234567890123456');
  });
});
```

**Benefits:**
- ✅ 80% less boilerplate
- ✅ Test business logic, not HTTP layer
- ✅ Fast tests (no HTTP overhead)
- ✅ Built-in testing utilities

---

### 6. No Code Organization Standards

**Current Structure:**

```
src/main/
├── routes/
│   ├── dashboard.ts (137 lines - everything mixed)
│   ├── postcodeLookup.ts
│   ├── home.ts
│   └── registerSteps.ts
├── services/
│   ├── ccdCaseService.ts
│   ├── osPostcodeLookupService.ts
│   └── pcsApi/
├── middleware/
│   ├── oidc.ts
│   ├── ccdCase.ts
│   └── sessionTimeout.ts
└── modules/
    ├── session/
    ├── nunjucks/
    └── oidc/
```

**Problems:**
- ❌ Related code scattered across folders
- ❌ No clear feature boundaries
- ❌ Hard to find where functionality lives
- ❌ No module isolation

**NestJS Structure:**

```
src/api/
├── dashboard/
│   ├── dashboard.module.ts          # Module definition
│   ├── dashboard.controller.ts      # HTTP layer
│   ├── dashboard.service.ts         # Business logic
│   ├── dto/
│   │   └── dashboard-response.dto.ts
│   ├── guards/
│   │   └── ccd-auth.guard.ts
│   └── dashboard.controller.spec.ts # Tests
├── postcode/
│   ├── postcode.module.ts
│   ├── postcode.controller.ts
│   ├── postcode.service.ts
│   ├── dto/
│   │   ├── postcode-lookup.dto.ts
│   │   └── address-response.dto.ts
│   └── postcode.controller.spec.ts
├── cases/
│   ├── cases.module.ts
│   ├── cases.controller.ts
│   ├── cases.service.ts
│   └── dto/
└── common/
    ├── filters/
    │   └── http-exception.filter.ts
    ├── interceptors/
    │   └── logging.interceptor.ts
    └── guards/
        └── oidc.guard.ts
```

**Benefits:**
- ✅ Feature folders - everything for a feature in one place
- ✅ Clear boundaries - modules define public/private APIs
- ✅ Easy discoverability - new devs find code quickly
- ✅ Scalability - add features without affecting others

---

## Readability Comparison: Real Code

### Current: Dashboard Route (137 lines, mixed concerns)

```typescript
// src/main/routes/dashboard.ts - Lines 51-95
function mapTaskGroups(app: Application, caseReference: string) {
  return (taskGroups: DashboardTaskGroup[]): MappedTaskGroup[] => {
    return taskGroups.map(taskGroup => {
      const mappedTitle = TASK_GROUP_MAP[taskGroup.groupId];

      return {
        groupId: taskGroup.groupId,
        title: mappedTitle,
        tasks: taskGroup.tasks.map(task => {
          if (!app.locals.nunjucksEnv) {
            throw new Error('Nunjucks environment not initialized');
          }

          const taskGroupId = taskGroup.groupId.toLowerCase();

          const hint =
            task.templateValues.dueDate || task.templateValues.deadline
              ? {
                  html: app.locals.nunjucksEnv.render(
                    `components/taskGroup/${taskGroupId}/${task.templateId}-hint.njk`,
                    task.templateValues
                  ),
                }
              : undefined;

          return {
            title: {
              html: app.locals.nunjucksEnv.render(
                `components/taskGroup/${taskGroupId}/${task.templateId}.njk`,
                task.templateValues
              ),
            },
            hint,
            href:
              task.status === 'NOT_AVAILABLE'
                ? undefined
                : `/dashboard/${caseReference}/${taskGroupId}/${task.templateId}`,
            status: STATUS_MAP[task.status],
          };
        }),
      };
    });
  };
}

export default function dashboardRoutes(app: Application): void {
  const logger = Logger.getLogger('dashboard');

  app.get('/dashboard/:caseReference', oidcMiddleware, async (req: Request, res: Response) => {
    const { caseReference } = req.params;
    const sanitisedCaseReference = sanitiseCaseReference(caseReference);
    
    if (!sanitisedCaseReference) {
      return res.status(404).render('not-found');
    }

    const caseReferenceNumber = Number(sanitisedCaseReference);

    try {
      const [notifications, taskGroups] = await Promise.all([
        getDashboardNotifications(caseReferenceNumber),
        getDashboardTaskGroups(caseReferenceNumber).then(mapTaskGroups(app, sanitisedCaseReference)),
      ]);

      return res.render('dashboard', { notifications, taskGroups });
    } catch (e) {
      logger.error(`Failed to fetch dashboard data. Error was: ${String(e)}`);
      throw e;
    }
  });
}
```

**What a new developer sees:**
- ❓ What does this function do? (need to read all 137 lines)
- ❓ What are the dependencies? (hidden in function body)
- ❓ How do I test this? (need to mock Express + app.locals)
- ❓ Where's the business logic? (mixed with HTTP handling)

### NestJS: Clear Separation

```typescript
// dashboard.module.ts - Module definition
@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [DashboardController],
  providers: [DashboardService, TaskGroupMapper, NotificationService],
})
export class DashboardModule {}

// dashboard.controller.ts - HTTP layer only
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':caseReference')
  @UseGuards(OidcGuard)
  async getDashboard(
    @Param('caseReference') caseReference: string
  ): Promise<DashboardResponse> {
    return this.dashboardService.getDashboardData(caseReference);
  }
}

// dashboard.service.ts - Business logic only
@Injectable()
export class DashboardService {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly taskGroupService: TaskGroupService,
    private readonly mapper: TaskGroupMapper
  ) {}

  async getDashboardData(caseReference: string): Promise<DashboardResponse> {
    const sanitised = this.sanitiseCaseReference(caseReference);
    if (!sanitised) {
      throw new NotFoundException('Invalid case reference');
    }

    const [notifications, taskGroups] = await Promise.all([
      this.notificationService.getNotifications(sanitised),
      this.taskGroupService.getTaskGroups(sanitised),
    ]);

    return {
      notifications,
      taskGroups: this.mapper.mapTaskGroups(taskGroups, sanitised),
    };
  }

  private sanitiseCaseReference(ref: string): string | null {
    return /^\d{16}$/.test(ref) ? ref : null;
  }
}

// task-group.mapper.ts - Mapping logic separated
@Injectable()
export class TaskGroupMapper {
  constructor(private readonly templateService: TemplateService) {}

  mapTaskGroups(taskGroups: DashboardTaskGroup[], caseRef: string): MappedTaskGroup[] {
    return taskGroups.map(group => ({
      groupId: group.groupId,
      title: TASK_GROUP_MAP[group.groupId],
      tasks: this.mapTasks(group.tasks, group.groupId, caseRef),
    }));
  }

  private mapTasks(tasks: Task[], groupId: string, caseRef: string): MappedTask[] {
    return tasks.map(task => ({
      title: { html: this.templateService.render(task.templateId, task.templateValues) },
      hint: this.buildHint(task),
      href: this.buildHref(task, groupId, caseRef),
      status: STATUS_MAP[task.status],
    }));
  }
}
```

**What a new developer sees:**
- ✅ Clear module structure (what's included)
- ✅ Explicit dependencies (constructor)
- ✅ Separated concerns (Controller → Service → Mapper)
- ✅ Easy to test (mock services)
- ✅ Type-safe (DTOs and return types)

---

## 5-Day Spike Plan

### Goal
Prove NestJS can **coexist** with Express for new API development without disrupting existing functionality.

### Scope
Migrate **postcode lookup** functionality to NestJS API endpoint as a vertical slice demonstration.

### Success Criteria
1. ✅ NestJS running under `/api/*` routes
2. ✅ `/api/postcode-lookup` endpoint working with validation
3. ✅ Service layer with dependency injection
4. ✅ Unit tests using NestJS testing utilities
5. ✅ Swagger documentation auto-generated
6. ✅ No impact on existing Express routes
7. ✅ Documentation for adding new endpoints

### Architecture

```
┌─────────────────────────────────────────────┐
│         Express App (Port 3209)             │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │   Existing Express Routes          │    │
│  │   - /dashboard (Nunjucks SSR)      │    │
│  │   - /non-rent-arrears/* (SSR)      │    │
│  │   - /steps/* (Journey flows)       │    │
│  │   - OIDC auth, sessions, i18n      │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │   NestJS Module (mounted at /api)  │    │
│  │   - /api/postcode-lookup           │    │
│  │   - /api/health                    │    │
│  │   - /api/docs (Swagger)            │    │
│  │   - DTOs, Guards, Services         │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Day-by-Day Plan

#### **Day 1: Foundation & Setup**

**Morning:**
- Install NestJS dependencies (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- Create `src/main/api/` folder structure
- Create `ApiModule` and mount under `/api` in Express app
- Configure NestJS to use existing Express instance

**Afternoon:**
- Create health check endpoint (`/api/health`)
- Verify both Express and NestJS routes work
- Set up global validation pipe
- Configure Swagger documentation

**Deliverables:**
```typescript
// GET /health (Express - existing) ✅
// GET /api/health (NestJS - new) ✅
// GET /api/docs (Swagger UI) ✅
```

**Code Example:**
```typescript
// src/main/app.ts (additions)
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ApiModule } from './api/api.module';

async function bootstrapNestJS() {
  const nestApp = await NestFactory.create(
    ApiModule,
    new ExpressAdapter(app)
  );
  
  nestApp.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  await nestApp.init();
}

bootstrapNestJS();
```

---

#### **Day 2: Postcode Service Migration**

**Morning:**
- Create `PostcodeModule` with controller and service
- Migrate `osPostcodeLookupService` logic to NestJS service
- Create DTOs with validation decorators
- Implement dependency injection

**Afternoon:**
- Add error handling with exception filters
- Test endpoint with Postman/curl
- Compare with existing Express endpoint
- Document differences

**Deliverables:**
```typescript
// POST /api/postcode-lookup
// Body: { "postcode": "SW1A 1AA" }
// Response: { "addresses": [...] }
```

**Code Example:**
```typescript
// postcode-lookup.dto.ts
export class PostcodeLookupDto {
  @IsString()
  @IsNotEmpty({ message: 'Postcode is required' })
  @Matches(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, {
    message: 'Invalid UK postcode format',
  })
  postcode: string;
}

// postcode.controller.ts
@Controller('postcode')
export class PostcodeController {
  constructor(private readonly postcodeService: PostcodeService) {}

  @Post('lookup')
  @UseGuards(OidcGuard)
  @ApiOperation({ summary: 'Lookup addresses by postcode' })
  async lookup(@Body() dto: PostcodeLookupDto) {
    return this.postcodeService.getAddresses(dto.postcode);
  }
}
```

---

#### **Day 3: Testing & Validation**

**Morning:**
- Write unit tests for controller
- Write unit tests for service
- Test validation scenarios (invalid postcode, missing field)
- Test error handling

**Afternoon:**
- Add integration tests
- Performance comparison with Express version
- Test with existing OIDC authentication
- Verify session compatibility

**Deliverables:**
- 100% test coverage for PostcodeModule
- Performance metrics comparison
- Integration test suite

**Code Example:**
```typescript
describe('PostcodeController', () => {
  let controller: PostcodeController;
  let service: PostcodeService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PostcodeController],
      providers: [
        {
          provide: PostcodeService,
          useValue: { getAddresses: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(PostcodeController);
    service = module.get(PostcodeService);
  });

  it('should return addresses for valid postcode', async () => {
    const mockAddresses = [{ line1: '10 Downing Street', postcode: 'SW1A 2AA' }];
    jest.spyOn(service, 'getAddresses').mockResolvedValue(mockAddresses);

    const result = await controller.lookup({ postcode: 'SW1A 2AA' });

    expect(result).toEqual(mockAddresses);
  });

  it('should throw BadRequestException for invalid postcode', async () => {
    // Validation happens before controller method
    // Test via integration test
  });
});
```

---

#### **Day 4: Documentation & Patterns**

**Morning:**
- Document NestJS setup process
- Create "How to add new endpoint" guide
- Document migration patterns
- Create reusable guards/interceptors

**Afternoon:**
- Add logging interceptor
- Create custom decorators for common patterns
- Document testing patterns
- Create code templates

**Deliverables:**
- `docs/NESTJS_SETUP.md`
- `docs/ADDING_API_ENDPOINTS.md`
- `docs/TESTING_NESTJS_MODULES.md`
- Reusable code templates

**Guide Example:**
```markdown
# Adding a New API Endpoint

## 1. Create Module
```bash
nest g module features/my-feature
nest g controller features/my-feature
nest g service features/my-feature
```

## 2. Create DTO
```typescript
export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

## 3. Implement Controller
```typescript
@Controller('my-feature')
export class MyFeatureController {
  constructor(private readonly service: MyFeatureService) {}

  @Post()
  create(@Body() dto: CreateFeatureDto) {
    return this.service.create(dto);
  }
}
```

## 4. Write Tests
```typescript
describe('MyFeatureController', () => {
  // Test setup
});
```
```

---

#### **Day 5: Review & Recommendations**

**Morning:**
- Code review with team
- Performance analysis
- Risk assessment
- Gather feedback

**Afternoon:**
- Create migration roadmap (if approved)
- Present findings to stakeholders
- Document lessons learned
- Make go/no-go recommendation

**Deliverables:**
- Spike report with metrics
- Go/No-Go recommendation
- Migration roadmap (if proceeding)
- Presentation slides

---

## Pros & Cons of the Spike

### ✅ PROS: Benefits of Undertaking the Spike

#### 1. **Low Risk Validation**
- ✅ 5 days is low investment to validate approach
- ✅ Doesn't disrupt existing functionality
- ✅ Can abandon if not successful
- ✅ Provides concrete data for decision-making

#### 2. **Hands-On Learning**
- ✅ Team gains practical NestJS experience
- ✅ Identifies real integration challenges
- ✅ Tests compatibility with HMCTS infrastructure
- ✅ Reveals hidden complexity early

#### 3. **Proof of Concept**
- ✅ Demonstrates coexistence with Express
- ✅ Shows real performance metrics
- ✅ Validates testing approach
- ✅ Proves or disproves assumptions

#### 4. **Future-Proofing**
- ✅ If successful, provides clear migration path
- ✅ Establishes patterns for new development
- ✅ Creates reusable templates and guides
- ✅ Positions team for modern architecture

#### 5. **Team Buy-In**
- ✅ Developers see benefits firsthand
- ✅ Reduces resistance to change
- ✅ Identifies champions and concerns
- ✅ Builds consensus through evidence

### ❌ CONS: Challenges & Risks

#### 1. **Time Investment**
- ❌ 5 days of development time (1 person-week)
- ❌ May need additional time if issues arise
- ❌ Opportunity cost (what else could be built)
- ❌ Learning curve for team

#### 2. **Potential for Failure**
- ❌ May discover NestJS doesn't fit our needs
- ❌ Integration issues with existing auth/session
- ❌ Performance concerns
- ❌ Wasted effort if abandoned

#### 3. **Incomplete Picture**
- ❌ 5 days only tests one vertical slice
- ❌ Doesn't cover complex scenarios (multi-step forms, Nunjucks templates)
- ❌ May miss edge cases
- ❌ Doesn't test full migration complexity

#### 4. **Team Disruption**
- ❌ Requires dedicated developer time
- ❌ May create confusion about direction
- ❌ Could split team on approach
- ❌ Adds new technology to maintain

#### 5. **Maintenance Burden**
- ❌ If adopted, two frameworks to maintain
- ❌ Increased complexity in codebase
- ❌ Need to train all developers
- ❌ Potential for inconsistent patterns

#### 6. **Infrastructure Concerns**
- ❌ May have HMCTS deployment constraints
- ❌ Azure App Service compatibility unknown
- ❌ Monitoring/logging integration unclear
- ❌ Security review required

---

## Alternative: NestJS-Like Patterns Without Migration

If we decide **NOT** to adopt NestJS, we can still improve our Express codebase by implementing NestJS-inspired patterns.

### Option 1: Service Layer Pattern

**Create a clear service layer with dependency injection:**

```typescript
// services/base.service.ts
export abstract class BaseService {
  constructor(
    protected readonly http: HttpService,
    protected readonly config: ConfigService,
    protected readonly logger: Logger
  ) {}
}

// services/ccd-case.service.ts
export class CcdCaseService extends BaseService {
  async getCase(accessToken: string): Promise<CcdCase | null> {
    const url = this.config.get('CCD_URL');
    try {
      const response = await this.http.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get case', error);
      throw new ServiceError('Case lookup failed');
    }
  }
}

// routes/dashboard.ts
const ccdCaseService = new CcdCaseService(http, config, logger);

app.get('/dashboard/:caseReference', oidcMiddleware, async (req, res) => {
  const data = await ccdCaseService.getCase(req.session.token);
  res.render('dashboard', data);
});
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Testable services
- ✅ Reusable business logic
- ✅ No framework change

---

### Option 2: Validation Middleware

**Create reusable validation middleware:**

```typescript
// middleware/validation.ts
import { z } from 'zod';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

// Usage
const PostcodeLookupSchema = z.object({
  postcode: z.string()
    .min(1, 'Postcode is required')
    .regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, 'Invalid postcode'),
});

app.post('/api/postcode-lookup',
  validateBody(PostcodeLookupSchema),
  async (req, res) => {
    // req.body is now typed and validated
    const addresses = await postcodeService.lookup(req.body.postcode);
    res.json({ addresses });
  }
);
```

**Benefits:**
- ✅ Reusable validation
- ✅ Type safety with Zod
- ✅ Consistent error format
- ✅ No framework change

---

### Option 3: Error Handling Middleware

**Centralize error handling:**

```typescript
// middleware/error-handler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Error caught', {
    url: req.url,
    method: req.method,
    error: error.message,
    stack: error.stack,
  });

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
  });
}

// app.ts
app.use(errorHandler);

// Usage in routes
app.get('/dashboard/:caseReference', async (req, res, next) => {
  try {
    if (!isValid(req.params.caseReference)) {
      throw new AppError('Invalid case reference', 400, 'INVALID_CASE_REF');
    }
    const data = await dashboardService.getData(req.params.caseReference);
    res.render('dashboard', data);
  } catch (error) {
    next(error); // Caught by error handler
  }
});
```

**Benefits:**
- ✅ Consistent error handling
- ✅ Centralized logging
- ✅ Typed errors
- ✅ No framework change

---

### Option 4: Feature-Based Folder Structure

**Reorganize code by feature:**

```
src/main/
├── features/
│   ├── dashboard/
│   │   ├── dashboard.routes.ts
│   │   ├── dashboard.service.ts
│   │   ├── dashboard.types.ts
│   │   ├── dashboard.validation.ts
│   │   └── dashboard.test.ts
│   ├── postcode/
│   │   ├── postcode.routes.ts
│   │   ├── postcode.service.ts
│   │   ├── postcode.types.ts
│   │   └── postcode.test.ts
│   └── cases/
│       ├── cases.routes.ts
│       ├── cases.service.ts
│       └── cases.test.ts
├── common/
│   ├── middleware/
│   ├── errors/
│   └── utils/
└── app.ts
```

**Benefits:**
- ✅ Related code together
- ✅ Easy to find features
- ✅ Clear boundaries
- ✅ No framework change

---

### Option 5: Dependency Injection Container

**Use a lightweight DI container:**

```typescript
// di-container.ts
import { Container } from 'typedi';

// Register services
Container.set('HttpService', http);
Container.set('ConfigService', config);
Container.set('Logger', logger);

// services/ccd-case.service.ts
import { Service, Inject } from 'typedi';

@Service()
export class CcdCaseService {
  constructor(
    @Inject('HttpService') private http: HttpService,
    @Inject('ConfigService') private config: ConfigService,
    @Inject('Logger') private logger: Logger
  ) {}

  async getCase(token: string): Promise<CcdCase> {
    // Implementation
  }
}

// routes/dashboard.ts
const ccdCaseService = Container.get(CcdCaseService);

app.get('/dashboard', async (req, res) => {
  const data = await ccdCaseService.getCase(req.session.token);
  res.render('dashboard', data);
});
```

**Benefits:**
- ✅ Dependency injection
- ✅ Testable services
- ✅ Lightweight (typedi is small)
- ✅ No framework change

---

### Comparison: NestJS vs. Patterns

| Feature | NestJS | Express + Patterns | Effort |
|---------|--------|-------------------|--------|
| **Service Layer** | ✅ Built-in | ✅ Manual implementation | Low |
| **Validation** | ✅ Decorators | ✅ Zod middleware | Low |
| **Error Handling** | ✅ Exception filters | ✅ Error middleware | Low |
| **DI Container** | ✅ Built-in | ✅ TypeDI library | Medium |
| **Testing Utils** | ✅ Built-in | ❌ Manual setup | High |
| **Documentation** | ✅ Auto Swagger | ❌ Manual | High |
| **Enforcement** | ✅ Framework enforced | ⚠️ Team discipline | N/A |
| **Learning Curve** | ⚠️ High | ✅ Low | N/A |

**Recommendation:** If we don't adopt NestJS, implement **Options 1-4** (Service Layer, Validation, Error Handling, Folder Structure) as they provide 80% of the benefits with 20% of the effort.

---

## Decision Framework

### ✅ GO (Proceed with Full Migration) IF:

1. **Spike Success:**
   - ✅ All success criteria met
   - ✅ Performance equal or better than Express
   - ✅ No major integration issues
   - ✅ Team confident in approach

2. **Business Case:**
   - ✅ Clear ROI for 3-6 month migration
   - ✅ Stakeholder buy-in
   - ✅ Budget approved
   - ✅ Timeline acceptable

3. **Technical Validation:**
   - ✅ HMCTS infrastructure compatible
   - ✅ Security review passed
   - ✅ Monitoring/logging working
   - ✅ Deployment pipeline updated

### ❌ NO-GO (Stay with Express) IF:

1. **Spike Failure:**
   - ❌ Can't achieve coexistence
   - ❌ Performance degradation
   - ❌ Major integration issues
   - ❌ Team resistance

2. **Business Concerns:**
   - ❌ No clear ROI
   - ❌ Timeline too long
   - ❌ Budget constraints
   - ❌ Higher priority work

3. **Technical Blockers:**
   - ❌ Infrastructure incompatibility
   - ❌ Security concerns
   - ❌ Deployment issues
   - ❌ Maintenance burden too high

**Alternative:** Implement NestJS-like patterns in Express (see previous section)

### 🎯 HYBRID (Recommended) IF:

1. **Spike Success:**
   - ✅ Coexistence proven
   - ✅ New APIs benefit from NestJS
   - ✅ Existing SSR stays in Express
   - ✅ Team comfortable with both

2. **Gradual Migration:**
   - ✅ 6-12 month timeline acceptable
   - ✅ New features use NestJS
   - ✅ Legacy routes stay in Express
   - ✅ No big-bang migration

3. **Best of Both:**
   - ✅ Keep Nunjucks/GOV.UK patterns
   - ✅ Modern API development with NestJS
   - ✅ Team learns incrementally
   - ✅ Low risk approach

---

## Questions for Discussion

### Technical Questions

1. **What specific pain points are we trying to solve?**
   - Is it API structure? Testing? Validation? All of the above?

2. **What's our appetite for a 3-6 month migration?**
   - vs. 5-day spike + gradual adoption?

3. **Are there specific features driving this?**
   - GraphQL? Microservices? Better testing?

4. **What's the team's TypeScript/decorator experience?**
   - Will there be a steep learning curve?

### Business Questions

1. **What's the ROI calculation?**
   - Developer productivity? Reduced bugs? Faster onboarding?

2. **What's the opportunity cost?**
   - What features won't get built during migration?

3. **What's the risk tolerance?**
   - Big-bang migration vs. gradual adoption?

4. **What's the timeline pressure?**
   - Do we have 3-6 months for this?

### Infrastructure Questions

1. **HMCTS deployment compatibility?**
   - Any known issues with NestJS on Azure?

2. **Security review requirements?**
   - New framework = new security review?

3. **Monitoring/logging integration?**
   - AppInsights compatible?

4. **Performance requirements?**
   - Any SLAs we need to maintain?

---

## Recommendation Summary

### Primary Recommendation: **HYBRID APPROACH** 🎯

1. **Execute 5-day spike** to prove coexistence
2. **Keep Express** for existing SSR (Nunjucks, multi-step forms, GOV.UK patterns)
3. **Introduce NestJS** for new API endpoints under `/api/*`
4. **Gradual migration** over 6-12 months as features are touched
5. **Team learns incrementally** without disruption

### Why Hybrid?

- ✅ **Low risk:** Existing functionality untouched
- ✅ **Proven approach:** Many companies do this successfully
- ✅ **Flexible:** Can accelerate or pause migration
- ✅ **Practical:** Delivers value immediately (new APIs)
- ✅ **Realistic:** Achievable in 5-day spike

### Alternative Recommendation: **NestJS-Like Patterns** ⚠️

If spike fails or stakeholders reject NestJS:

1. Implement service layer pattern
2. Add validation middleware (Zod)
3. Centralize error handling
4. Reorganize to feature folders
5. Consider lightweight DI (TypeDI)

**Effort:** 2-3 weeks  
**Benefit:** 80% of NestJS benefits without framework change

---

## Next Steps

1. **Review this document** with senior development team
2. **Discuss questions** and concerns
3. **Make go/no-go decision** on 5-day spike
4. **If approved:** Assign developer and schedule spike
5. **If rejected:** Decide on alternative patterns to adopt

---

## Appendix: Resources

### NestJS Documentation
- [Official Docs](https://docs.nestjs.com/)
- [Express Adapter](https://docs.nestjs.com/techniques/mvc)
- [Testing Guide](https://docs.nestjs.com/fundamentals/testing)

### Migration Guides
- [Express to NestJS Migration](https://docs.nestjs.com/migration/express)
- [Hybrid Applications](https://docs.nestjs.com/faq/hybrid-application)

### Similar Projects
- [GOV.UK Notify API](https://github.com/alphagov/notifications-api) - Uses similar patterns
- [HMCTS Reform Projects](https://github.com/hmcts) - Check for NestJS usage

---

**Document Version:** 1.0  
**Prepared by:** Development Team  
**Review Date:** January 19, 2026  
**Status:** Awaiting Senior Team Review
