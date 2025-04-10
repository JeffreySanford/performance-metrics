import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

// Components
import { AppComponent } from './app.component';
import { NxWelcomeComponent } from './components/nx-welcome/nx-welcome.component';
import { McpConsoleComponent } from './components/mcp-console/mcp-console.component';
import { McpMetricsComponent } from './components/mcp-metrics/mcp-metrics.component';

// Routes
import { appRoutes } from './app.routes';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    RouterModule.forRoot(appRoutes),
    // Material Modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    // Standalone Components
    NxWelcomeComponent,
    McpConsoleComponent,
    McpMetricsComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { } 