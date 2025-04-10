# Frontend Application (`performance-metrics`)

This Angular application provides the user interface for the MCP Monitoring & Validation platform.

## Features

-   **Connection:** Connects to the backend (`nx-mcp-server`) WebSocket endpoint (default: `ws://localhost:3000/api/socket.io`) using a dedicated `WebsocketService`.
-   **Component Validation UI (`/mcp-validator` route):**
    -   Allows users to select component files (`.ts`, `.scss`, `.html`) via a file input.
    -   Provides an option to manually paste code into separate text areas for each file type.
    -   Sends the collected code parts (`{ts, scss, html}`) to the backend's `validateComponent` WebSocket message handler.
    -   Displays validation results (`isValid`, `violations`) received from the backend via the `validationResult` event.
    -   Shows a loading indicator during validation.
-   **Performance Monitoring UI (`/mcp-validator` route):**
    -   Displays real-time CPU and Memory usage charts using D3.js.
    -   Receives performance data (`{ type: 'serverMetrics', payload: {...} }`) from the backend via the `update` WebSocket event.
    -   Includes tooltips on charts showing specific values and percentage change.
-   **Live Updates Feed:** Displays raw messages (like heartbeats or other non-metric updates) received via the `update` WebSocket event.
-   **Styling:** Uses Angular Material components and custom SCSS for styling.

## Running the Application

1.  **Ensure Dependencies:** Make sure all root project dependencies are installed (`npm install` in the workspace root).
2.  **Ensure Backend is Running:** Start the `nx-mcp-server` application first.
3.  **Start the Frontend:** From the workspace root, run:
    ```bash
    nx serve performance-metrics
    ```
4.  **Access:** Open your browser to `http://localhost:4200/mcp-validator` (default port and route).

## Development Notes

-   Uses Angular Standalone Components (`McpMetricsComponent`).
-   Relies on RxJS for handling asynchronous operations and WebSocket events.
-   Uses `ChangeDetectionStrategy.OnPush` in `McpMetricsComponent`, requiring manual change detection triggers (`cdr.markForCheck()`) after asynchronous updates.
-   Further styling and UI refinements can be implemented. 