# Backend Server (`nx-mcp-server`)

This NestJS application serves as the backend for the MCP Monitoring & Validation platform.

## Features

-   **WebSocket Gateway:** Provides real-time communication capabilities via Socket.IO, accessible at the configured path (default: `/api/socket.io`). Uses a custom `SocketIoAdapter` to handle the global API prefix correctly.
-   **Performance Metrics:** Includes a `MetricsService` that uses `@nestjs/schedule` to periodically collect basic CPU and Memory usage statistics (using Node.js `os` and `process` modules).
-   **Metrics Broadcasting:** Pushes collected performance data to all connected WebSocket clients via the `update` event with a structure like `{ type: 'serverMetrics', payload: { timestamp, cpu, memory: { used, total } } }`.
-   **Heartbeat:** Sends a simple heartbeat message (`{ type: 'heartbeat', timestamp }`) periodically via the `update` event to help clients detect connection status.
-   **Component Validation Endpoint:** Exposes a `validateComponent` message handler via WebSocket. It expects a payload object `{ ts: string; scss: string; html: string }` containing the code parts of an Angular component.
-   **Validation Logic (Placeholder):** Uses a `WorkspaceStandardsConfig` service to handle the validation. **Note:** The actual validation logic within this service is currently a placeholder and needs implementation.
-   **Validation Response:** Emits the validation results back to the requesting client via the `validationResult` event (`{ isValid: boolean; violations: string[] }`) or a `validationError` event if the process fails internally.
-   **Configuration:** Uses `@nestjs/config` for managing environment variables (port, API prefix, CORS origins).
-   **Basic REST API:** Includes a default controller at `/api` for basic health checks.

## Running the Server

1.  **Ensure Dependencies:** Make sure all root project dependencies are installed (`npm install` in the workspace root).
2.  **Start the Server:** From the workspace root, run:
    ```bash
    nx serve nx-mcp-server
    ```
3.  **Endpoints:**
    *   REST API Base: `http://localhost:3000/api` (default port)
    *   WebSocket Path: `ws://localhost:3000/api/socket.io` (default port and prefix)

## Development Notes

-   The `WorkspaceStandardsConfig.validateComponent` method requires implementation to perform actual checks based on the received `ts`, `scss`, and `html` code.
-   The CPU metrics collection in `MetricsService` is rudimentary and should be improved for accuracy in production scenarios. 