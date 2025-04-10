# Material Component Platform (MCP)

A comprehensive platform for enforcing Material Design 3 standards and best practices in Angular applications.

## Overview

The Material Component Platform (MCP) is a toolset that helps enforce consistent standards across Angular applications using Material Design 3. It provides automated validation, standardization, and best practices enforcement for components, styles, and architecture.

## Features

### Material Design 3 Standards

- **Component Standards**
  - Enforces Material Design 3 token usage
  - Component naming conventions with `md3-` prefix
  - Standardized component structure
  - Style and template validation

### Architecture Standards

- **Modular Architecture**
  - Enforces Nx workspace structure
  - Dependency injection patterns
  - State management using RxJS

### RxJS Standards

- Enforces Observable patterns
- Discourages direct Promise usage
- Standardized WebSocket configurations
- Required RxJS operator imports

### Testing Standards

- Coverage requirements:
  - Statements: 80%
  - Branches: 80%
  - Functions: 80%
  - Lines: 80%
- Required test types:
  - Unit tests (Jest)
  - Integration tests
  - E2E tests (Playwright)

### Style Standards

- BEM naming convention enforcement
- Maximum nesting depth of 3 levels
- Required structural elements
- Material Design token usage
- Custom property naming patterns

## Configuration

### Material Configuration

```typescript
material: {
  version: 3,
  enforceTokens: true,
  components: {
    enforceStandalone: false,
    requireExplicitStandalone: true,
    naming: {
      prefix: 'md3-',
      pattern: '^md3-[a-z-]+$'
    }
  }
}
```

### Theming Configuration

```typescript
theming: {
  enforceCustomProperties: true,
  namingPattern: '^(--md-sys-|--mat-)',
  tokens: {
    required: true,
    categories: ['color', 'typography', 'elevation', 'motion']
  }
}
```

## Usage

### Component Validation

Components are automatically validated against the following criteria:

1. Proper selector naming (`md3-` prefix)
2. Material Design token usage
3. Style structure and nesting
4. Template structure
5. BEM naming conventions

### Style Validation

Styles are checked for:

- Proper token usage
- Maximum nesting depth
- BEM naming conventions
- Required structural elements
- Color token usage (no hex values)

### Linting Configuration

The platform includes pre-configured linting rules:

```typescript
linting: {
  eslint: {
    extends: [
      'plugin:@nx/angular',
      'plugin:@angular-eslint/template/process-inline-templates'
    ],
    rules: {
      '@angular-eslint/prefer-standalone-component': 'off',
      '@angular-eslint/no-standalone-false': 'off'
    }
  },
  stylelint: {
    extends: ['stylelint-config-standard-scss'],
    rules: {
      'selector-class-pattern': '^(md3-|mat-)',
      'custom-property-pattern': '^(--md-sys-|--mat-)',
      'color-no-hex': true,
      'color-named': 'never'
    }
  }
}
```

## CI/CD Integration

The platform includes GitHub Actions integration with required checks:

- Build
- Test
- Lint
- E2E Tests

## Development

### Prerequisites

- Node.js
- Angular CLI
- Nx CLI

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run validation: `nx run mcp:validate`

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
