# Material Design 3 Usage Guide

This document provides guidelines and examples for using our Material Design 3 (MD3) styling system.

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Typography](#typography)
3. [Colors](#colors)
4. [Elevation](#elevation)
5. [Components](#components)
6. [Utilities](#utilities)
7. [Animations](#animations)
8. [Linting & Validation](#linting-and-validation)

## Design Tokens

Always use design tokens to maintain consistency. Never use hardcoded values.

### Good:
```scss
.my-element {
  color: var(--md-sys-color-on-surface);
  background-color: var(--md-sys-color-surface);
  padding: 16px;
  border-radius: var(--md-sys-shape-corner-medium);
}
```

### Bad:
```scss
.my-element {
  color: #1d1b20;
  background-color: #fff;
  padding: 16px;
  border-radius: 8px;
}
```

## Typography

Use the typography tokens to ensure consistent font styles:

```html
<h1 class="md3-typography--headline-large">Headline Large</h1>
<h2 class="md3-typography--headline-medium">Headline Medium</h2>
<p class="md3-typography--body-medium">Body Medium text for paragraphs and general content.</p>
<span class="md3-typography--label-small">Label Small for small labels</span>
```

For custom styles, reference the typography tokens:

```scss
.custom-text {
  font-family: var(--md-sys-typescale-body-large-font-family);
  font-size: var(--md-sys-typescale-body-large-font-size);
  font-weight: var(--md-sys-typescale-body-large-font-weight);
  line-height: var(--md-sys-typescale-body-large-line-height);
  letter-spacing: var(--md-sys-typescale-body-large-letter-spacing);
}
```

## Colors

Always use MD3 color tokens for both foreground and background colors:

```scss
.primary-action {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.secondary-container {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.error-state {
  color: var(--md-sys-color-error);
}
```

## Elevation

Use elevation tokens for drop shadows:

```scss
.card {
  box-shadow: var(--md-sys-elevation-level1);
}

.card:hover {
  box-shadow: var(--md-sys-elevation-level2);
}

.dialog {
  box-shadow: var(--md-sys-elevation-level3);
}
```

You can also use elevation utility classes:

```html
<div class="md3-elevation-1">Level 1 elevation</div>
<div class="md3-elevation-3">Level 3 elevation</div>
```

## Components

### Angular Material Components

When using Angular Material components, apply the overrides we've provided:

```html
<button mat-mdc-raised-button color="primary">Primary Action</button>
<button mat-mdc-outlined-button color="primary">Secondary Action</button>
```

These components are automatically styled to comply with MD3 specifications through our `_material-overrides.scss` file.

### Custom MD3 Components

For components not covered by Angular Material, use our custom MD3 components:

```html
<!-- MD3 Card -->
<div class="md3-card">
  <div class="md3-card__header">
    <h2 class="md3-card__title">Card Title</h2>
    <p class="md3-card__subtitle">Card subtitle</p>
  </div>
  <div class="md3-card__content">
    Card content goes here.
  </div>
  <div class="md3-card__actions">
    <button mat-mdc-button>Action</button>
    <button mat-mdc-button color="primary">Primary</button>
  </div>
</div>

<!-- MD3 Chip -->
<div class="md3-chip">Basic Chip</div>
<div class="md3-chip md3-chip--selected">Selected Chip</div>

<!-- MD3 Badge -->
<div class="md3-badge">
  <mat-icon>notifications</mat-icon>
  <span class="md3-badge__content">3</span>
</div>
```

## Utilities

Use utility classes to apply common styling patterns:

```html
<!-- Typography utilities -->
<p class="md3-typography--body-large">Large body text</p>

<!-- Spacing utilities -->
<div class="md3-mt-4 md3-mb-2 md3-p-3">
  This div has margin-top: 16px, margin-bottom: 8px, and padding: 12px
</div>

<!-- Display utilities -->
<div class="md3-display-flex md3-justify-between md3-align-center">
  Flexbox with space-between and centered items
</div>

<!-- Shape utilities -->
<div class="md3-shape-large">
  Element with large (16px) border radius
</div>
```

## Animations

Use the predefined animations for consistent motion:

```html
<!-- Element with fade-in animation -->
<div class="md3-anim-fade-in">This will fade in</div>

<!-- Element with slide-in animation -->
<div class="md3-anim-slide-in-bottom">This will slide in from bottom</div>
```

For custom animations, use the motion tokens:

```scss
.my-animated-element {
  transition-property: transform, opacity;
  transition-duration: var(--md-sys-motion-duration-medium2);
  transition-timing-function: var(--md-sys-motion-easing-standard);
}
```

## Linting and Validation

Always run Stylelint before committing changes to ensure MD3 compliance:

```bash
# Check all SCSS files
npm run lint-styles

# Fix auto-fixable issues
npm run lint-styles:fix

# Run comprehensive style audit
npm run audit-styles
```

The audit tool will check for:

1. Stylelint rule violations
2. Hardcoded color values
3. Non-compliant typography usage
4. Missing design tokens

## Best Practices

1. Always use design tokens instead of hardcoded values
2. Follow the MD3 type scale for all typography
3. Properly pair foreground and background colors (e.g., on-primary with primary)
4. Use appropriate elevation levels based on UI hierarchy
5. Apply consistent spacing using the spacing scale
6. Use the standard animation patterns and timing functions

Following these guidelines ensures a consistent, accessible, and maintainable UI that complies with Material Design 3 specifications.
