import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Custom WebSocket adapter to handle global prefixes correctly.
 */
export class SocketIoAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIoAdapter.name);
  private readonly globalPrefix: string;

  constructor(
    app: INestApplicationContext,
    private configService: ConfigService,
  ) {
    super(app);
    this.globalPrefix = this.configService.get<string>('GLOBAL_PREFIX', 'api');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const path = `/${this.globalPrefix}/socket.io`; // Define the path including the global prefix
    this.logger.log(`Creating Socket.IO server with explicit path: ${path}`);

    const corsOrigin = this.configService.get<string>('CORS_ORIGIN', 'http://localhost:4200');
    const corsOptions = {
      origin: corsOrigin.split(','), // Support multiple origins if needed
      methods: ['GET', 'POST'],
      credentials: true,
    };

    // Start with base options, ensuring adapter is handled correctly
    const serverOptionsWithCors: Partial<ServerOptions> = {
      ...options, // Spread existing options first
      path: path, // Override or set the path
      cors: corsOptions, // Override or set CORS options
      serveClient: false, // We don't need the client library served
    };

    // Conditionally add the adapter only if it exists in the original options
    if (options?.adapter) {
      serverOptionsWithCors.adapter = options.adapter;
    }

    // Cast to ServerOptions after ensuring compatibility
    return super.createIOServer(port, serverOptionsWithCors as ServerOptions);
  }
} 