import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject, merge, timer } from 'rxjs';
import { map, takeUntil, share, switchMap, tap } from 'rxjs/operators';
import { WorkspaceStandardsConfig } from '../config/workspace-standards.config';

interface ValidationResult {
  isValid: boolean;
  violations: string[];
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:4200', // Allow your Angular app's origin
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class WorkspaceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // Instantiate Logger directly
  private readonly logger = new Logger(WorkspaceGateway.name);

  @WebSocketServer()
  server!: Server;

  private readonly disconnectSubject = new Subject<void>();
  private readonly workspaceUpdates = new Subject<any>();
  private readonly heartbeat$ = timer(0, 30000).pipe(
    map(() => ({ type: 'heartbeat', timestamp: Date.now() })),
    share()
  );

  // Logger removed from constructor
  constructor(private readonly standards: WorkspaceStandardsConfig) {}

  handleConnection(client: Socket): void {
    const clientId = client.id;
    this.logger.log(`Client connected: ${clientId}`);

    const clientStream$ = merge(
      this.workspaceUpdates.asObservable(),
      this.heartbeat$
    ).pipe(
      takeUntil(this.disconnectSubject)
    );

    const subscription = clientStream$.subscribe(update => {
      client.emit('update', update);
    });

    client.data.subscription = subscription;
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (client.data.subscription) {
      client.data.subscription.unsubscribe();
    }
    this.disconnectSubject.next();
  }

  @SubscribeMessage('validateComponent')
  onValidateComponent(client: Socket, payload: { ts: string; scss: string; html: string }): void {
    // Note: this.standards.validateComponent needs updating for the new payload
    this.standards.validateComponent(payload).pipe(
      takeUntil(this.disconnectSubject),
      tap((result: ValidationResult) => {
        this.logger.log(`Validation successful for client ${client.id}, emitting result.`);
        client.emit('validationResult', result);
      })
    ).subscribe({
        error: (err) => {
            this.logger.error(`Validation failed for client ${client.id}:`, err);
            client.emit('validationError', {
                message: 'Validation process failed on the server.',
                error: err.message || 'Unknown error'
            });
        }
    });
  }

  @SubscribeMessage('enforceStandards')
  onEnforceStandards(client: Socket, payload: { code: string }): Observable<string[]> {
    return this.standards.enforceRxjsPatterns(payload.code);
  }

  @SubscribeMessage('getStandards')
  onGetStandards(): Observable<any> {
    return this.standards.getStandards();
  }

  // Method to push updates to all connected clients (used by MetricsService)
  pushUpdate(update: any): void {
    this.workspaceUpdates.next(update);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): void {
    this.server.emit('message', payload);
  }
}