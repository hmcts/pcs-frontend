# NestJS Upgrade Guide

## Overview

This guide provides step-by-step instructions for upgrading NestJS and related packages in the PCS Frontend application.

**Scope:** NestJS-specific upgrade process

---

## Current NestJS Version

As of this document:
- `@nestjs/common`: `^11.1.12`
- `@nestjs/core`: `^11.1.12`
- `@nestjs/platform-express`: `^11.1.12`
- `@nestjs/config`: `^4.0.2`
- `@nestjs/testing`: `^11.1.12` (dev)

**Location:** `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/package.json`

---

## Pre-Upgrade Checklist

Before upgrading NestJS, complete these steps:

- [ ] Review [NestJS Release Notes](https://github.com/nestjs/nest/releases)
- [ ] Check for breaking changes in target version
- [ ] Ensure all tests pass on current version
- [ ] Create a backup branch
- [ ] Review dependency compatibility
- [ ] Check TypeScript version compatibility
- [ ] Notify team of planned upgrade

---

## Upgrade Process

### Step 1: Check Current Version

```bash
# Check installed NestJS version
yarn list --pattern "@nestjs/*"

# Or check package.json
cat package.json | grep "@nestjs"
```

### Step 2: Review Breaking Changes

Visit the [NestJS Release Notes](https://github.com/nestjs/nest/releases) and review:

1. **Breaking changes** between your current version and target version
2. **Deprecation warnings** that may affect your code
3. **New features** that could improve your implementation
4. **Migration guides** provided by the NestJS team

**Common Breaking Changes to Watch For:**

- Changes to decorator syntax
- Module import/export changes
- Middleware signature changes
- Exception filter changes
- Guard/interceptor changes
- Dependency injection changes

### Step 3: Update Package Versions

Update all NestJS packages together to maintain compatibility:

```bash
# Update to latest version
yarn upgrade-interactive --latest

# Or manually update package.json
# Then run:
yarn install
```

**Recommended Approach:** Update all `@nestjs/*` packages to the same version.

```json
{
  "dependencies": {
    "@nestjs/common": "^11.x.x",
    "@nestjs/core": "^11.x.x",
    "@nestjs/platform-express": "^11.x.x",
    "@nestjs/config": "^4.x.x"
  },
  "devDependencies": {
    "@nestjs/testing": "^11.x.x"
  }
}
```

### Step 4: Update Related Dependencies

Check and update related dependencies that may need upgrading:

```bash
# Check for outdated packages
yarn outdated

# Update related packages
yarn upgrade reflect-metadata
yarn upgrade rxjs
yarn upgrade typescript
```

**Key Dependencies:**
- `reflect-metadata`: Required for decorators
- `rxjs`: Used by NestJS for observables
- `typescript`: Ensure compatibility with NestJS version

### Step 5: Run Build

```bash
# Clean build
rm -rf dist/
yarn build

# Check for TypeScript errors
yarn tsc --noEmit
```

**Common Build Issues:**

1. **Decorator errors**: Check decorator syntax hasn't changed
2. **Import errors**: Verify import paths are correct
3. **Type errors**: Update type definitions if needed

### Step 6: Update Code for Breaking Changes

Based on release notes, update your code:

#### Example: Decorator Changes

```typescript
// Before (hypothetical breaking change)
@Controller('api')
export class MyController {}

// After
@Controller({ path: 'api' })
export class MyController {}
```

#### Example: Module Changes

```typescript
// Before
@Module({
  imports: [ConfigModule.forRoot()],
})

// After
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
```

### Step 7: Run Tests

```bash
# Run unit tests
yarn test:unit

# Run specific NestJS tests
yarn test -- --testPathPattern=nest

# Run all tests
yarn test
```

**Test Files to Check:**
- `src/test/unit/nest/**/*.spec.ts`
- Integration tests that use NestJS modules
- E2E tests that hit NestJS endpoints

### Step 8: Run Application Locally

```bash
# Start development server
yarn start:dev

# Test NestJS endpoints
curl http://localhost:3209/api/postcode-lookup-nest?postcode=SW1A1AA

# Test NestJS journey
open http://localhost:3209/nest-journey/step1
```

**Manual Testing Checklist:**
- [ ] NestJS endpoints respond correctly
- [ ] Journey flow works end-to-end
- [ ] Validation errors display properly
- [ ] Session management works
- [ ] Error handling functions correctly

### Step 9: Run E2E Tests

```bash
# Run functional tests
yarn test:functional

# Run accessibility tests
yarn test:accessibility

# Run smoke tests
yarn test:smoke
```

### Step 10: Update Documentation

Update any documentation that references NestJS version:

- [ ] Update `README.md` if it mentions version requirements
- [ ] Update `NESTJS_SPIKE_RESULTS.md` with new version info
- [ ] Update this upgrade guide with lessons learned
- [ ] Document any code changes made

---

## Version-Specific Upgrade Notes

### Upgrading from v10 to v11

**Breaking Changes:**
- Minimum Node.js version: 18.0.0
- TypeScript minimum version: 5.0.0
- Some deprecated APIs removed

**Steps:**
1. Update Node.js to 18+ if needed
2. Update TypeScript to 5.0+
3. Update all `@nestjs/*` packages to v11
4. Run tests and fix any breaking changes

### Upgrading from v9 to v10

**Breaking Changes:**
- Express 5 support
- Updated decorator behavior
- Module resolution changes

**Steps:**
1. Update Express to v5 if needed
2. Update all `@nestjs/*` packages to v10
3. Check decorator usage
4. Run tests

---

## Troubleshooting

### Issue: Build Fails with Decorator Errors

**Cause:** TypeScript or `reflect-metadata` version incompatibility

**Solution:**
```bash
# Update reflect-metadata
yarn upgrade reflect-metadata

# Ensure tsconfig.json has correct settings
# Check: "experimentalDecorators": true
# Check: "emitDecoratorMetadata": true
```

### Issue: Tests Fail After Upgrade

**Cause:** Testing module setup may need updates

**Solution:**
```typescript
// Check Test.createTestingModule() usage
const module: TestingModule = await Test.createTestingModule({
  controllers: [MyController],
  providers: [MyService],
}).compile();
```

### Issue: Dependency Injection Not Working

**Cause:** Provider registration or scope issues

**Solution:**
1. Check provider is registered in module
2. Verify injection token matches
3. Check for circular dependencies
4. Review scope settings (singleton, request, transient)

### Issue: Express Middleware Not Working

**Cause:** Express adapter configuration

**Solution:**
```typescript
// Verify Express adapter is correctly configured
const app = await NestFactory.create<NestExpressApplication>(
  AppModule,
  new ExpressAdapter(expressApp),
);
```

---

## Rollback Procedure

If upgrade causes critical issues:

### Step 1: Revert Package Changes

```bash
# Checkout previous package.json and yarn.lock
git checkout HEAD~1 package.json yarn.lock

# Reinstall dependencies
yarn install
```

### Step 2: Revert Code Changes

```bash
# Revert all code changes
git checkout HEAD~1 src/

# Or revert specific files
git checkout HEAD~1 src/main/nest/
```

### Step 3: Verify Rollback

```bash
# Run tests
yarn test

# Start application
yarn start:dev
```

### Step 4: Document Issues

Create a document with:
- What went wrong
- Error messages encountered
- Which tests failed
- Blockers for upgrade
- Plan for next attempt

---

## Best Practices

### 1. Upgrade Incrementally

Don't skip major versions. Upgrade one major version at a time:
- v9 → v10 → v11 (Good)
- v9 → v11 (Risky)

### 2. Test Thoroughly

Run all test suites:
- Unit tests
- Integration tests
- E2E tests
- Manual testing

### 3. Review Deprecation Warnings

Fix deprecation warnings before they become breaking changes:

```bash
# Run with deprecation warnings visible
NODE_OPTIONS='--trace-deprecation' yarn start:dev
```

### 4. Update Dependencies Together

Keep all `@nestjs/*` packages on the same version to avoid compatibility issues.

### 5. Monitor Performance

After upgrade, monitor:
- Application startup time
- Response times
- Memory usage
- Error rates

### 6. Keep TypeScript Updated

NestJS often requires recent TypeScript versions. Keep TypeScript updated to avoid compatibility issues.

---

## Compatibility Matrix

| NestJS Version | Node.js | TypeScript | Express | RxJS |
|----------------|---------|------------|---------|------|
| v11.x | ≥18.0.0 | ≥5.0.0 | ≥4.17.1 | ≥7.8.0 |
| v10.x | ≥16.0.0 | ≥4.8.0 | ≥4.17.1 | ≥7.2.0 |
| v9.x | ≥14.0.0 | ≥4.3.5 | ≥4.17.1 | ≥7.2.0 |

**Current Project Versions:**
- Node.js: ≥18.0.0 (see `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/package.json:6`)
- TypeScript: ≥4.7.4 <5.10.0
- Express: ^5.2.1
- RxJS: ^7.8.1

---

## Post-Upgrade Tasks

After successful upgrade:

- [ ] Update CHANGELOG.md with upgrade details
- [ ] Update package.json version constraints if needed
- [ ] Run security audit: `yarn audit`
- [ ] Update CI/CD pipelines if needed
- [ ] Notify team of successful upgrade
- [ ] Monitor production for issues
- [ ] Update this guide with lessons learned

---

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [NestJS GitHub Releases](https://github.com/nestjs/nest/releases)
- [NestJS Migration Guides](https://docs.nestjs.com/migration-guide)
- [NestJS Discord Community](https://discord.gg/nestjs)
- [NestJS Twitter](https://twitter.com/nestframework)

---

## Related Documentation

- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/NESTJS_SPIKE_RESULTS.md` - NestJS implementation details
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/NESTJS_MIGRATION_GUIDE.md` - Migrating endpoints to NestJS
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/UPGRADE_GUIDE.md` - General upgrade guide
