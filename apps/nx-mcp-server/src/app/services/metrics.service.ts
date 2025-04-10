import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { WorkspaceGateway } from '../gateways/workspace.gateway';
import * as os from 'os';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMilliseconds = 5000; // Send metrics every 5 seconds

  constructor(
    private readonly workspaceGateway: WorkspaceGateway,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.startMetricsInterval();
  }

  startMetricsInterval(): void {
    // Clear existing interval if any
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.schedulerRegistry.deleteInterval('sendMetrics');
    }

    const callback = () => {
      this.sendMetrics();
    };

    this.intervalId = setInterval(callback, this.intervalMilliseconds);
    this.schedulerRegistry.addInterval('sendMetrics', this.intervalId);
    this.logger.log(`Started metrics interval (${this.intervalMilliseconds}ms)`);
  }

  stopMetricsInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.schedulerRegistry.deleteInterval('sendMetrics');
      this.intervalId = null;
      this.logger.log('Stopped metrics interval');
    }
  }

  private sendMetrics(): void {
    try {
      const metricsPayload = this.collectMetrics();
      this.workspaceGateway.pushUpdate({
        type: 'serverMetrics',
        payload: metricsPayload,
      });
      // Optional: Log metrics being sent
      // this.logger.verbose(`Sent metrics: ${JSON.stringify(metricsPayload)}`);
    } catch (error) {
      this.logger.error('Failed to collect or send metrics', error);
    }
  }

  private collectMetrics(): any {
    // --- CPU Usage Calculation (Basic) ---
    // Node's os.cpus() gives info per core. A simple average load requires calculation over time.
    // For simplicity here, we'll use a placeholder or a basic snapshot.
    // A more robust approach would involve sampling CPU times over the interval.
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });
    // This is a very rough estimate of *average* load since boot, not current load.
    const avgLoadSinceBoot = 1 - totalIdle / totalTick;

    // --- Memory Usage ---
    const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemoryMB = Math.round(os.freemem() / 1024 / 1024);
    const usedMemoryMB = totalMemoryMB - freeMemoryMB;

    return {
      timestamp: Date.now(),
      // Using process.memoryUsage() for Node process specific memory is often more relevant
      memory: {
        // rss: Resident Set Size - memory occupied by the process
        used: Math.round(process.memoryUsage().rss / 1024 / 1024),
        total: totalMemoryMB, // Total system memory for context
        // heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        // heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      // Placeholder for CPU - replace with a better method if needed
      cpu: Math.min(Math.max(avgLoadSinceBoot, 0), 1) || 0.1, // Basic clamp & default
    };
  }

  // Optional: Implement OnModuleDestroy to clean up the interval
  // onModuleDestroy() {
  //   this.stopMetricsInterval();
  // }
} 