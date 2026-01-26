# Upgrade Guide: NestJS and GOV.UK Frontend

## Overview

This guide provides step-by-step instructions for upgrading NestJS and GOV.UK Frontend packages, ensuring minimal disruption and maintaining compatibility.

---

## GOV.UK Frontend Upgrades

### Pre-Upgrade Checklist

- [ ] Read the [GOV.UK Frontend changelog](https://github.com/alphagov/govuk-frontend/releases)
- [ ] Check for breaking changes
- [ ] Review deprecated features
- [ ] Ensure tests are passing before upgrade
- [ ] Create a branch for the upgrade

### Upgrade Steps

#### 1. Check Current Version

```bash
npm list govuk-frontend
# or
yarn list govuk-frontend
```

#### 2. Review Release Notes

Visit: https://github.com/alphagov/govuk-frontend/releases

**Key things to check:**
- Breaking changes (major versions)
- Deprecated features
- New components or features
- Sass API changes
- JavaScript API changes

#### 3. Update Package

```bash
# Update to latest version
npm update govuk-frontend

# Or specific version
npm install govuk-frontend@5.14.0

# With yarn
yarn add govuk-frontend@5.14.0
```

#### 4. Rebuild Assets

```bash
npm run build
# or
yarn build
```

#### 5. Check for Sass Deprecations

Look for warnings during build:

```
Sass @import rules are deprecated...
```

**Common Sass changes between versions:**

| Version | Change | Action Required |
|---------|--------|-----------------|
| v5.0 | `@import` → `@use` | Update imports (future) |
| v5.0 | New colour palette | Check custom colours |
| v4.0 → v5.0 | Component markup changes | Update templates |

#### 6. Update Templates

If component markup has changed:

```bash
# Check which components are used
grep -r "govuk-" src/main/views/ --include="*.njk" | grep -oP 'govuk-[a-z-]+' | sort -u
```

Compare with [GOV.UK Frontend component examples](https://design-system.service.gov.uk/components/).

#### 7. Run Tests

```bash
# Unit tests
npm test

# Accessibility tests
npm run test:a11y

# GOV.UK Frontend fixture tests
npm run test -- --testPathPattern=govuk
```

#### 8. Visual Regression Check

Manually check key pages for visual changes:
- [ ] Homepage
- [ ] Form pages (inputs, radios, checkboxes)
- [ ] Error states
- [ ] Confirmation pages

### Rollback Procedure

If issues are found:

```bash
# Revert to previous version
npm install govuk-frontend@5.13.0

# Rebuild
npm run build

# Verify
npm test
```

---

## NestJS Upgrades

### Pre-Upgrade Checklist

- [ ] Read the [NestJS migration guide](https://docs.nestjs.com/migration-guide)
- [ ] Check compatibility with Node.js version
- [ ] Review breaking changes
- [ ] Ensure tests are passing before upgrade
- [ ] Create a branch for the upgrade

### NestJS Package Dependencies

The following packages should be upgraded together:

| Package | Purpose |
|---------|---------|
| `@nestjs/core` | Core framework |
| `@nestjs/common` | Common utilities |
| `@nestjs/platform-express` | Express adapter |
| `@nestjs/testing` | Testing utilities |

### Upgrade Steps

#### 1. Check Current Versions

```bash
npm list @nestjs/core @nestjs/common @nestjs/platform-express
```

#### 2. Review Migration Guide

Visit: https://docs.nestjs.com/migration-guide

**Key things to check:**
- Node.js version requirements
- TypeScript version requirements
- Breaking API changes
- Deprecated features

#### 3. Update All NestJS Packages Together

```bash
# Update all NestJS packages to same version
npm install @nestjs/core@latest @nestjs/common@latest @nestjs/platform-express@latest @nestjs/testing@latest

# Or specific version
npm install @nestjs/core@10.4.0 @nestjs/common@10.4.0 @nestjs/platform-express@10.4.0 @nestjs/testing@10.4.0
```

#### 4. Update Related Dependencies

```bash
# Update reflect-metadata if needed
npm install reflect-metadata@latest

# Update rxjs if needed
npm install rxjs@latest
```

#### 5. Check TypeScript Compatibility

```bash
# Check TypeScript version
npx tsc --version

# Update if needed (check NestJS requirements)
npm install typescript@5.x
```

#### 6. Update tsconfig.json if Required

NestJS may require specific TypeScript settings:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### 7. Run Tests

```bash
# TypeScript compilation
npx tsc --noEmit

# Unit tests
npm test

# NestJS-specific tests
npm test -- --testPathPattern=nest
```

#### 8. Test Application Startup

```bash
npm run dev

# Check for:
# - NestJS bootstrap messages
# - No deprecation warnings
# - All routes registered
```

### Common Breaking Changes

#### v9 → v10

| Change | Action |
|--------|--------|
| Node.js 16+ required | Update Node.js |
| `@nestjs/mapped-types` changes | Update DTOs |
| Fastify v4 support | Check if using Fastify |

#### v8 → v9

| Change | Action |
|--------|--------|
| Node.js 14+ required | Update Node.js |
| `ValidationPipe` changes | Review validation |
| `ConfigModule` changes | Check config usage |

### Rollback Procedure

```bash
# Revert to previous versions
npm install @nestjs/core@10.3.0 @nestjs/common@10.3.0 @nestjs/platform-express@10.3.0 @nestjs/testing@10.3.0

# Clear build cache
rm -rf dist/

# Rebuild
npm run build

# Verify
npm test
```

---

## Version Compatibility Matrix

| NestJS | Node.js | TypeScript | Express |
|--------|---------|------------|---------|
| 10.x | 16.x - 22.x | 4.7 - 5.x | 4.x - 5.x |
| 9.x | 14.x - 20.x | 4.3 - 5.x | 4.x |
| 8.x | 12.x - 18.x | 4.0 - 4.9 | 4.x |

| GOV.UK Frontend | Node.js | Sass |
|-----------------|---------|------|
| 5.x | 18.x+ | Dart Sass 1.x |
| 4.x | 14.x+ | Dart Sass 1.x |
| 3.x | 12.x+ | Node Sass / Dart Sass |

---

## Automated Dependency Updates

### Renovate Configuration

Create `.github/renovate.json`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchPackagePatterns": ["^@nestjs/"],
      "groupName": "NestJS packages",
      "groupSlug": "nestjs"
    },
    {
      "matchPackageNames": ["govuk-frontend"],
      "groupName": "GOV.UK Frontend",
      "automerge": false
    }
  ],
  "schedule": ["before 9am on monday"]
}
```

### Dependabot Configuration

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      nestjs:
        patterns:
          - "@nestjs/*"
      govuk:
        patterns:
          - "govuk-frontend"
    commit-message:
      prefix: "deps"
```

---

## Testing After Upgrades

### Smoke Test Checklist

- [ ] Application starts without errors
- [ ] NestJS routes respond correctly
- [ ] Express routes still work
- [ ] Authentication works
- [ ] Forms submit correctly
- [ ] Error handling works
- [ ] Styles render correctly
- [ ] JavaScript components initialise

### Automated Test Commands

```bash
# Full test suite
npm test

# TypeScript compilation
npx tsc --noEmit

# Lint check
npm run lint

# Build check
npm run build

# Accessibility tests
npm run test:a11y
```

---

## Troubleshooting

### NestJS Issues

**Error: Cannot find module '@nestjs/core'**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Error: Reflect.getMetadata is not a function**
```bash
npm install reflect-metadata
# Ensure import at top of main.ts:
# import 'reflect-metadata';
```

### GOV.UK Frontend Issues

**Error: Can't find stylesheet to import**
```bash
# Check node_modules path
ls node_modules/govuk-frontend/dist/govuk/

# Rebuild
npm run build
```

**Fonts not loading**
```bash
# Check assets are copied
ls src/main/public/assets/fonts/
```

---

## Resources

### NestJS
- [NestJS Documentation](https://docs.nestjs.com/)
- [NestJS GitHub Releases](https://github.com/nestjs/nest/releases)
- [NestJS Migration Guide](https://docs.nestjs.com/migration-guide)

### GOV.UK Frontend
- [GOV.UK Frontend Documentation](https://frontend.design-system.service.gov.uk/)
- [GOV.UK Frontend Releases](https://github.com/alphagov/govuk-frontend/releases)
- [GOV.UK Frontend Changelog](https://github.com/alphagov/govuk-frontend/blob/main/CHANGELOG.md)
