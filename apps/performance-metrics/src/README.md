# Material Design 3 Styling System

## Tasks

- [ ] Fill empty style files (reset.scss, responsive.scss, scrollbar.scss, etc.)
- [ ] Review MD3 token alignment with official specifications
- [ ] Complete animation pattern library (90% complete)
- [ ] Standardize component patterns across the application
- [ ] Add usage examples for all components
- [ ] **Implement style auditing tool to verify MD3 compliance**
- [ ] **Ensure all styles pass linting as a requirement for MD3 compliance**

This document provides a comprehensive guide to the Material Design 3 styling architecture used in the application. The system strictly follows Material Design 3 (MD3) principles and implements best practices for Angular applications.

## Table of Contents

### Foundation & Architecture

1. [Architecture Overview](#architecture-overview)
2. [Design Token System](#design-token-system)
3. [File Structure](#file-structure)
4. [Core Files Explained](#core-files-explained)

### Styling Standards & Compliance

1. [Documentation Standards](#documentation-standards)
2. [Stylelint Integration](#stylelint-integration)
3. [MD3 Compliance Requirements](#md3-compliance-requirements)
4. [Units and Sizing Standards](#units-and-sizing-standards)
5. [Container Guidelines](#container-guidelines)
6. [Implementation Guidelines](#implementation-guidelines)

### Material Design & Theming

1. [Material Design 3 Integration](#material-design-3-integration)
2. [Theming System](#theming-system)
3. [Patriotic Theme Implementation](#patriotic-theme-implementation)

### Animation & Motion

1. [Animation System](#animation-system)

### Angular Integration

1. [Angular Styling Patterns](#angular-styling-patterns)
2. [Component Alignment Standards](#component-alignment-standards)
3. [Component Configuration Standards](#component-configuration-standards)

### Development & Maintenance

1. [Testing Roadmap](#testing-roadmap)
2. [Refactoring Plans](#refactoring-plans)
3. [Generating Styles with AI](#generating-styles-with-ai)

## Architecture Overview

Our styling system is built with modularity, maintainability, and performance in mind. We use SCSS for preprocessing and follow a component-based approach with globally defined design tokens that strictly adhere to Material Design 3 specifications.

### Key Features

- **CSS Variables**: For runtime theming capabilities that match MD3 color system
- **SCSS Modules**: For compilation-time code organization
- **Material Design 3**: Following the latest Google design system principles
- **Utility Classes**: For rapid development and consistent styling
- **Responsive Design**: Mobile-first approach with flexible breakpoints
- **Design Tokens**: Structured following Material Design 3 token hierarchy

## Documentation Standards

### Markdown Requirements

All documentation in the Craft Fusion project must adhere to strict markdown linting standards to ensure consistency and readability.

#### List Formatting (MD032)

All lists must be surrounded by blank lines:

```markdown
This is a paragraph.

- List item 1
- List item 2
- List item 3

This is another paragraph.
```

#### Heading Structure

- Use proper heading hierarchy (don't skip levels)

- Leave a space after the hash marks

- Capitalize first letter of headings

```markdown
# Main Title

## Section Title

### Subsection Title
```

#### Code Blocks

Some paragraph text.

```plaintext
console.log('Example code block');
```

Next paragraph after the code block.

#### Tables

- Use proper table formatting with headers

- Align columns consistently

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |
```

#### Document Structure

- Include a table of contents for documents longer than 3 sections

- Use relative links for cross-references within the repository

- Include a "Last Updated" date at the bottom of significant documents

### Documentation Best Practices

1. Keep documentation close to the code it describes

2. Update documentation when changing related code

3. Use examples liberally to illustrate concepts

4. Employ consistent terminology throughout the documentation

5. Format command-line instructions with code blocks and clear instructions

## MD3 Compliance Requirements

All styles in the project MUST adhere to Material Design 3 specifications. Compliance is verified through:

1. **Mandatory Stylelint Checks**: All code must pass style linting which includes checks for MD3 compliance
2. **Token Validation**: Design tokens must align with the official MD3 token system
3. **Component Structure**: Components must follow the MD3 component architecture
4. **Responsive Behavior**: All components must implement the MD3 responsive behaviors
5. **Accessibility Standards**: Must meet or exceed MD3 accessibility guidelines

Non-compliant styles will be rejected during code review and CI/CD processes.

## Stylelint Integration

We use Stylelint to enforce not only consistent coding standards but also Material Design 3 compliance across our SCSS files. Passing linting is a **requirement** for any style changes.

### Stylelint Configuration

Our Stylelint configuration is defined in `.stylelintrc.json` at the project root and includes MD3 specific rules:

```json
{
  "extends": [
    "stylelint-config-standard-scss",
    "stylelint-config-prettier-scss",
    "stylelint-config-material"
  ],
  "plugins": [
    "stylelint-scss",
    "stylelint-order",
    "stylelint-plugin-material"
  ],
  "rules": {
    "order/properties-alphabetical-order": true,
    "selector-class-pattern": null,
    "scss/dollar-variable-pattern": null,
    "scss/at-import-partial-extension": null,
    "property-no-vendor-prefix": null,
    "value-no-vendor-prefix": null,
    "color-function-notation": "legacy",
    "alpha-value-notation": "number",
    "selector-pseudo-element-no-unknown": [
      true,
      {
        "ignorePseudoElements": ["ng-deep"]
      }
    ],
    "material/use-token-references": "always",
    "material/color-scheme-compatibility": true
  }
}
```

### Running Stylelint

You can run Stylelint checks using:

```bash
# Check all SCSS files for MD3 compliance
nx run performance-metrics:lint-styles

# Fix auto-fixable issues
nx run performance-metrics:lint-styles --fix

# Check specific file
npx stylelint "apps/performance-metrics/src/styles/_variables.scss"
```

### Stylelint Best Practices

1. **Run Before Committing**: Always run Stylelint before committing changes
2. **Treat Warnings as Errors**: All warnings should be treated as errors for MD3 compliance
3. **No Disabling Rules**: Avoid disabling Material Design related linting rules
4. **Document Exceptions**: If you must deviate from MD3 standards, add a detailed comment explaining why

## Material Design 3 Integration

Material Design 3 is not optional - it is our required design system. All components and styles must follow the MD3 specifications.

### Benefits of Material Design 3 (MD3)

1. **Personalized Design System**: MD3 allows for greater customization and expression through dynamic color system
2. **Improved Accessibility**: Enhanced contrast ratios and touch targets
3. **Cohesive Cross-Platform Experience**: Consistent design language across all platforms
4. **Adaptive Layouts**: Better responsive behaviors for different screen sizes
5. **Simplified Component Structure**: More intuitive component architecture
6. **Performance Improvements**: More efficient rendering and animations

## Implementation Guidelines

When working with component styling, follow these guidelines to ensure MD3 compliance:

> **IMPORTANT NOTE:** All styles must conform to Material Design 3 specifications and pass linting. Non-compliant styles will be rejected during code review.

### Extending the System

When adding new styles, follow these guidelines:

1. If it's a global token, add it to `_variables.scss` using MD3 token naming conventions
2. If it's a utility class, add it to `_utilities.scss` following MD3 patterns
3. If it's a custom component style, add it to `_md3-components.scss`
4. If it's an Angular Material override, add it to `_material-overrides.scss`

## Additional Notes

- Overview of style folder structure

- Link to theming instructions in MD3 docs

### Last Updated: March 27, 2025
