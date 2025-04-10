import { Injectable, OnDestroy } from '@angular/core';
import { connect } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Define the type based on the return type of the connect function
type SocketInstance = ReturnType<typeof connect>;

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
  private socket: SocketInstance;
  private readonly socketUrl = 'http://localhost:3000'; // Default MCP server URL
  private readonly socketPath = '/api/socket.io'; // Specify the correct path due to global prefix
  private destroySubject$ = new Subject<void>();

  constructor() {
    this.socket = connect(this.socketUrl, {
      transports: ['websocket'], // Force websocket transport
      path: this.socketPath // Add the path option here
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  ngOnDestroy(): void {
    this.destroySubject$.next();
    this.destroySubject$.complete();
    this.disconnect();
  }

  // Listen for events from the server
  listen<T>(eventName: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      const handler = (data: T) => {
        subscriber.next(data);
      };
      this.socket.on(eventName, handler);

      // Cleanup function when unsubscribed
      return () => {
        this.socket.off(eventName, handler);
      };
    }).pipe(
      takeUntil(this.destroySubject$) // Use updated name here
    );
  }

  // Emit events to the server
  emit<T>(eventName: string, data: T): void {
    this.socket.emit(eventName, data);
  }

  // Disconnect manually if needed
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('WebSocket manually disconnected');
    }
  }
} 