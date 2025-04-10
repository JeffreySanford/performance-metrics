# Installation Guide

## Required Files and Structure

```
apps/
├── nx-mcp-server/                    # MCP Server Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── config/              # Configuration files
│   │   │   │   ├── material.config.ts
│   │   │   │   ├── theming.config.ts
│   │   │   │   ├── workspace-standards.config.ts
│   │   │   │   └── index.ts
│   │   │   ├── gateways/           # WebSocket gateways
│   │   │   │   ├── workspace.gateway.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/           # Core services
│   │   │   │   ├── validation.service.ts
│   │   │   │   ├── workspace.service.ts
│   │   │   │   └── index.ts
│   │   │   └── app.module.ts
│   │   └── main.ts
│   ├── package.json
│   └── tsconfig.json
├── performance-metrics/              # Example Angular application
│   └── ...
└── shared/                          # Shared libraries
    └── material-tokens/             # Material Design tokens

Configuration Files:
├── .eslintrc.json                   # ESLint configuration
├── .stylelintrc.json               # Stylelint configuration
├── nx.json                         # Nx workspace configuration
├── package.json                    # Project dependencies
└── tsconfig.base.json             # Base TypeScript configuration

```

## Core Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@angular/core": "^17.0.0",
    "@angular/material": "^17.0.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "@nestjs/websockets": "^10.0.0",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nx/angular": "^17.0.0",
    "@nx/eslint-plugin": "^17.0.0",
    "@angular-eslint/eslint-plugin": "^17.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "stylelint": "^15.0.0",
    "stylelint-config-standard-scss": "^10.0.0",
    "jest": "^29.0.0",
    "playwright": "^1.40.0"
  }
}
```

## Configuration Files

### 1. ESLint Configuration (.eslintrc.json)
```json
{
  "extends": [
    "plugin:@nx/angular",
    "plugin:@angular-eslint/template/process-inline-templates"
  ],
  "rules": {
    "@angular-eslint/prefer-standalone-component": "off",
    "@angular-eslint/no-standalone-false": "off"
  }
}
```

### 2. Stylelint Configuration (.stylelintrc.json)
```json
{
  "extends": ["stylelint-config-standard-scss"],
  "rules": {
    "selector-class-pattern": "^(md3-|mat-)",
    "custom-property-pattern": "^(--md-sys-|--mat-)",
    "color-no-hex": true,
    "color-named": "never"
  }
}
```

### 3. Material Configuration (apps/nx-mcp-server/src/app/config/material.config.ts)
```typescript
export const materialConfig = {
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
};
```

### 4. Theming Configuration (apps/nx-mcp-server/src/app/config/theming.config.ts)
```typescript
export const themingConfig = {
  enforceCustomProperties: true,
  namingPattern: '^(--md-sys-|--mat-)',
  tokens: {
    required: true,
    categories: ['color', 'typography', 'elevation', 'motion']
  }
};
```

## Installation Steps

1. **Create Nx Workspace**
   ```bash
   npx create-nx-workspace@latest
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Generate MCP Server Application**
   ```bash
   nx g @nx/nest:application nx-mcp-server
   ```

4. **Generate Required Files**
   ```bash
   nx g @nx/nest:module config --project=nx-mcp-server
   nx g @nx/nest:module services --project=nx-mcp-server
   nx g @nx/nest:module gateways --project=nx-mcp-server
   ```

5. **Copy Configuration Files**
   - Copy the configuration files to their respective locations as shown in the directory structure

6. **Set Up WebSocket Gateway**
   ```bash
   nx g @nx/nest:gateway workspace --project=nx-mcp-server
   ```

7. **Verify Installation**
   ```bash
   nx run nx-mcp-server:serve
   ```

## Post-Installation

1. **Configure Your Angular Application**
   - Add the MCP configuration to your `angular.json`
   - Set up Material Design tokens
   - Configure component prefixes

2. **Set Up CI/CD**
   - Configure GitHub Actions using the provided workflow templates
   - Set up required build, test, and lint checks

3. **Verify Setup**
   ```bash
   nx run-many --target=lint --all
   nx run-many --target=test --all
   ```

## Troubleshooting

Common issues and their solutions:

1. **Type Errors**
   - Ensure TypeScript version matches the requirements
   - Check `tsconfig.base.json` for proper path mappings

2. **Linting Errors**
   - Run `nx lint --fix` to automatically fix common issues
   - Check ESLint and Stylelint configurations

3. **WebSocket Connection Issues**
   - Verify the WebSocket gateway is properly configured
   - Check port configurations in `main.ts`

For more detailed troubleshooting, please refer to the documentation or open an issue on GitHub. 