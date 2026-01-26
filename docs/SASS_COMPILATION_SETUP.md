# Sass Compilation Setup

## Overview

This document explains the current Sass compilation setup in the PCS Frontend application, including how GOV.UK Frontend Sass is compiled and integrated.

**Scope:** General frontend build process (not NestJS-specific)

---

## Architecture

### Sass Compiler: Dart Sass

The application uses **Dart Sass** (via the `sass` package) for compiling Sass to CSS.

**Package Version:** `sass@^1.65.1` (see `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/package.json:157`)

**Why Dart Sass:**
- Official Sass implementation (replaces deprecated LibSass/Node Sass)
- Better performance
- Latest Sass features
- Required by GOV.UK Frontend v4+

---

## Webpack Configuration

### Sass Loader Setup

Sass compilation is configured in webpack using `sass-loader`:

**Configuration File:** `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack/scss.js:1-45`

```javascript
{
  loader: 'sass-loader',
  options: {
    sassOptions: {
      quietDeps: true,
    },
  },
}
```

**Options:**
- `quietDeps: true` - Suppresses deprecation warnings from dependencies (like GOV.UK Frontend)

### Complete Sass Processing Pipeline

The Sass files go through multiple loaders:

1. **sass-loader** - Compiles Sass to CSS
2. **css-loader** - Resolves CSS imports and URLs
3. **MiniCssExtractPlugin.loader** - Extracts CSS into separate files
4. **style-loader** - Injects CSS into DOM (development only)

**Configuration:**

```javascript
{
  test: /\.scss$/,
  use: [
    'style-loader',
    {
      loader: MiniCssExtractPlugin.loader,
      options: {
        esModule: false,
      },
    },
    {
      loader: 'css-loader',
      options: {
        url: false, // Don't process URLs in CSS
      },
    },
    {
      loader: 'sass-loader',
      options: {
        sassOptions: {
          quietDeps: true,
        },
      },
    },
  ],
}
```

---

## Source Files

### Main Sass Entry Point

**File:** `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/src/main/assets/scss/main.scss:1-47`

```scss
@import 'govuk-frontend';

@import 'phase-banner';
@import 'service-navigation';
@import 'timeout-modal';

// Custom application styles
.govuk-header__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

// More custom styles...
```

**Import Order:**
1. GOV.UK Frontend (first - provides variables and mixins)
2. Custom component styles
3. Application-specific styles

### Custom Sass Files

**Location:** `src/main/assets/scss/`

- `main.scss` - Main entry point
- `phase-banner.scss` - Phase banner styles
- `service-navigation.scss` - Service navigation styles
- `timeout-modal.scss` - Session timeout modal styles

---

## GOV.UK Frontend Sass Integration

### Import Resolution

The `@import 'govuk-frontend'` statement resolves to:

```
node_modules/govuk-frontend/dist/govuk/all.scss
```

**Webpack Resolution:**

```javascript
// webpack/govukFrontend.js
const rootExport = require.resolve('govuk-frontend');
const root = path.resolve(rootExport, '..');
const sass = path.resolve(root, 'all.scss');
```

### What's Included

The GOV.UK Frontend Sass includes:

1. **Settings** - Variables for colours, typography, spacing
2. **Tools** - Mixins and functions
3. **Helpers** - Utility classes
4. **Core** - Base styles
5. **Objects** - Layout objects
6. **Components** - All GOV.UK components
7. **Utilities** - Utility classes
8. **Overrides** - Print styles and other overrides

### GOV.UK Frontend Variables

GOV.UK Frontend provides Sass variables that can be used in custom styles:

```scss
// Colours
$govuk-brand-colour
$govuk-text-colour
$govuk-secondary-text-colour
$govuk-link-colour
$govuk-error-colour

// Typography
$govuk-font-family
$govuk-font-family-print

// Spacing
$govuk-gutter
$govuk-gutter-half

// Breakpoints
$govuk-breakpoint-mobile
$govuk-breakpoint-tablet
$govuk-breakpoint-desktop
```

**Usage Example:**

```scss
.claim-journey-secondary-heading {
  color: $govuk-secondary-text-colour;
  font-weight: 300;
}
```

### GOV.UK Frontend Mixins

GOV.UK Frontend provides mixins for common patterns:

```scss
// Responsive design
@include govuk-media-query($from: tablet) {
  // Styles for tablet and above
}

// Typography
@include govuk-font($size: 19);
@include govuk-heading-xl;

// Spacing
@include govuk-responsive-margin(4, "bottom");
@include govuk-responsive-padding(2);

// Colours
background-color: govuk-colour("blue");
```

---

## Compilation Process

### Development Build

```bash
yarn build
```

**Process:**
1. Webpack reads `src/main/assets/js/index.ts`
2. TypeScript imports `../scss/main.scss`
3. Sass loader compiles Sass to CSS
4. CSS loader processes the CSS
5. MiniCssExtractPlugin extracts CSS to file
6. Output: `src/main/public/main-dev.css`

**Features:**
- Source maps enabled
- No minification
- Fast compilation

### Production Build

```bash
yarn build:prod
```

**Process:**
Same as development, but with:
- Source maps disabled
- CSS minification enabled
- Content hash in filename
- Output: `src/main/public/main.[contenthash].css`

---

## Output

### CSS Output Location

**Development:** `src/main/public/main-dev.css`
**Production:** `src/main/public/main.[contenthash].css`

### CSS Extraction

CSS is extracted from JavaScript bundles using `MiniCssExtractPlugin`:

```javascript
const miniCss = new MiniCssExtractPlugin({
  filename: `[name]${fileNameSuffix}.css`,
  chunkFilename: '[id].css',
});
```

**Benefits:**
- Separate CSS file for parallel loading
- Better caching
- Smaller JavaScript bundle
- Faster page load

---

## Asset Handling

### URL Processing

CSS loader is configured with `url: false`:

```javascript
{
  loader: 'css-loader',
  options: {
    url: false, // Don't process URLs in CSS
  },
}
```

**Why:** Assets (fonts, images) are copied separately by `CopyWebpackPlugin`, so URLs in CSS don't need processing.

### Font Files

GOV.UK Frontend fonts are copied to:

```
src/main/public/assets/fonts/
```

**Webpack Configuration:**

```javascript
{ from: fonts, to: 'assets/fonts' }
```

### Image Files

GOV.UK Frontend images are copied to:

```
src/main/public/assets/images/
```

**Webpack Configuration:**

```javascript
{ from: images, to: 'assets/images' }
```

---

## Customization

### Overriding GOV.UK Frontend Variables

You can override GOV.UK Frontend variables before importing:

```scss
// Set custom variables before import
$govuk-brand-colour: #0b0c0c;
$govuk-font-family: "Custom Font", arial, sans-serif;

// Then import GOV.UK Frontend
@import 'govuk-frontend';
```

**Note:** Check GOV.UK Frontend documentation for available variables.

### Custom Component Styles

Add custom styles after importing GOV.UK Frontend:

```scss
@import 'govuk-frontend';

// Custom component
.custom-component {
  @include govuk-font(19);
  color: $govuk-text-colour;
  padding: govuk-spacing(4);
}
```

### Using GOV.UK Frontend Mixins

Leverage GOV.UK Frontend mixins for consistency:

```scss
.correspondence-address-form {
  .pcs-address-component {
    .govuk-details__text {
      border-left: none;
      padding-left: 0;
      padding-bottom: 0;
      position: relative;

      &::before {
        content: '';
        display: block;
        position: absolute;
        top: -5px;
        left: -40px;
        width: 5px;
        height: 15px;
        background-color: govuk-colour('white');
      }
    }
  }
}
```

---

## Performance Optimization

### Production Optimizations

1. **Minification**: CSS is minified in production mode
2. **Content Hashing**: Cache busting via `[contenthash]`
3. **Separate File**: CSS extracted for parallel loading
4. **Tree Shaking**: Unused styles removed (if using CSS modules)

### Development Optimizations

1. **Source Maps**: Full source maps for debugging
2. **Fast Compilation**: No minification
3. **Hot Reload**: CSS updates without full page reload

---

## Troubleshooting

### Issue: Sass Compilation Fails

**Error:** `Undefined variable` or `Undefined mixin`

**Solution:**
1. Ensure GOV.UK Frontend is imported first
2. Check variable/mixin name spelling
3. Verify GOV.UK Frontend version compatibility

```scss
// Correct order
@import 'govuk-frontend'; // First
@import 'custom-styles'; // Then custom styles
```

### Issue: Styles Not Applying

**Cause:** CSS specificity or import order

**Solution:**
1. Check CSS is loaded in browser
2. Verify import order in main.scss
3. Check CSS specificity
4. Clear browser cache

### Issue: Deprecation Warnings

**Warning:** Sass deprecation warnings from GOV.UK Frontend

**Solution:**
Already handled by `quietDeps: true` in sass-loader options. If warnings persist:

```javascript
sassOptions: {
  quietDeps: true,
  silenceDeprecations: ['legacy-js-api'], // Add specific deprecations
}
```

### Issue: Font Files Not Loading

**Error:** 404 errors for font files

**Solution:**
1. Verify fonts copied to `src/main/public/assets/fonts/`
2. Check font paths in compiled CSS
3. Verify webpack CopyPlugin configuration

---

## Browser Compatibility

### Supported Browsers

GOV.UK Frontend Sass compiles to CSS that supports:

- Internet Explorer 11+
- Edge (latest 2 versions)
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari (latest 2 versions)
- Android Chrome (latest 2 versions)

### Autoprefixer

**Note:** The project does not currently use Autoprefixer. GOV.UK Frontend includes necessary vendor prefixes in its compiled CSS.

If you need additional prefixing for custom styles, add PostCSS with Autoprefixer:

```bash
yarn add -D postcss autoprefixer
```

---

## Related Configuration Files

### Webpack Configuration

- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack.config.js` - Main webpack config
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack/scss.js` - Sass loader config
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/webpack/govukFrontend.js` - GOV.UK Frontend config

### Package Dependencies

```json
{
  "dependencies": {
    "govuk-frontend": "5.13.0"
  },
  "devDependencies": {
    "sass": "^1.65.1",
    "sass-loader": "^16.0.0",
    "css-loader": "^7.0.0",
    "style-loader": "^4.0.0",
    "mini-css-extract-plugin": "^2.7.6"
  }
}
```

---

## Best Practices

### 1. Import GOV.UK Frontend First

Always import GOV.UK Frontend before custom styles:

```scss
@import 'govuk-frontend'; // First
@import 'custom-component'; // Then custom
```

### 2. Use GOV.UK Frontend Variables

Use GOV.UK Frontend variables for consistency:

```scss
// Good
color: $govuk-text-colour;

// Avoid
color: #0b0c0c;
```

### 3. Use GOV.UK Frontend Mixins

Leverage mixins for responsive design and typography:

```scss
@include govuk-media-query($from: tablet) {
  @include govuk-font(19);
}
```

### 4. Keep Custom Styles Minimal

Minimize custom styles to maintain consistency with GOV.UK Design System.

### 5. Document Custom Overrides

Document why custom styles override GOV.UK Frontend:

```scss
// Override: Need white background for address component
.pcs-address-component {
  background-color: govuk-colour('white');
}
```

---

## Future Improvements

### Potential Enhancements

1. **PostCSS Integration**: Add Autoprefixer for better browser support
2. **CSS Modules**: Consider CSS modules for component isolation
3. **PurgeCSS**: Remove unused CSS in production
4. **Critical CSS**: Extract critical CSS for above-the-fold content
5. **CSS-in-JS**: Consider styled-components for component-scoped styles

---

## Resources

- [Dart Sass Documentation](https://sass-lang.com/dart-sass)
- [sass-loader Documentation](https://webpack.js.org/loaders/sass-loader/)
- [GOV.UK Frontend Sass API](https://frontend.design-system.service.gov.uk/sass-api-reference/)
- [Webpack CSS Documentation](https://webpack.js.org/guides/asset-management/#loading-css)
- [MiniCssExtractPlugin](https://webpack.js.org/plugins/mini-css-extract-plugin/)

---

## Related Documentation

- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/GOVUK_FRONTEND_JS_COMPILATION.md` - JavaScript compilation
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/GOVUK_FRONTEND_BUILD_GUIDE.md` - Build process
- `@/Users/sdmiddleton/Documents/HTTPS/pcs-frontend/docs/GOVUK_FRONTEND_UPGRADE_GUIDE.md` - Upgrade guide
