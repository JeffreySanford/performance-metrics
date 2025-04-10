import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { McpMetricsComponent } from '../mcp-metrics/mcp-metrics.component';

interface ConsoleMessage {
  timestamp: number;
  message: string;
  type: 'input' | 'output' | 'error';
}

@Component({
  selector: 'app-mcp-console',
  templateUrl: './mcp-console.component.html',
  styleUrls: ['./mcp-console.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    McpMetricsComponent
  ]
})
export class McpConsoleComponent implements OnInit, OnDestroy {
  private socket: any;
  private destroy$ = new Subject<void>();
  
  commandInput = new FormControl('');
  consoleHistory: ConsoleMessage[] = [];
  isConnected = false;

  constructor() {
    this.socket = (window as any).mcpSocket;
  }

  ngOnInit(): void {
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.socket.disconnect();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.addMessage('output', 'Connected to MCP Server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.addMessage('error', 'Disconnected from MCP Server');
    });

    this.socket.on('message', (response: any) => {
      this.addMessage('output', JSON.stringify(response, null, 2));
    });

    this.socket.on('error', (error: any) => {
      this.addMessage('error', error.message || 'An error occurred');
    });
  }

  sendCommand(): void {
    const command = this.commandInput.value?.trim();
    if (!command) return;

    this.addMessage('input', command);
    
    try {
      const parsedCommand = JSON.parse(command);
      this.socket.emit('message', parsedCommand);
    } catch {
      // If not JSON, send as plain text
      this.socket.emit('message', command);
    }

    this.commandInput.reset();
  }

  private addMessage(type: ConsoleMessage['type'], content: string): void {
    this.consoleHistory.push({
      type,
      message: content,
      timestamp: Date.now()
    });
  }

  clearConsole(): void {
    this.consoleHistory = [];
  }
} 