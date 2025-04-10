/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import { SocketIoAdapter } from './app/adapters/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX', 'api');

  app.useWebSocketAdapter(new SocketIoAdapter(app, configService));

  const clientUrl = configService.get<string>('CORS_ORIGIN', 'http://localhost:4200');
  app.enableCors({
    origin: clientUrl.split(','),
    credentials: true,
  });

  app.setGlobalPrefix(globalPrefix);
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(`🔌 WebSocket server is expected to be running on ws://localhost:${port}/${globalPrefix}/socket.io`);
}

bootstrap();
