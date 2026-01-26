# NestJS Spike Gap Analysis

## Comparison: Original Ticket (HDPI-3810) vs MH Specifications

This document compares what was delivered in the original spike ticket against the expanded MH specifications to identify gaps and opportunities for enhancement.

---

## Original Ticket (HDPI-3810) Deliverables

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| **1.1** NestJS with Express adapter | ✅ Complete | `src/main/nest/index.ts` |
| **1.2** Local dev instructions | ✅ Complete | `docs/NESTJS_SPIKE_RESULTS.md` |
| **1.3** Baseline structure + guard rails | ✅ Complete | Module/controller/service pattern |
| **2.1** AppModule + feature modules | ✅ Complete | `app.module.ts`, feature modules |
| **2.2** Controllers/services pattern | ✅ Complete | All feature modules |
| **2.3** Centralised config | ✅ Complete | Using existing `config` package |
| **2.4** Error handling + validation | ✅ Complete | Zod schemas + NestJS exceptions |
| **2.5** Express interoperability | ✅ Complete | Shared session, auth, templates |
| **2.6** Working vertical slice | ✅ Complete | Postcode API + Journey |
| **3.1** Endpoint migrated | ✅ Complete | `/api/postcode-lookup-nest` |
| **3.2** Request validation | ✅ Complete | Zod DTOs on all endpoints |
| **3.3** Testing + quality gates | ✅ Complete | 41+ tests |
| **4.1** How to run | ✅ Complete | Documentation complete |
| **4.2** How to add endpoint | ✅ Complete | Step-by-step guide |
| **4.3** Migration guidance | ✅ Complete | Incremental strategy documented |

**Original Ticket Status: ✅ ALL DELIVERABLES COMPLETE**

---

## MH Specifications - Must Haves Analysis

### 1. HTML First and Progressive Enhancement

| Requirement | Status | Notes |
|-------------|--------|-------|
| Server rendered HTML as primary contract | ✅ Addressed | NestJS journey uses Nunjucks templates |
| JS enhances, never replaces core journeys | ✅ Addressed | All forms work without JS |
| Critical flows work without JavaScript | ✅ Addressed | Standard form submissions |

### 2. GOV.UK Frontend Integration

| Requirement | Status | Notes |
|-------------|--------|-------|
| Use GOV.UK Frontend latest version | ✅ Addressed | Using installed version |
| Compile from Sass (not dist) | ⚠️ Partial | Currently using existing webpack setup |
| Investigate JS compilation for browser | ❌ Not Addressed | Not investigated |

### 3. Architecture & Technology Stack

| Requirement | Status | Notes |
|-------------|--------|-------|
| NestJS as abstraction layer above Express | ✅ Complete | Core deliverable |
| 100% TypeScript | ✅ Complete | All NestJS code is TypeScript |
| Leverage native language support | ✅ Addressed | Using existing i18n with Welsh translations |

### 4. Testing & Quality Assurance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Parity tests against GOV.UK Frontend fixtures | ✅ Addressed | `GOVUK_FRONTEND_TESTING.md` |
| Automated accessibility checks (axe, pa11y) | ❌ Not Addressed | Not implemented |
| Manual testing requirements documented | ❌ Not Addressed | No keyboard/screen reader docs |

### 5. Documentation & Maintenance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Upgrade documentation for NestJS/GOV.UK | ⚠️ Partial | Migration guide exists, upgrade guide missing |

---

## MH Specifications - Nice to Haves Analysis

### 1. Build & Dependency Management

| Requirement | Status | Notes |
|-------------|--------|-------|
| Reproducible builds & lockfile enforcement | ❌ Not Addressed | Not in scope of spike |
| Renovatebot & Dependabot | ❌ Not Addressed | CI/CD configuration |
| Fortify + security scans | ❌ Not Addressed | CI/CD configuration |

### 2. Development Experience

| Requirement | Status | Notes |
|-------------|--------|-------|
| Dotfiles best practices | ⚠️ Existing | Already has `.eslintrc`, `.prettierrc`, etc. |
| Live reload for frontend | ✅ Existing | Webpack dev server already configured |

### 3. Performance & Security Best Practices

| Requirement | Status | Notes |
|-------------|--------|-------|
| Asset caching on CDN | ❌ Not Addressed | Infrastructure concern |
| Brotli compression | ❌ Not Addressed | Build/infrastructure |
| Asset minification | ✅ Existing | Webpack already minifies |
| CSP headers | ❌ Not Addressed | Security configuration |
| Threat model | ❌ Not Addressed | Security documentation |
| Secure session cookies | ⚠️ Existing | Already configured in Express |
| Third-party JS governance | ❌ Not Addressed | Policy documentation |
| HTTP/2 or HTTP/3 | ❌ Not Addressed | Infrastructure concern |

---

## Summary: Items Addressed vs Missing

### ✅ Fully Addressed (26 items)

**Original Ticket Deliverables (19 items):**
1. NestJS bootstrapped over Express
2. Local dev run instructions
3. Baseline structure + guard rails
4. AppModule + feature modules
5. Controllers/services pattern
6. Centralised configuration
7. Error handling + validation (Zod)
8. Express interoperability
9. Working vertical slices (2)
10. Request validation
11. Testing + quality gates
12. How to run documentation
13. How to add endpoint guide
14. Migration guidance
15. Server-rendered HTML
16. JS progressive enhancement
17. 100% TypeScript
18. i18n/language support
19. GOV.UK Frontend fixture testing

**Additional Work Completed (7 items):**
20. **GOV.UK Frontend JS compilation investigation** ✅ - `GOVUK_FRONTEND_JS_COMPILATION.md`
21. **Automated accessibility checks (axe)** ✅ - `nest-journey.a11y.spec.ts`
22. **Automated accessibility checks (pa11y)** ✅ - `pa11y.config.js`
23. **Manual testing requirements** ✅ - `MANUAL_ACCESSIBILITY_TESTING_CHECKLIST.md`
24. **Upgrade guide for NestJS** ✅ - `NESTJS_UPGRADE_GUIDE.md`
25. **Upgrade guide for GOV.UK Frontend** ✅ - `GOVUK_FRONTEND_UPGRADE_GUIDE.md`
26. **Sass compilation documentation** ✅ - `SASS_COMPILATION_SETUP.md`

### ⚠️ Partially Addressed (1 item)

1. **Dotfiles** - Already exist (`.eslintrc`, `.prettierrc`, etc.), not enhanced

### ❌ Not Addressed - Nice to Haves (9 items)

1. Reproducible builds & lockfile enforcement
2. Renovatebot & Dependabot
3. Security scans (Fortify)
4. Asset caching on CDN
5. Brotli compression
6. CSP headers
7. Threat model documentation
8. Third-party JS governance policy
9. HTTP/2 or HTTP/3

---

## Completed Work Summary

### Priority 1: Must Haves ✅ ALL COMPLETE

| Item | Status | Effort | Documentation |
|------|--------|--------|---------------|
| GOV.UK Frontend JS investigation | ✅ Complete | 2-3 hours | `GOVUK_FRONTEND_JS_COMPILATION.md` |
| Automated accessibility (axe/pa11y) | ✅ Complete | 3-4 hours | `nest-journey.a11y.spec.ts`, `pa11y.config.js` |
| Manual testing documentation | ✅ Complete | 1-2 hours | `MANUAL_ACCESSIBILITY_TESTING_CHECKLIST.md` |

**Total Effort:** ~7 hours

### Priority 2: Documentation Gaps ✅ ALL COMPLETE

| Item | Status | Effort | Documentation |
|------|--------|--------|---------------|
| Upgrade guide for NestJS | ✅ Complete | 1 hour | `NESTJS_UPGRADE_GUIDE.md` |
| Upgrade guide for GOV.UK Frontend | ✅ Complete | 1 hour | `GOVUK_FRONTEND_UPGRADE_GUIDE.md` |
| Sass compilation documentation | ✅ Complete | 30 mins | `SASS_COMPILATION_SETUP.md` |

**Total Effort:** ~2.5 hours

### Priority 3: Nice to Haves (Future Work)

| Item | Owner | Status | Notes |
|------|-------|--------|-------|
| Reproducible builds & lockfile enforcement | DevOps | ❌ Not Started | CI/CD configuration |
| Renovatebot & Dependabot | DevOps | ❌ Not Started | CI/CD configuration |
| Security scans | Security team | ❌ Not Started | Pipeline integration |
| Asset caching on CDN | Infrastructure | ❌ Not Started | Azure Front Door config |
| Brotli compression | Infrastructure | ❌ Not Started | Build/infrastructure |
| CSP headers | Security team | ❌ Not Started | Policy definition |
| Threat model | Security team | ❌ Not Started | Requires security review |
| Third-party JS governance | Security team | ❌ Not Started | Policy documentation |
| HTTP/2 or HTTP/3 | Infrastructure | ❌ Not Started | Infrastructure concern |

---

## Implementation Details

### GOV.UK Frontend JS Compilation Documentation

**File:** `docs/GOVUK_FRONTEND_JS_COMPILATION.md`

**Covers:**
- Webpack 5 configuration
- GOV.UK Frontend JavaScript integration
- TypeScript compilation
- JavaScript bundling process
- SCSS compilation
- Asset copying (fonts, images, templates)
- Template injection
- Component initialization
- Browser compatibility
- Performance optimizations

**Scope:** General frontend (not NestJS-specific)

---

### Automated Accessibility Testing

**Playwright + axe-core Tests:**
- **File:** `src/test/ui/accessibility/nest-journey.a11y.spec.ts`
- **Coverage:** All NestJS journey pages, validation errors, keyboard navigation, focus management
- **WCAG Level:** 2.1 Level AA
- **Run:** `yarn test:accessibility`

**pa11y-ci Configuration:**
- **File:** `pa11y.config.js`
- **Coverage:** Home, dashboard, all journey steps with navigation actions
- **Run:** `yarn test:a11y`

**Package Updates:**
- Added `jest-axe@^9.0.0`
- Added `pa11y-ci@^3.1.0`
- Updated `package.json` scripts

**Scope:** General frontend (not NestJS-specific)

---

### Manual Accessibility Testing Documentation

**File:** `docs/MANUAL_ACCESSIBILITY_TESTING_CHECKLIST.md`

**Covers:**
- Keyboard navigation testing (comprehensive checklist)
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Zoom and text resize testing
- Colour and contrast testing
- Motion and animation testing
- GOV.UK-specific component requirements
- Testing schedule (per PR, per sprint, per release)
- Issue reporting template
- Quick reference cards for screen readers

**Scope:** General frontend (not NestJS-specific)

---

### NestJS Upgrade Guide

**File:** `docs/NESTJS_UPGRADE_GUIDE.md`

**Covers:**
- Pre-upgrade checklist
- Step-by-step upgrade process (10 steps)
- Version-specific upgrade notes (v9→v10→v11)
- Troubleshooting common issues
- Rollback procedure
- Compatibility matrix
- Post-upgrade tasks

**Scope:** NestJS-specific

---

### GOV.UK Frontend Upgrade Guide

**File:** `docs/GOVUK_FRONTEND_UPGRADE_GUIDE.md`

**Covers:**
- Pre-upgrade checklist
- Step-by-step upgrade process (13 steps)
- Version-specific upgrade notes (v3→v4→v5)
- Sass and JavaScript API changes
- Component usage updates
- Accessibility testing after upgrade
- Troubleshooting guide
- Browser compatibility matrix
- Comprehensive testing checklist

**Scope:** General frontend (not NestJS-specific)

---

### Sass Compilation Setup Documentation

**File:** `docs/SASS_COMPILATION_SETUP.md`

**Covers:**
- Dart Sass configuration
- Webpack sass-loader setup
- Complete Sass processing pipeline
- GOV.UK Frontend Sass integration
- Variables and mixins usage
- Asset handling (fonts, images)
- Customization patterns
- Performance optimizations
- Troubleshooting guide

**Scope:** General frontend (not NestJS-specific)

---

## Categorization: NestJS-Specific vs General Frontend

### NestJS-Specific (1 item)
- NestJS Upgrade Guide

### General Frontend (6 items)
- GOV.UK Frontend JS Compilation Documentation
- Automated Accessibility Tests (axe + pa11y)
- Manual Accessibility Testing Checklist
- GOV.UK Frontend Upgrade Guide
- Sass Compilation Setup Documentation

**Note:** Most of the additional work completed represents general frontend best practices and GOV.UK Service Standard compliance requirements, not NestJS-specific implementation.

---

## Next Steps

### ✅ Completed
1. ~~Address the 3 missing Must Haves~~ - **COMPLETE**
2. ~~Complete documentation gaps~~ - **COMPLETE**

### 🔄 Ongoing
3. **Future Work**: Hand off Nice to Haves to appropriate teams (DevOps, Security, Infrastructure)

### 📋 Recommendations

**For DevOps Team:**
- Set up Renovatebot or Dependabot for automated dependency updates
- Configure security scanning (Fortify) in CI/CD pipeline
- Implement reproducible builds and lockfile enforcement

**For Security Team:**
- Define and implement CSP headers policy
- Create threat model documentation
- Establish third-party JavaScript governance policy

**For Infrastructure Team:**
- Configure CDN asset caching (Azure Front Door)
- Implement Brotli compression
- Evaluate HTTP/2 or HTTP/3 support

