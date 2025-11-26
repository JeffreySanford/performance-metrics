export interface ServerMetrics {
  timestamp: number;
  cpu: number; // 0.0 to 1.0
  memory: {
    used: number; // in MB
    total: number; // in MB
  };
  // Additional metrics (optional for backward compatibility)
  activeSessions?: number;
  cacheHitRatio?: number; // percentage
  taskQueue?: number;
  dbResponseTime?: number; // ms
  healthStatus?: {
    status: string;
    issues: string[];
  };
  // Add missing properties that server is now sending
  metricsSource?: {
    cpu: string;
    memory: string;
    activeSessions: string;
    cacheHitRatio: string;
    taskQueue: string;
    dbResponseTime: string;
  };
  dataSourceDiagnostics?: Record<string, string>;
  // System info
  system?: {
    platform: string;
    arch: string;
    uptime: number; // seconds
    loadavg: number[];
    nodeVersion: string;
  };
}
