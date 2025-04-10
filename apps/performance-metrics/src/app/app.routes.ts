import { Route } from '@angular/router';
import { NxWelcomeComponent } from './components/nx-welcome/nx-welcome.component';
import { McpConsoleComponent } from './components/mcp-console/mcp-console.component';
import { McpMetricsComponent } from './components/mcp-metrics/mcp-metrics.component';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full'
  },
  {
    path: 'welcome',
    component: NxWelcomeComponent
  },
  {
    path: 'console',
    component: McpConsoleComponent
  },
  {
    path: 'mcp-validator',
    component: McpMetricsComponent
  }
];
