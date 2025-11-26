import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import io from 'socket.io-client'; // Import socket.io client correctly

// Config interface for WebSocket
interface WebSocketConfig {
  url: string;
  options?: {
    transports: string[];
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    reconnectionDelayMax: number;
    timeout?: number;
    path?: string;
    forceNew?: boolean;
    autoConnect?: boolean;
  };
  useMockOnFailure?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket!: ReturnType<typeof io>; // Fix type definition
  private readonly connectionStateSubject$ = new BehaviorSubject<boolean>(false);
  
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced to fail faster
  private reconnectInterval = 1000; // 1 second base interval
  private useMockData = false; // Start with real connection attempt first
  
  private config: WebSocketConfig = {
    url: 'http://localhost:3000', 
    options: {
      transports: ['polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
      reconnectionAttempts: 2,
      timeout: 2000, // Reduced timeout for faster fallback
      path: '/socket.io/',
      forceNew: true,
      autoConnect: true, // Changed to true - connect automatically at startup
    },
    useMockOnFailure: true
  };

  constructor() {
    console.log('WebSocket service initializing - attempting real connection first');
    // Try to connect to real server
    this.initializeSocket();
  }

  // Public getter for connection state as observable
  get connectionState$(): Observable<boolean> {
    return this.connectionStateSubject$.asObservable();
  }
  
  // Check if using mock data
  get isMockMode(): boolean {
    return this.useMockData;
  }

  // Initialize the socket connection
  private initializeSocket(): void {
    // Check if we already have a socket instance
    if (this.socket) {
      this.disconnect(); // Close any existing connection
    }

    // Don't try to reconnect if we're already in mock mode
    if (this.useMockData) {
      console.log('WebSocket in mock mode, not attempting real connection');
      return;
    }

    try {
      console.log(`Attempting to connect to server at ${this.config.url} using polling transport`);
      
      this.socket = io(this.config.url, this.config.options);

      // Setup event handlers
      this.socket.on('connect', () => {
        console.log(`Socket.IO connected successfully to ${this.config.url}`);
        this.connectionStateSubject$.next(true);
        this.reconnectAttempts = 0;
        this.useMockData = false;
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log(`Socket.IO disconnected: ${reason}`);
        this.connectionStateSubject$.next(false);
        this.attemptReconnect();
      });

      this.socket.on('connect_error', (error: Error) => {
        console.warn(`Socket.IO connection error to ${this.config.url}:`, error.message);
        this.connectionStateSubject$.next(false);
        this.attemptReconnect();
      });

      // Add handlers for transport events
      this.socket.io.on('error', (error: Error) => {
        console.error('Socket.IO transport error:', error);
        this.connectionStateSubject$.next(false);
      });

      this.socket.io.on('reconnect_attempt', (attempt: number) => {
        console.log(`Socket.IO reconnect attempt #${attempt}`);
      });
      
      this.socket.io.on('reconnect_failed', () => {
        console.log('Socket.IO reconnection failed completely, switching to mock data');
        this.enableMockMode();
      });
      
      // Add timeout to switch to mock mode if no connection after 5 seconds
      setTimeout(() => {
        if (!this.socket.connected && !this.useMockData) {
          console.log('Socket.IO connection timeout after 5 seconds, enabling mock mode');
          this.enableMockMode();
        }
      }, 5000);
      
    } catch (error) {
      console.error('Failed to initialize Socket.IO:', error);
      this.enableMockMode();
    }
  }

  // Public method to connect/reconnect - must be public for template access
  public connect(): void {
    // Reset to attempt real connection again
    this.useMockData = false;
    this.reconnectAttempts = 0;
    
    console.log('Manual connect requested');
    if (this.socket && !this.socket.connected) {
      console.log('Attempting to connect socket');
      this.socket.connect();
    } else if (!this.socket) {
      console.log('No socket instance, initializing');
      this.initializeSocket();
    } else {
      console.log('Socket already connected');
    }
  }

  // Public method to disconnect
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Listen for events
  listen$<T>(eventName: string): Observable<T> {
    // If in mock mode, return empty observable or mock data
    if (this.useMockData) {
      console.log(`Mock mode: Listening for event '${eventName}' (no real events will be received)`);
      return of() as Observable<T>;
    }

    return new Observable<T>((observer) => {
      this.socket.on(eventName, (data: T) => {
        observer.next(data);
      });
      
      return () => {
        this.socket.off(eventName);
      };
    });
  }

  // Emit events
  emit$<T>(eventName: string, data: T): void {
    if (this.useMockData) {
      console.log(`Mock mode: Event '${eventName}' not sent (using mock data)`);
      return;
    }
    
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`Cannot emit event '${eventName}': Socket not connected`);
    }
  }

  // Configure the WebSocket service
  configure(config: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reconnect with new config if already initialized
    if (this.socket) {
      this.initializeSocket();
    }
  }

  // Enable mock mode
  enableMockMode(): void {
    if (!this.useMockData) {
      console.log('Enabling mock data mode - server appears to be unavailable');
      this.useMockData = true;
      this.connectionStateSubject$.next(false);
      
      // Close any existing socket to prevent resource leaks
      if (this.socket) {
        try {
          this.socket.disconnect();
        } catch (err) {
          console.error('Error during socket disconnect:', err);
        }
      }
    }
  }

  // Modified to use exponential backoff for reconnection
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      // Calculate exponential backoff delay (1s, 2s, 4s)
      const backoffDelay = Math.min(
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
        5000 // Cap at 5 seconds max
      );
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) after ${backoffDelay}ms...`);
      
      setTimeout(() => {
        if (!this.useMockData) {
          this.initializeSocket();
        }
      }, backoffDelay);
    } else {
      console.log('Max reconnection attempts reached, switching to mock data mode');
      
      // Enable mock mode if configured
      if (this.config.useMockOnFailure) {
        this.enableMockMode();
      }
    }
  }
}