import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkspaceGateway } from './gateways/workspace.gateway';
import { WorkspaceStandardsConfig } from './config/workspace-standards.config';
import { MetricsService } from './services/metrics.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [AppService, WorkspaceGateway, WorkspaceStandardsConfig, MetricsService],
})
export class AppModule {}
