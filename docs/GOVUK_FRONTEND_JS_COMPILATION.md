# GOV.UK Frontend JavaScript Compilation and Bundling

## Overview

This document explains how GOV.UK Frontend JavaScript is compiled and bundled in the PCS Frontend application using Webpack.

**Scope:** General frontend build process (not NestJS-specific)

---

## Architecture

### Build Tool: Webpack 5

The application uses **Webpack 5** as the primary build tool for compiling and bundling both JavaScript and SCSS assets.

**Configuration Files:**
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack.config.js:1-46` - Main webpack configuration
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack/govukFrontend.js:1-29` - GOV.UK Frontend specific config
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack/scss.js:1-45` - SCSS compilation config
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack/htmlWebpack.js:1-23` - HTML template injection

---

## GOV.UK Frontend JavaScript Integration

### Source Files

GOV.UK Frontend JavaScript is imported from the npm package:

```typescript
// src/main/assets/js/index.ts
import { initAll } from 'govuk-frontend';

initAll();
```

**Package Version:** `govuk-frontend@5.13.0` (see `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/package.json:65`)

### JavaScript Entry Point

The main entry point for all JavaScript is:

```
src/main/assets/js/index.ts
```

This file:
1. Imports the main SCSS file (`../scss/main.scss`)
2. Imports GOV.UK Frontend's `initAll()` function
3. Imports custom application JavaScript modules
4. Initializes all components

### Webpack Resolution

Webpack resolves the GOV.UK Frontend JavaScript from:

```javascript
// webpack/govukFrontend.js
const rootExport = require.resolve('govuk-frontend');
const root = path.resolve(rootExport, '..');
const javascript = path.resolve(root, 'all.js');
```

This resolves to: `node_modules/govuk-frontend/dist/govuk/all.js`

---

## Compilation Process

### 1. TypeScript Compilation

Application TypeScript files are compiled using `ts-loader`:

```javascript
// webpack.config.js
{
  test: /\.ts$/,
  use: 'ts-loader',
  exclude: /node_modules/,
}
```

**Configuration:** `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/tsconfig.json:1-1218`

### 2. JavaScript Bundling

Webpack bundles:
- GOV.UK Frontend JavaScript (ES5 compatible)
- Application TypeScript (compiled to JavaScript)
- Custom JavaScript modules

**Output:**
- Development: `main-dev.js` (with source maps)
- Production: `main.[contenthash].js` (minified, no source maps)

### 3. Output Location

```javascript
// webpack.config.js
output: {
  path: path.resolve(__dirname, 'src/main/public/'),
  publicPath: '',
  filename: `[name]${fileNameSuffix}.js`,
}
```

Compiled JavaScript is output to: `src/main/public/main-[dev|contenthash].js`

---

## SCSS Compilation

### GOV.UK Frontend Sass

The application imports GOV.UK Frontend Sass from the source files (not the dist):

```scss
// src/main/assets/scss/main.scss
@import 'govuk-frontend';
```

**Resolved Path:** `node_modules/govuk-frontend/dist/govuk/all.scss`

### Sass Loader Configuration

```javascript
// webpack/scss.js
{
  loader: 'sass-loader',
  options: {
    sassOptions: {
      quietDeps: true,
    },
  },
}
```

### CSS Extraction

CSS is extracted from JavaScript bundles using `MiniCssExtractPlugin`:

```javascript
const miniCss = new MiniCssExtractPlugin({
  filename: `[name]${fileNameSuffix}.css`,
  chunkFilename: '[id].css',
});
```

**Output:**
- Development: `main-dev.css`
- Production: `main.[contenthash].css`

---

## Asset Copying

### GOV.UK Frontend Assets

Static assets are copied from the GOV.UK Frontend package:

```javascript
// webpack/govukFrontend.js
const copyGovukTemplateAssets = new CopyWebpackPlugin({
  patterns: [
    { from: images, to: 'assets/images' },
    { from: fonts, to: 'assets/fonts' },
    { from: `${assets}/manifest.json`, to: 'assets' },
    { from: `${root}/template.njk`, to: '../views/govuk' },
    { from: `${root}/components`, to: '../views/govuk/components' },
    { from: `${root}/macros`, to: '../views/govuk/macros' },
  ],
});
```

**Copied Assets:**
- Images → `src/main/public/assets/images/`
- Fonts → `src/main/public/assets/fonts/`
- Manifest → `src/main/public/assets/manifest.json`
- Nunjucks templates → `src/main/views/govuk/`
- Components → `src/main/views/govuk/components/`
- Macros → `src/main/views/govuk/macros/`

---

## Build Scripts

### Development Build

```bash
yarn build
```

- Mode: `development`
- Source maps: Enabled
- Minification: Disabled
- Output: `main-dev.js`, `main-dev.css`

### Production Build

```bash
yarn build:prod
```

- Mode: `production`
- Source maps: Disabled
- Minification: Enabled (via Webpack defaults)
- Output: `main.[contenthash].js`, `main.[contenthash].css`
- Content hash for cache busting

---

## Template Injection

### Dynamic Asset References

Webpack generates Nunjucks templates with the compiled asset paths:

```javascript
// webpack/htmlWebpack.js
const cssWebPackPlugin = new HtmlWebpackPlugin({
  template: 'src/main/views/webpack/css-template.njk',
  filename: 'src/main/views/webpack/css.njk',
  inject: false,
});

const jsWebPackPlugin = new HtmlWebpackPlugin({
  template: 'src/main/views/webpack/js-template.njk',
  filename: 'src/main/views/webpack/js.njk',
  inject: false,
});
```

These templates are included in the main layout to inject the correct asset paths.

---

## GOV.UK Frontend Component Initialization

### Automatic Initialization

GOV.UK Frontend components are initialized automatically:

```typescript
// src/main/assets/js/index.ts
import { initAll } from 'govuk-frontend';

initAll();
```

This initializes all GOV.UK Frontend JavaScript components:
- Accordions
- Character count
- Checkboxes
- Error summary
- Exit this page
- Header
- Notification banner
- Radios
- Skip link
- Tabs

### Custom Component Initialization

Application-specific components are initialized separately:

```typescript
import { initPostcodeLookup } from './postcode-lookup';
import { initPostcodeSelection } from './postcode-select';
import { initSessionTimeout } from './session-timeout';

initPostcodeLookup();
initPostcodeSelection();
initSessionTimeout();
```

---

## Browser Compatibility

### GOV.UK Frontend Browser Support

GOV.UK Frontend supports:
- Internet Explorer 11+
- Edge (latest 2 versions)
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

### Transpilation

GOV.UK Frontend ships with ES5-compatible JavaScript, so no additional transpilation is required for browser compatibility.

Application TypeScript is compiled to ES5 via `ts-loader` and `tsconfig.json` settings.

---

## Performance Optimizations

### Production Optimizations

1. **Minification**: Webpack automatically minifies JavaScript in production mode
2. **Content Hashing**: Cache busting via `[contenthash]` in filenames
3. **Tree Shaking**: Unused code is removed (ES modules only)
4. **CSS Extraction**: CSS is extracted into separate files for parallel loading

### Development Optimizations

1. **Source Maps**: Full source maps for debugging
2. **Fast Refresh**: Webpack dev middleware for hot reloading
3. **No Minification**: Faster builds during development

---

## Troubleshooting

### Common Issues

**Issue:** GOV.UK Frontend JavaScript not working

**Solution:**
1. Verify `initAll()` is called in `index.ts`
2. Check browser console for JavaScript errors
3. Ensure `data-module` attributes are present on components
4. Verify assets are loaded (check Network tab)

**Issue:** Styles not applying

**Solution:**
1. Check SCSS import order in `main.scss`
2. Verify webpack build completed successfully
3. Check CSS file is loaded in browser
4. Clear browser cache

**Issue:** Build fails with Sass errors

**Solution:**
1. Check GOV.UK Frontend version compatibility
2. Verify `sass-loader` configuration
3. Check for syntax errors in custom SCSS files

---

## Future Considerations

### Potential Improvements

1. **Code Splitting**: Split vendor and application code for better caching
2. **Lazy Loading**: Load JavaScript modules on demand
3. **Service Workers**: Implement offline support
4. **Module Federation**: Share code between micro-frontends
5. **Brotli Compression**: Pre-compress assets for production

### Upgrade Path

When upgrading GOV.UK Frontend:

1. Update package version in `package.json`
2. Run `yarn install`
3. Run `yarn build` to verify compilation
4. Test all GOV.UK components in the application
5. Check for breaking changes in release notes
6. Update any custom component overrides

---

## Related Documentation

- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/GOVUK_FRONTEND_BUILD_GUIDE.md` - Build process guide
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/GOVUK_FRONTEND_TESTING.md` - Testing GOV.UK components
- [GOV.UK Frontend Documentation](https://frontend.design-system.service.gov.uk/)
- [Webpack Documentation](https://webpack.js.org/)
