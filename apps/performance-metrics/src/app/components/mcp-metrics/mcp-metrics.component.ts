import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { WebsocketService } from '../../services/websocket.service'; // Corrected path
import { Subject, Subscription } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';

interface ValidationResponse {
  isValid: boolean;
  violations: string[];
}

@Component({
  selector: 'app-mcp-metrics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './mcp-metrics.component.html',
  styleUrls: ['./mcp-metrics.component.scss']
})
export class McpMetricsComponent implements OnInit, OnDestroy {
  
  codeToValidate = new FormControl('<app-example-component [input]="value"></app-example-component>');
  validationResult: ValidationResponse | null = null;
  isLoading = false;
  updates: any[] = [];
  private destroySubject$ = new Subject<void>();

  // Store subscriptions
  private validationSubscription: Subscription | undefined;
  private updateSubscription: Subscription | undefined;

  constructor(private websocketService: WebsocketService) { }

  ngOnInit(): void {
    this.validationSubscription = this.websocketService.listen<ValidationResponse>('validationResult')
      .pipe(takeUntil(this.destroySubject$))
      .subscribe(result => {
        console.log('Validation Result Received:', result);
        this.validationResult = result;
        this.isLoading = false; 
      });

    this.updateSubscription = this.websocketService.listen<any>('update')
      .pipe(takeUntil(this.destroySubject$))
      .subscribe(update => {
        console.log('General Update Received:', update);
        this.updates.unshift(update); 
        if (this.updates.length > 20) {
          this.updates.pop(); 
        }
      });
  }

  ngOnDestroy(): void {
    this.destroySubject$.next();
    this.destroySubject$.complete();
    // Explicit unsubscribe (though takeUntil handles it too)
    this.validationSubscription?.unsubscribe();
    this.updateSubscription?.unsubscribe();
  }

  validateComponentCode(): void {
    const code = this.codeToValidate.value;
    if (code) {
      console.log('Sending code for validation:', code);
      this.isLoading = true;
      this.validationResult = null; // Clear previous results
      // Use the specific event name expected by the server gateway
      this.websocketService.emit('validateComponent', { code: code }); 
    }
  }
} 