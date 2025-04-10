# Material Design 3 Styling System

## Overview
This styling system implements Material Design 3 (MD3) principles for consistent, accessible, and performant UI components. The system uses design tokens to maintain a single source of truth for colors, typography, spacing, and more.

## Tasks

- [x] Fill empty style files (reset.scss, responsive.scss, scrollbar.scss, etc.)
- [x] Review MD3 token alignment with official specifications
- [ ] Complete animation pattern library (90% complete)
- [ ] Standardize component patterns across the application
- [ ] Add usage examples for all components
- [x] **Implement style auditing tool to verify MD3 compliance**
- [x] **Ensure all styles pass linting as a requirement for MD3 compliance**

## Stylelint Integration

We use Stylelint to enforce not only consistent coding standards but also Material Design 3 compliance across our SCSS files. Passing linting is a **requirement** for any style changes.

### Stylelint Configuration

Our Stylelint configuration is defined in `.stylelintrc.json` at the project root and includes MD3 specific rules:

```json
{
  "extends": [
    "stylelint-config-standard-scss",
    "stylelint-config-prettier-scss"
  ],
  "plugins": [
    "stylelint-scss",
    "stylelint-order",
    "stylelint-declaration-strict-value"
  ],
  "rules": {
    "order/properties-alphabetical-order": true,
    "selector-class-pattern": "^md3-[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*(__[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)?(--[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)?$|^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$",
    "scale-unlimited/declaration-strict-value": [
      ["/color/", "font-size", "font-family"],
      {
        "ignoreValues": ["inherit", "transparent", "currentColor"]
      }
    ],
    "color-no-hex": true,
    "color-named": "never"
    // Additional rules omitted for brevity
  }
}
```

### Benefits of Stylelint
- **Consistency**: Enforces consistent code style across the codebase
- **Error Prevention**: Catches errors and potential issues early in development
- **MD3 Compliance**: Custom rules ensure adherence to Material Design 3 specifications
- **Accessibility**: Rules that promote accessible color contrasts and patterns
- **Performance**: Prevents CSS bloat and encourages best practices
- **Auto-fixing**: Many common issues can be automatically fixed

### Using Stylelint

#### Basic Linting
```bash
npx stylelint "**/*.scss"
```

#### Auto-fixing Issues
Use the `--fix` flag to automatically fix many common issues:
```bash
npx stylelint "**/*.scss" --fix
```

#### Fix a Specific File
```bash
npx stylelint "src/styles/_utilities.scss" --fix
```

#### Fix All Files in a Directory
```bash
npx stylelint "src/styles/*.scss" --fix
```

#### Running in CI/CD
```bash
npx stylelint "**/*.scss" --formatter=json --output-file=stylelint-report.json
```

### Common Stylelint Commands for MD3 Compliance

#### Check for MD3 Color Token Usage
```bash
npx stylelint "**/*.scss" --custom-syntax=postcss-scss --rule="color-named: never"
```

#### Check for Typography Scale Compliance
```bash
npx stylelint "**/*.scss" --custom-syntax=postcss-scss --rule="declaration-property-value-disallowed-list: { '/^font-size/': ['/px$/'] }"
```

#### Validate BEM Naming Convention
```bash
npx stylelint "**/*.scss" --custom-syntax=postcss-scss --rule="selector-class-pattern: '^md3-[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$'"
```

## Fixing Sass Deprecation Warnings

Our current styles use the deprecated `@import` syntax which will be removed in Dart Sass 3.0.0. Here's how to migrate to the recommended `@use` and `@forward` syntax:

### Before:
```scss
@import './styles/variables';
@import './styles/reset';
@import './styles/responsive';
@import './styles/utilities';
```

### After:
```scss
@use './styles/variables';
@use './styles/reset';
@use './styles/responsive';
@use './styles/utilities';
```

When using modules with `@use`, you'll need to access members through the namespace:

```scss
// Before with @import
.element {
  color: $primary-color;
}

// After with @use
.element {
  color: variables.$primary-color;
}
```

### Using @forward
If you need to re-export variables, mixins, or functions from one file to make them available to other files, use `@forward`:

```scss
// _index.scss
@forward './variables';
@forward './mixins';
```

Then in your main file:
```scss
@use './styles' as styles;

.element {
  color: styles.$primary-color;
}
```

## Style Auditing Tool

We've implemented a custom style auditing tool that:

1. Runs stylelint with MD3-specific rules
2. Checks for proper usage of design tokens
3. Validates color usage and accessibility
4. Verifies typography scale implementation

Run the tool using:
```bash
node tools/style-audit.js
```

## File Structure

- `_variables.scss` - MD3 design tokens and variables
- `_reset.scss` - CSS reset and normalization
- `_responsive.scss` - Breakpoints and responsive utilities
- `_utilities.scss` - Utility classes for common styles
- `_md3-components.scss` - Base component styles
- `_material-overrides.scss` - Customizations for Angular Material
