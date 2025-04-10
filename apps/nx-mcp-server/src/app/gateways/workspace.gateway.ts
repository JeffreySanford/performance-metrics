import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
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
  @WebSocketServer()
  server!: Server;

  private readonly disconnectSubject = new Subject<void>();
  private readonly workspaceUpdates = new Subject<any>();
  private readonly heartbeat$ = timer(0, 30000).pipe(
    map(() => ({ type: 'heartbeat', timestamp: Date.now() })),
    share()
  );

  constructor(private readonly standards: WorkspaceStandardsConfig) {}

  handleConnection(client: Socket): void {
    const clientId = client.id;
    console.log(`Client connected: ${clientId}`);

    // Set up client streams
    const clientStream$ = merge(
      this.workspaceUpdates.asObservable(),
      this.heartbeat$
    ).pipe(
      takeUntil(this.disconnectSubject)
    );

    // Subscribe client to the hot observable stream
    const subscription = clientStream$.subscribe(update => {
      client.emit('update', update);
    });

    // Store subscription for cleanup
    client.data.subscription = subscription;
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
    if (client.data.subscription) {
      client.data.subscription.unsubscribe();
    }
    this.disconnectSubject.next();
  }

  @SubscribeMessage('validateComponent')
  onValidateComponent(client: Socket, payload: any): void {
    this.standards.validateComponent(payload).pipe(
      takeUntil(this.disconnectSubject),
      tap((result: ValidationResult) => {
        client.emit('validationResult', result);
      })
    ).subscribe();
  }

  @SubscribeMessage('enforceStandards')
  onEnforceStandards(client: Socket, payload: { code: string }): Observable<string[]> {
    return this.standards.enforceRxjsPatterns(payload.code);
  }

  @SubscribeMessage('getStandards')
  onGetStandards(): Observable<any> {
    return this.standards.getStandards();
  }

  // Method to push updates to all connected clients
  pushUpdate(update: any): void {
    this.workspaceUpdates.next(update);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): void {
    this.server.emit('message', payload);
  }
} 