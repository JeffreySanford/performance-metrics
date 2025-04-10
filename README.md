# Material Component Platform (MCP) Monitoring & Validation

A comprehensive platform for enforcing Material Design 3 standards, best practices, and monitoring server performance in Angular applications.

## Overview

The Material Component Platform (MCP) provides a toolset to help enforce consistent standards across Angular applications using Material Design 3. It includes:

1.  **Real-time Server Performance Monitoring:** A dashboard (`performance-metrics` app) displaying live CPU and Memory usage of the backend server, received via WebSockets.
2.  **Component Standards Validation:** A WebSocket-based service (`nx-mcp-server`) and UI (`performance-metrics` app) to validate Angular component code (TS, SCSS, HTML) against configurable standards.

## Architecture

-   **`nx-mcp-server` (Backend):** A NestJS application providing:
    -   A WebSocket gateway (`/api/socket.io`) for real-time communication.
    -   A `MetricsService` that periodically collects basic server performance data (CPU, Memory) and pushes it to connected clients via the `update` event (`{type: 'serverMetrics', ...}`).
    -   A message handler (`validateComponent`) that receives component code parts (`{ts, scss, html}`) for validation.
    -   A `WorkspaceStandardsConfig` service (placeholder for actual validation logic) that processes the validation request.
    -   Standard REST endpoint (`/api`) for basic health checks.
-   **`performance-metrics` (Frontend):** An Angular application providing:
    -   A UI (`/mcp-validator` route) to connect to the backend WebSocket.
    -   Functionality to select component files (`.ts`, `.scss`, `.html`) or paste code manually.
    -   A button to send the code parts to the backend's `validateComponent` endpoint.
    -   Display area for validation results (violations or success message) received via the `validationResult` event.
    -   Real-time D3.js charts visualizing CPU and Memory usage data received via the `update` event.
    -   A `WebsocketService` to manage the Socket.IO connection.

## Features Demonstrated

-   **Real-time Communication:** Bidirectional communication using WebSockets (Socket.IO) between Angular frontend and NestJS backend.
-   **Server Performance Monitoring:** Collection (basic OS/process metrics) and visualization (D3.js line charts) of server performance data.
-   **Component Validation Endpoint:** A mechanism to send code snippets for backend validation (currently a placeholder).
-   **Angular Frontend:** Standalone components, Reactive Forms, Material Design components, D3 chart integration, file input handling.
-   **NestJS Backend:** WebSocket Gateway, Custom Adapter (for path prefixing), Services, Modules, Scheduling (`@nestjs/schedule`), Configuration (`@nestjs/config`).
-   **Nx Workspace:** Monorepo structure for managing frontend and backend applications.

## Getting Started

### Prerequisites

-   Node.js (LTS version recommended)
-   npm or yarn
-   Nx CLI (`npm install -g nx`)

### Setup

1.  Clone the repository: `git clone <repository-url>`
2.  Navigate to the project directory: `cd performance-metrics`
3.  Install dependencies: `npm install`

### Running the Applications

1.  **Start the Backend Server:**
    Open a terminal and run:
    ```bash
    nx serve nx-mcp-server
    ```
    The server will start, usually listening on `http://localhost:3000/api` for REST and `ws://localhost:3000/api/socket.io` for WebSockets.

2.  **Start the Frontend Application:**
    Open a *separate* terminal and run:
    ```bash
    nx serve performance-metrics
    ```
    The Angular development server will start, usually accessible at `http://localhost:4200/`.

3.  **Access the Validator/Monitor:**
    Open your web browser and navigate to `http://localhost:4200/mcp-validator`.

### Usage

-   The performance charts should start displaying data received from the backend shortly after the page loads.
-   Use the "Select Component Files" button to choose `.ts`, `.scss`, and `.html` files.
-   Alternatively, click "Paste Code Manually" to reveal text areas for pasting code.
-   Click "Validate Component" to send the code to the backend. Validation results (or errors if the backend logic fails) will be displayed.

## Development Notes

-   **Backend Validation:** The actual validation logic within `WorkspaceStandardsConfig.validateComponent` is currently a placeholder and needs significant implementation to handle the `{ts, scss, html}` structure and apply specific rules.
-   **CPU Metrics:** The backend CPU metric collection is very basic (average since boot) and should be replaced with a more accurate real-time method for production use.
-   **Styling:** Further enhancements can be made to improve the visual appeal and infographic quality.

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

## Linting Configuration

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

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
