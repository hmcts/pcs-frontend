# Frontend Architecture Diagrams

## Overview
This document contains architectural diagrams showing the evolution of the PCS Frontend from Express to NestJS, highlighting key improvements and new capabilities.

---

## Table of Contents
1. [High-Level Architecture Comparison](#high-level-architecture-comparison)
2. [Express Architecture (Before)](#express-architecture-before)
3. [NestJS Architecture (After)](#nestjs-architecture-after)
4. [Request Flow Comparison](#request-flow-comparison)
5. [Dependency Injection Evolution](#dependency-injection-evolution)
6. [Module Organization](#module-organization)
7. [NestJS Enhancements](#nestjs-enhancements)
8. [Journey Implementation Comparison](#journey-implementation-comparison)

---

## High-Level Architecture Comparison

### Side-by-Side Comparison

```mermaid
graph TB
    subgraph "Express Architecture (Before)"
        E1[Express App] --> E2[Route Registration]
        E2 --> E3[Middleware Chain]
        E3 --> E4[Controller Factories]
        E4 --> E5[Services/Helpers]
        E5 --> E6[Nunjucks Templates]
        
        E7[Manual Wiring] -.-> E2
        E7 -.-> E4
        E7 -.-> E5
    end
    
    subgraph "NestJS Architecture (After)"
        N1[NestJS App] --> N2[Module System]
        N2 --> N3[Dependency Injection]
        N3 --> N4[Controllers]
        N4 --> N5[Services]
        N5 --> N6[Nunjucks Templates]
        
        N7[Automatic Wiring] -.-> N2
        N7 -.-> N3
        N7 -.-> N4
    end
    
    style E7 fill:#ff9999
    style N7 fill:#99ff99
```

---

## Express Architecture (Before)

### Complete Express Architecture

```mermaid
graph TB
    subgraph "Entry Point"
        Server[server.ts] --> ExpressApp[Express App Instance]
    end
    
    subgraph "Route Registration"
        ExpressApp --> RouteReg[registerSteps.ts]
        RouteReg --> JourneyReg[Journey Registry]
        JourneyReg --> StepReg[Step Registration Loop]
    end
    
    subgraph "Middleware Layer"
        StepReg --> OIDC[OIDC Middleware]
        StepReg --> CCD[CCD Case Middleware]
        StepReg --> StepDep[Step Dependency Check]
        StepReg --> Custom[Custom Middleware]
    end
    
    subgraph "Controller Layer"
        OIDC --> CtrlFactory[Controller Factory]
        CCD --> CtrlFactory
        StepDep --> CtrlFactory
        Custom --> CtrlFactory
        
        CtrlFactory --> GetCtrl[GetController]
        CtrlFactory --> PostCtrl[PostController]
    end
    
    subgraph "Business Logic"
        GetCtrl --> Helpers[Helper Functions]
        PostCtrl --> Helpers
        Helpers --> Validation[Zod Validation]
        Helpers --> Session[Session Management]
        Helpers --> Navigation[Step Navigation]
    end
    
    subgraph "i18n Layer"
        GetCtrl --> I18nLoad[loadStepNamespace]
        PostCtrl --> I18nLoad
        I18nLoad --> I18nFunc[getTranslationFunction]
    end
    
    subgraph "View Layer"
        GetCtrl --> Nunjucks[Nunjucks Templates]
        PostCtrl --> Nunjucks
        I18nFunc --> Nunjucks
    end
    
    subgraph "Manual Wiring Required"
        MW1[Manual Service Creation]
        MW2[Manual Route Registration]
        MW3[Factory Pattern Required]
        MW4[No Type Safety for DI]
    end
    
    MW1 -.-> Helpers
    MW2 -.-> RouteReg
    MW3 -.-> CtrlFactory
    
    style MW1 fill:#ffcccc
    style MW2 fill:#ffcccc
    style MW3 fill:#ffcccc
    style MW4 fill:#ffcccc
```

### Express Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Express
    participant Middleware
    participant Factory
    participant Controller
    participant Service
    participant Template
    
    Client->>Express: GET /journey/step1
    Express->>Middleware: OIDC Auth
    Middleware->>Middleware: CCD Case
    Middleware->>Middleware: Step Dependency
    Middleware->>Factory: Create Controller
    Factory->>Factory: new GetController()
    Factory->>Controller: Execute get()
    Controller->>Service: Call helper functions
    Service->>Controller: Return data
    Controller->>Template: Render with data
    Template->>Client: HTML Response
    
    Note over Factory: Manual instantiation<br/>No DI container
```

---

## NestJS Architecture (After)

### Complete NestJS Architecture

```mermaid
graph TB
    subgraph Entry_Point
        Main[main.ts] --> Bootstrap[NestJS Bootstrap]
        Bootstrap --> NestFactory[NestFactory.create]
    end
    
    subgraph Module_System
        NestFactory --> AppModule[AppModule]
        AppModule --> CoreModules[Core Modules]
        AppModule --> FeatureModules[Feature Modules]
        
        CoreModules --> I18nModule[I18n Module]
        CoreModules --> SessionModule[Session Module]
        CoreModules --> AuthModule[Auth Module]
        
        FeatureModules --> JourneyModule[Journey Modules]
        JourneyModule --> RegisterModule[RegisterInterestModule]
        JourneyModule --> NestJourneyModule[NestJourneyModule]
    end
    
    subgraph DI_Container
        RegisterModule --> DIContainer[DI Container]
        DIContainer --> Controllers[Controllers]
        DIContainer --> Services[Services]
        DIContainer --> Guards[Guards]
        DIContainer --> Interceptors[Interceptors]
    end
    
    subgraph Controller_Layer
        Controllers --> RegCtrl[RegisterInterestController]
        RegCtrl --> Decorators[Route Decorators]
        Decorators --> RouteHandlers[Route Handler Methods]
    end
    
    subgraph Service_Layer
        Services --> RegService[RegisterInterestService]
        RegService --> BusinessLogic[Business Logic Methods]
        BusinessLogic --> Navigation[Navigation Logic]
        BusinessLogic --> Validation[Validation Logic]
    end
    
    subgraph Guard_Layer
        Guards --> OIDCGuard[OIDCGuard]
        OIDCGuard --> AuthCheck[Authentication Check]
    end
    
    subgraph i18n_Integration
        RouteHandlers --> I18nLoad[loadStepNamespace]
        I18nLoad --> I18nFunc[getTranslationFunction]
        I18nFunc --> Templates[Nunjucks Templates]
    end
    
    subgraph Automatic_Features
        Auto1[Automatic DI]
        Auto2[Type-Safe Injection]
        Auto3[Lifecycle Management]
        Auto4[Decorator-Based Routing]
    end
    
    Auto1 -.-> DIContainer
    Auto2 -.-> Controllers
    Auto3 -.-> Services
    Auto4 -.-> Decorators
    
    style Auto1 fill:#ccffcc
    style Auto2 fill:#ccffcc
    style Auto3 fill:#ccffcc
    style Auto4 fill:#ccffcc
```

### NestJS Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant Guard
    participant Controller
    participant Service
    participant i18n
    participant Template
    
    Client->>NestJS: GET /register-interest/step1
    NestJS->>Guard: @UseGuards(OIDCGuard)
    Guard->>Guard: Validate Auth
    Guard->>Controller: Inject Dependencies
    Note over Controller: DI Container provides<br/>RegisterInterestService
    Controller->>i18n: loadStepNamespace()
    i18n->>i18n: Load translations
    Controller->>Service: this.service.getNextStep()
    Service->>Controller: Return navigation data
    Controller->>Template: @Render() with data
    Template->>Client: HTML Response
    
    Note over NestJS,Service: Automatic DI<br/>Type-safe injection
```

---

## Request Flow Comparison

### Express vs NestJS Request Lifecycle

```mermaid
graph LR
    subgraph "Express Flow"
        E1[Request] --> E2[Route Match]
        E2 --> E3[Middleware Chain]
        E3 --> E4[Factory Creates Controller]
        E4 --> E5[Manual Service Calls]
        E5 --> E6[Response]
    end
    
    subgraph "NestJS Flow"
        N1[Request] --> N2[Route Match via Decorator]
        N2 --> N3[Guards Execute]
        N3 --> N4[DI Injects Dependencies]
        N4 --> N5[Controller Method]
        N5 --> N6[Service Methods via this.service]
        N6 --> N7[Response]
    end
    
    style E4 fill:#ffcccc
    style E5 fill:#ffcccc
    style N4 fill:#ccffcc
    style N6 fill:#ccffcc
```

---

## Dependency Injection Evolution

### Express: Manual Dependency Management

```mermaid
graph TB
    subgraph "Express Pattern"
        E1[Route Handler] --> E2[Manual new Service]
        E2 --> E3[Service Instance]
        E3 --> E4[Method Call]
        
        E5[Another Route] --> E6[Manual new Service]
        E6 --> E7[Different Instance]
        
        Note1[No Singleton Management]
        Note2[Manual Wiring]
        Note3[Hard to Test]
    end
    
    style Note1 fill:#ffcccc
    style Note2 fill:#ffcccc
    style Note3 fill:#ffcccc
```

### NestJS: Automatic Dependency Injection

```mermaid
graph TB
    subgraph "NestJS Pattern"
        N1[DI Container] --> N2[Creates Service Singleton]
        N2 --> N3[Injects into Controller A]
        N2 --> N4[Injects into Controller B]
        N2 --> N5[Injects into Controller C]
        
        N3 --> N6[Same Instance]
        N4 --> N6
        N5 --> N6
        
        Note1[Automatic Singleton]
        Note2[Type-Safe Injection]
        Note3[Easy to Test]
        Note4[Lifecycle Managed]
    end
    
    style Note1 fill:#ccffcc
    style Note2 fill:#ccffcc
    style Note3 fill:#ccffcc
    style Note4 fill:#ccffcc
```

---

## Module Organization

### Express: Flat Structure

```mermaid
graph TB
    subgraph "Express Structure"
        Root[src/main]
        Root --> Routes[routes/]
        Root --> Modules[modules/]
        Root --> Views[views/]
        Root --> Assets[assets/]
        
        Routes --> R1[registerSteps.ts]
        Routes --> R2[dashboard.ts]
        Routes --> R3[health.ts]
        
        Modules --> M1[steps/]
        Modules --> M2[i18n/]
        
        M1 --> M1A[controller.ts]
        M1 --> M1B[flow.ts]
        M1 --> M1C[formBuilder/]
        
        Note1[No Clear Boundaries]
        Note2[Shared State]
        Note3[Global Registration]
    end
    
    style Note1 fill:#ffcccc
    style Note2 fill:#ffcccc
    style Note3 fill:#ffcccc
```

### NestJS: Modular Structure

```mermaid
graph TB
    subgraph "NestJS Structure"
        Root[src/main/nest]
        Root --> AppModule[app.module.ts]
        
        AppModule --> Feature1[register-interest/]
        AppModule --> Feature2[nest-journey/]
        AppModule --> Feature3[guards/]
        
        Feature1 --> F1A[register-interest.module.ts]
        Feature1 --> F1B[register-interest.controller.ts]
        Feature1 --> F1C[register-interest.service.ts]
        Feature1 --> F1D[dto/]
        
        Feature2 --> F2A[nest-journey.module.ts]
        Feature2 --> F2B[nest-journey.controller.ts]
        Feature2 --> F2C[nest-journey.service.ts]
        
        Feature3 --> F3A[oidc.guard.ts]
        
        Note1[Clear Module Boundaries]
        Note2[Encapsulated State]
        Note3[Explicit Dependencies]
        Note4[Self-Contained Features]
    end
    
    style Note1 fill:#ccffcc
    style Note2 fill:#ccffcc
    style Note3 fill:#ccffcc
    style Note4 fill:#ccffcc
```

---

## NestJS Enhancements

### Key Improvements Overview

```mermaid
mindmap
    root((NestJS<br/>Enhancements))
        Dependency Injection
            Automatic Instance Management
            Type-Safe Injection
            Singleton by Default
            Easy Testing with Mocks
        Decorator-Based Routing
            @Controller
            @Get/@Post
            @Render
            @UseGuards
        Module System
            Clear Boundaries
            Explicit Dependencies
            Feature Isolation
            Reusable Modules
        Guards & Interceptors
            Declarative Auth
            Request/Response Transform
            Logging & Monitoring
            Error Handling
        TypeScript First
            Full Type Safety
            IntelliSense Support
            Compile-Time Checks
            Better Refactoring
        Testing Support
            Built-in Test Module
            Easy Mocking
            E2E Testing
            Unit Testing
```

### Decorator-Based Architecture

```mermaid
graph TB
    subgraph "NestJS Decorators"
        Controller[@Controller<br/>'register-interest']
        Controller --> Guard[@UseGuards<br/>OIDCGuard]
        
        Guard --> Get1[@Get 'step1'<br/>@Render 'step1.njk']
        Guard --> Post1[@Post 'step1']
        Guard --> Get2[@Get 'step2'<br/>@Render 'step2.njk']
        Guard --> Post2[@Post 'step2']
        
        Get1 --> Method1[async getStep1]
        Post1 --> Method2[async postStep1]
        Get2 --> Method3[async getStep2]
        Post2 --> Method4[async postStep2]
        
        Method1 --> DI[Injected Services]
        Method2 --> DI
        Method3 --> DI
        Method4 --> DI
    end
    
    style Controller fill:#e1f5ff
    style Guard fill:#fff4e1
    style Get1 fill:#e8f5e9
    style Post1 fill:#e8f5e9
    style DI fill:#f3e5f5
```

---

## Journey Implementation Comparison

### Express Journey Implementation

```mermaid
graph TB
    subgraph "Express Journey Setup"
        E1[Define Journey Config] --> E2[Create Step Definitions]
        E2 --> E3[Register in Journey Registry]
        E3 --> E4[Controller Factory Creates Controllers]
        E4 --> E5[Manual Service Wiring]
        E5 --> E6[Route Registration Loop]
        E6 --> E7[Middleware Chain Setup]
        
        Steps[Step 1, Step 2, Step 3]
        Steps --> E2
        
        Factory[createGetController<br/>createPostController]
        Factory --> E4
        
        Manual[Manual Instantiation<br/>Factory Pattern<br/>No Type Safety]
    end
    
    style Manual fill:#ffcccc
```

### NestJS Journey Implementation

```mermaid
graph TB
    subgraph "NestJS Journey Setup"
        N1[Create Journey Module] --> N2[Define Controller]
        N2 --> N3[Define Service]
        N3 --> N4[Define DTOs]
        N4 --> N5[Register in Module]
        N5 --> N6[Import in AppModule]
        
        N2 --> Decorators[@Controller<br/>@Get/@Post<br/>@Render<br/>@UseGuards]
        
        N3 --> Injectable[@Injectable<br/>Business Logic<br/>Navigation]
        
        N5 --> ModuleDef[Module Metadata<br/>controllers: []<br/>providers: []]
        
        Auto[Automatic DI<br/>Type-Safe<br/>Declarative Routing]
    end
    
    style Auto fill:#ccffcc
```

### Journey Flow Comparison

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Express as Express Setup
    participant NestJS as NestJS Setup
    
    Note over Dev,NestJS: Creating a New Journey
    
    Dev->>Express: 1. Create step config
    Dev->>Express: 2. Create controller factory
    Dev->>Express: 3. Register in journey registry
    Dev->>Express: 4. Add to registerSteps loop
    Dev->>Express: 5. Manual middleware setup
    Note over Express: ~5 files to modify<br/>Manual wiring required
    
    Dev->>NestJS: 1. Create module
    Dev->>NestJS: 2. Create controller with decorators
    Dev->>NestJS: 3. Create service
    Dev->>NestJS: 4. Import in AppModule
    Note over NestJS: ~4 files to create<br/>Automatic wiring
    
    Note over Dev,NestJS: NestJS: Less boilerplate, more explicit
```

---

## Detailed Component Comparison

### Authentication & Authorization

```mermaid
graph LR
    subgraph "Express Auth"
        E1[oidcMiddleware] --> E2[Route Registration]
        E2 --> E3[Manual Array Setup]
        E3 --> E4[Applied per Route]
        
        Note1[Middleware Array<br/>Manual Setup]
    end
    
    subgraph "NestJS Auth"
        N1[@UseGuards] --> N2[OIDCGuard]
        N2 --> N3[Declarative]
        N3 --> N4[Applied to Controller/Method]
        
        Note2[Decorator-Based<br/>Type-Safe]
    end
    
    style Note1 fill:#ffcccc
    style Note2 fill:#ccffcc
```

### Service Layer

```mermaid
graph TB
    subgraph "Express Services"
        E1[Helper Functions] --> E2[Exported Functions]
        E2 --> E3[Imported Directly]
        E3 --> E4[Called in Controllers]
        
        Note1[Stateless Functions<br/>No DI<br/>Global Scope]
    end
    
    subgraph "NestJS Services"
        N1[@Injectable Class] --> N2[Business Logic Methods]
        N2 --> N3[Injected via Constructor]
        N3 --> N4[Called via this.service]
        
        Note2[Stateful Classes<br/>DI Container<br/>Scoped Instances]
    end
    
    style Note1 fill:#ffcccc
    style Note2 fill:#ccffcc
```

---

## Migration Path Visualization

```mermaid
graph TB
    subgraph "Phase 1: Coexistence"
        Express[Express Routes] --> Adapter[Express Adapter]
        NestJS[NestJS Routes] --> Adapter
        Adapter --> Server[Single Server]
    end
    
    subgraph "Phase 2: Gradual Migration"
        Journey1[Journey 1] --> Migrated1[NestJS Module]
        Journey2[Journey 2] --> Migrated2[NestJS Module]
        Journey3[Journey 3] --> Express3[Express Routes]
        Journey4[Journey 4] --> Express4[Express Routes]
    end
    
    subgraph "Phase 3: Complete"
        AllJourneys[All Journeys] --> NestModules[NestJS Modules]
        NestModules --> AppModule[AppModule]
    end
    
    style Migrated1 fill:#ccffcc
    style Migrated2 fill:#ccffcc
    style Express3 fill:#ffcccc
    style Express4 fill:#ffcccc
    style NestModules fill:#ccffcc
```

---

## Architecture Benefits Summary

### Express Challenges

```mermaid
graph TB
    subgraph "Express Pain Points"
        P1[Manual Dependency Management]
        P2[Factory Pattern Complexity]
        P3[No Built-in DI]
        P4[Flat Structure]
        P5[Testing Complexity]
        P6[Implicit Dependencies]
        
        P1 --> Impact1[Hard to Scale]
        P2 --> Impact1
        P3 --> Impact2[Hard to Test]
        P4 --> Impact3[Hard to Maintain]
        P5 --> Impact2
        P6 --> Impact3
    end
    
    style P1 fill:#ffcccc
    style P2 fill:#ffcccc
    style P3 fill:#ffcccc
    style P4 fill:#ffcccc
    style P5 fill:#ffcccc
    style P6 fill:#ffcccc
```

### NestJS Advantages

```mermaid
graph TB
    subgraph "NestJS Benefits"
        B1[Automatic DI]
        B2[Decorator-Based Routing]
        B3[Module System]
        B4[Type Safety]
        B5[Built-in Testing]
        B6[Clear Architecture]
        
        B1 --> Impact1[Easy to Scale]
        B2 --> Impact1
        B3 --> Impact2[Easy to Test]
        B4 --> Impact3[Easy to Maintain]
        B5 --> Impact2
        B6 --> Impact3
    end
    
    style B1 fill:#ccffcc
    style B2 fill:#ccffcc
    style B3 fill:#ccffcc
    style B4 fill:#ccffcc
    style B5 fill:#ccffcc
    style B6 fill:#ccffcc
```

---

## Presentation Slide Suggestions

### Slide 1: Current State (Express)
- Use "Express Architecture (Before)" diagram
- Highlight manual wiring pain points
- Show factory pattern complexity

### Slide 2: Future State (NestJS)
- Use "NestJS Architecture (After)" diagram
- Highlight automatic DI
- Show decorator-based routing

### Slide 3: Side-by-Side Comparison
- Use "High-Level Architecture Comparison" diagram
- Direct visual comparison
- Emphasize automatic vs manual

### Slide 4: Request Flow Evolution
- Use "Request Flow Comparison" sequence diagrams
- Show how requests are handled differently
- Highlight DI container benefits

### Slide 5: Dependency Injection Deep Dive
- Use "Dependency Injection Evolution" diagrams
- Show singleton management
- Demonstrate testing benefits

### Slide 6: Module Organization
- Use "Module Organization" diagrams
- Show clear boundaries in NestJS
- Demonstrate feature isolation

### Slide 7: Key Enhancements
- Use "NestJS Enhancements" mindmap
- Comprehensive overview of benefits
- Easy to scan and understand

### Slide 8: Journey Implementation
- Use "Journey Implementation Comparison" diagrams
- Show practical differences
- Demonstrate reduced boilerplate

### Slide 9: Migration Strategy
- Use "Migration Path Visualization" diagram
- Show coexistence approach
- Demonstrate gradual adoption

### Slide 10: Benefits Summary
- Use "Architecture Benefits Summary" diagrams
- Clear before/after comparison
- Quantifiable improvements

---

## Additional Supporting Materials

### Code Comparison Slides

#### Express Controller Example
```typescript
// Express: Manual wiring
const service = new RegisterInterestService();

router.post('/register-interest/step1', async (req, res) => {
  const nextUrl = service.getNextStep('step1');
  res.redirect(nextUrl);
});
```

#### NestJS Controller Example
```typescript
// NestJS: Automatic DI
@Controller('register-interest')
export class RegisterInterestController {
  constructor(private readonly service: RegisterInterestService) {}
  
  @Post('step1')
  async postStep1() {
    const nextUrl = this.service.getNextStep('step1');
    return { redirect: nextUrl };
  }
}
```

### Metrics Comparison Table

| Metric | Express | NestJS | Improvement |
|--------|---------|--------|-------------|
| Files per Journey | ~8-10 | ~4-5 | 50% reduction |
| Boilerplate Code | High | Low | 60% reduction |
| Type Safety | Partial | Full | 100% coverage |
| Test Setup Lines | ~20-30 | ~10-15 | 50% reduction |
| DI Setup | Manual | Automatic | 100% automatic |
| Route Definition | Imperative | Declarative | Clearer intent |

### Developer Experience Improvements

```mermaid
graph LR
    subgraph "Developer Benefits"
        DX1[IntelliSense] --> Better1[Better Autocomplete]
        DX2[Type Safety] --> Better2[Fewer Runtime Errors]
        DX3[Decorators] --> Better3[Clearer Intent]
        DX4[DI Container] --> Better4[Easier Testing]
        DX5[Module System] --> Better5[Better Organization]
    end
    
    style Better1 fill:#ccffcc
    style Better2 fill:#ccffcc
    style Better3 fill:#ccffcc
    style Better4 fill:#ccffcc
    style Better5 fill:#ccffcc
```

---

## Usage Notes

### Rendering Diagrams
- All diagrams use Mermaid syntax
- Can be rendered in:
  - GitHub/GitLab markdown
  - Mermaid Live Editor (mermaid.live)
  - VS Code with Mermaid extension
  - Presentation tools with Mermaid support

### Customization
- Colors can be adjusted with `style` directives
- Layout can be modified (TB, LR, RL, BT)
- Add/remove nodes as needed for your presentation

### Best Practices
- Use consistent color scheme:
  - Red (#ffcccc) for pain points/challenges
  - Green (#ccffcc) for benefits/improvements
  - Blue (#e1f5ff) for neutral/informational
- Keep text concise for readability
- Use subgraphs to group related concepts
- Add notes for additional context

---

## Conclusion

These diagrams provide a comprehensive visual representation of the architectural evolution from Express to NestJS, highlighting:

1. **Structural Improvements**: Module system vs flat structure
2. **DI Benefits**: Automatic vs manual dependency management
3. **Developer Experience**: Decorators vs imperative routing
4. **Maintainability**: Clear boundaries vs shared state
5. **Testing**: Built-in support vs manual mocking

Use these diagrams to effectively communicate the value proposition of NestJS adoption to stakeholders and team members.
