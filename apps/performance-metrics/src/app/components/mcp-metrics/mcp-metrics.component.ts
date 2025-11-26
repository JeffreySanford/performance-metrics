import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectionStrategy, 
         ChangeDetectorRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, TemplateRef, ViewContainerRef } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Subject, Subscription, takeUntil, interval, BehaviorSubject, switchMap, fromEvent } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { ValidationResponse } from '../../interfaces/validation.interface';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

// D3 Imports
import * as d3 from 'd3';
import { NumberValue } from 'd3';

// Helpers import - Fixed import path
import { 
  getCpuDashArrayHelper, 
  getMemoryDashArrayHelper, 
  getMetricStatusClassHelper, 
  getTrendIconHelper 
} from '../../helpers/mcp-helpers';

import { 
  PerformanceChartComponent,
  ChartSeries 
} from '../../components/common/performance-chart/performance-chart.component';

import { ServerMetrics } from '../../interfaces/server-metrics.interface';

// Add import for DiagnosticsService
import { DiagnosticsService, DiagnosticsEvent } from '../../services/diagnostics.service';

// Interfaces for data types
interface DataPoint {
  timestamp: number;
  value: number;
}

interface DetailedMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

interface MetricFilter {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

interface SparklineData {
  values: number[];
  timestamps: number[];
}

// Define interface for combined metrics
interface CombinedMetric {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  data: DataPoint[];
  line?: d3.Line<DataPoint>;
  area?: d3.Area<DataPoint>;
}

// Define interface for heartbeat data
interface Heartbeat {
  timestamp: number;
  hostname: string;
  status: string;
  uptime: string;
  os: string;
  version: string;
}

// Define a type for the general update message for clarity
type GeneralUpdate = { type: string; payload?: unknown; timestamp?: number };

// Add interface for event handlers
interface SliderChangeEvent {
  value: number;
  target?: { value?: number };
}

// Define metric updates type
interface MetricUpdates {
  [key: string]: number;
}

@Component({
  selector: 'app-mcp-metrics',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    PerformanceChartComponent,
    MatSliderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Add schema to support mat-chip-option
  templateUrl: './mcp-metrics.component.html',
  styleUrls: ['./mcp-metrics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McpMetricsComponent implements OnInit, AfterViewInit, OnDestroy {
  // --- Visibility State --- 
  areInputsVisible = false;

  // --- Connection Status --- 
  isConnected = false;

  // --- Current Metrics Values --- 
  currentCpuUsage = 0;
  currentMemoryUsed = 0;
  totalMemory = 1024; // Default value in MB
  memoryPercentage = 0;
  avgResponseTime = 0;
  requestsPerSecond = 0;

  // --- Validation Properties --- 
  validationForm = new FormGroup({
    tsCode: new FormControl(''),
    scssCode: new FormControl(''),
    htmlCode: new FormControl(''),
  });
  validationResult: ValidationResponse | null = null;
  isLoading = false;
  generalUpdates: GeneralUpdate[] = [];

  // --- Chart References --- 
  @ViewChild('cpuChart') private cpuChartContainer!: ElementRef;
  @ViewChild('memoryChart') private memoryChartContainer!: ElementRef;
  @ViewChild('combinedChart') private combinedChartContainer!: ElementRef;
  @ViewChild('responseSparkline') private responseSparklineContainer!: ElementRef;
  @ViewChild('requestsSparkline') private requestsSparklineContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('serverStatsTemplate') serverStatsTemplate!: TemplateRef<unknown>;

  // --- Chart Data --- 
  public memoryData: DataPoint[] = [];
  private cpuData: DataPoint[] = [];
  private networkLatencyData: DataPoint[] = [];
  private httpRequestsData: DataPoint[] = [];
  private activeSessionsData: DataPoint[] = [];
  private cacheHitRatioData: DataPoint[] = [];
  private taskQueueData: DataPoint[] = [];
  private dbResponseTimeData: DataPoint[] = [];
  private responseTimeData: SparklineData = { values: [], timestamps: [] };
  private requestsData: SparklineData = { values: [], timestamps: [] };

  // --- Chart Elements --- 
  private svgCpu:
    | d3.Selection<SVGGElement, unknown, HTMLElement, unknown>
    | undefined;
  private svgMemory:
    | d3.Selection<SVGGElement, unknown, HTMLElement, unknown>
    | undefined;
  private svgCombined:
    | d3.Selection<SVGGElement, unknown, HTMLElement, unknown>
    | undefined;
  private responseSparklineSvg: d3.Selection<SVGSVGElement, unknown, null, undefined> | undefined;
  private requestsSparklineSvg: d3.Selection<SVGSVGElement, unknown, null, undefined> | undefined;
  
  // --- Define cpuLine and memoryLine with proper types --- 
  private cpuLine: d3.Line<DataPoint> | undefined;
  private memoryLine: d3.Line<DataPoint> | undefined;
  private responseLine: d3.Line<number> | undefined;
  private requestsLine: d3.Line<number> | undefined;

  // --- Chart Scales --- 
  private xScale: d3.ScaleTime<number, number> | undefined;
  private yCpuScale: d3.ScaleLinear<number, number> | undefined;
  private yMemoryScale: d3.ScaleLinear<number, number> | undefined;
  private zoomedCpuXScale: d3.ScaleTime<number, number> | undefined;
  private zoomedMemoryXScale: d3.ScaleTime<number, number> | undefined;

  // --- Chart Behavior --- 
  private brushX: d3.BrushBehavior<unknown> | undefined;
  private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>;
  private readonly maxDataPoints = 50;
  private readonly chartMargin = { top: 20, right: 20, bottom: 30, left: 50 };
  private chartWidth = 0;
  private chartHeight = 0;
  private readonly animationDuration = 300;
  private animationInProgress = { value: false };

  // --- Metric Filters --- 
  metricFilters: MetricFilter[] = [
    { id: 'cpu', name: 'CPU Usage', color: '#ff4081', active: false },
    { id: 'memory', name: 'Memory Usage', color: '#3f51b5', active: true },
    { id: 'latency', name: 'Network Latency', color: '#4caf50', active: false },
    { id: 'requests', name: 'HTTP Requests', color: '#ff9800', active: false },
    { id: 'sessions', name: 'Active Sessions', color: '#9c27b0', active: false },
    { id: 'cache', name: 'Cache Hit Ratio', color: '#00bcd4', active: false },
    { id: 'queue', name: 'Task Queue', color: '#8bc34a', active: false },
    { id: 'db', name: 'DB Response Time', color: '#e91e63', active: false },
  ];
  
  filteredMetrics = new Set<string>(['memory']);
  combinedMetrics: CombinedMetric[] = []; // Add this property back

  // --- Detailed Metrics --- 
  detailedMetrics: DetailedMetric[] = [];
  lastHeartbeat: Heartbeat | null = null;

  // --- Utility Properties --- 
  private destroySubject$ = new Subject<void>();
  // Remove duplicate destroy$ property
  private validationSubscription: Subscription | undefined;
  private updateSubscription: Subscription | undefined;

  // Health status for performance chart
  healthStatus: { status: string; timestamp: number } | null = null;
  
  // Chart series for performance chart
  performanceChartSeries: ChartSeries[] = [];

  // Update frequency control
  updateFrequencyMs = 1000; // Default to 1 second
  minUpdateFrequency = 10; // 10ms minimum
  maxUpdateFrequency = 3000; // 3 seconds maximum
  private updateFrequency$ = new BehaviorSubject<number>(this.updateFrequencyMs);
  private mockDataSubscription?: Subscription;

  // Change default to true for live data
  isLiveData = true; // Default to live data

  serverPing = 0;

  // Add diagnostics properties
  diagnosticsEnabled = false;
  diagnosticEvents: DiagnosticsEvent[] = [];
  memoryValueDrops = 0;
  lastMemoryReceived = 0;
  
  // Metrics validation flags
  hasInvalidMemoryValues = false;
  memoryValueProblemSolved = false;
  
  // Add tracking of previous values for change detection
  private previousDetailedMetricValues: {[key: string]: number} = {};
  private updatingTiles: Set<string> = new Set();
  
  // Add missing property for data source diagnostics
  missingDataSources: Record<string, string> = {};

  // Add storage for subscriptions
  private connectSubscription?: Subscription;
  private disconnectSubscription?: Subscription;
  private diagnosticSubscription?: Subscription;
  private mouseLeaveSubscription?: Subscription;
  private connectionState$?: Subscription; // Add missing subscription property

  // Update timeoutSubscriptions array to store all setTimeout subscriptions
  private timeoutSubscriptions: number[] = [];

  constructor(
    public websocketService: WebsocketService,
    private cdr: ChangeDetectorRef,
    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef,
    private diagnostics: DiagnosticsService // Add diagnostics service
  ) {
    // Check if diagnostics mode is enabled
    this.diagnosticsEnabled = this.diagnostics.isDebugMode();
  }

  ngOnInit(): void {
    // First, explicitly connect to ensure we have a WebSocket connection
    this.websocketService.connect();
    
    console.log('Initializing component, ensuring WebSocket connection...');
    
    // Track connection status from WebSocket service - connection getter is public
    this.connectionState$ = this.websocketService.connectionState$
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((connected: boolean) => {
        console.log(`WebSocket connection state changed to: ${connected ? 'connected' : 'disconnected'}`);
        this.isConnected = connected;
        
        // Add diagnostic event for connection changes
        if (this.diagnosticsEnabled) {
          this.diagnostics.addEvent({
            type: 'connection-change',
            message: `WebSocket ${connected ? 'connected' : 'disconnected'}`,
            timestamp: Date.now()
          });
        }
        
        this.cdr.markForCheck();
      });
  
    this.subscribeToUpdates();
    this.initializeDetailedMetrics();
    this.initializeCombinedMetrics();
    this.setupMetricsUpdateInterval();
    
    // Subscribe to diagnostic events - fix duplicate subscriptions
    this.diagnosticSubscription = this.diagnostics.getEvents$()
      .pipe(takeUntil(this.destroySubject$))
      .subscribe(events => {
        this.diagnosticEvents = events;
        
        // Count memory drops
        this.memoryValueDrops = events.filter(e => e.type === 'memory-drop').length;
        
        this.cdr.markForCheck();
      });
      
    // Make sure our initial filter state is in sync
    this.updateFilteredMetrics();
  }

  // Fix the ngAfterViewInit method to properly store the setTimeout
  ngAfterViewInit(): void {
    // Defer chart setup slightly to ensure containers are fully rendered
    const timeoutId = window.setTimeout(() => this.setupCharts(), 0);
    this.timeoutSubscriptions.push(timeoutId);
  }

  ngOnDestroy(): void {
    if (this.diagnosticsEnabled) {
      this.diagnostics.clearEvents(); // Clear events on destroy
    }
    this.destroySubject$.next();
    this.destroySubject$.complete();

    this.validationSubscription?.unsubscribe();
    this.updateSubscription?.unsubscribe();
    this.mockDataSubscription?.unsubscribe();
    this.updateFrequency$.complete();
    this.connectSubscription?.unsubscribe();
    this.disconnectSubscription?.unsubscribe();
    this.diagnosticSubscription?.unsubscribe();
    this.mouseLeaveSubscription?.unsubscribe();
    this.connectionState$?.unsubscribe(); // Add unsubscribe for connectionState$
    

    this.timeoutSubscriptions.forEach(timeoutId => window.clearTimeout(timeoutId));
  }
    

  private subscribeToUpdates(): void {
    // Subscribe to validation results
    this.validationSubscription = this.websocketService
      .listen$<ValidationResponse>('validationResult')
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((result: ValidationResponse) => {
        console.log('Validation Result Received:', result);
        this.validationResult = result;
        this.isLoading = false;
        this.cdr.markForCheck(); // Trigger change detection
      });

    // Subscribe to general updates (heartbeat, metrics, etc.)
    this.updateSubscription = this.websocketService
      .listen$<GeneralUpdate>('update')
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((update: GeneralUpdate) => {
        console.log('General Update Received:', update);
        if (update?.type === 'serverMetrics') {
          this.handleMetricsUpdate(update.payload as ServerMetrics);
        } else if (update?.type === 'heartbeat') {
          // Handle heartbeat updates
          this.lastHeartbeat = update.payload as Heartbeat;
          if (this.lastHeartbeat) {
            this.healthStatus = {
              status: this.lastHeartbeat.status,
              timestamp: this.lastHeartbeat.timestamp
            };
          }
          
          // Add to general updates
          this.generalUpdates.push(update);
          if (this.generalUpdates.length > 10) {
            this.generalUpdates.shift();
          }
        } else {
          // Handle other updates
          this.generalUpdates.push(update);
          if (this.generalUpdates.length > 10) {
            this.generalUpdates.shift();
          }
        }
        this.cdr.markForCheck();
      });
  
    // Additional code to mark connection as established when we get updates
    this.connectSubscription = this.websocketService
      .listen$<Record<string, unknown>>('connect')
      .pipe(takeUntil(this.destroySubject$))
      .subscribe(() => {
        this.isConnected = true;
        this.cdr.markForCheck();
      });
      
    this.disconnectSubscription = this.websocketService
      .listen$<Record<string, unknown>>('disconnect')
      .pipe(takeUntil(this.destroySubject$))
      .subscribe(() => {
        this.isConnected = false;
        this.cdr.markForCheck();
      });
  }

  // --- UI Interaction Methods --- 

  showInputFields(): void {
    this.areInputsVisible = true;
    this.cdr.markForCheck();
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  handleFileSelect(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      // Show inputs when files are selected
      this.areInputsVisible = true;
      // Clear previous values before reading new files
      this.validationForm.reset();

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const reader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>) => {
          const content = e.target?.result as string;
          if (file.name.endsWith('.ts')) {
            this.validationForm.controls.tsCode.setValue(content);
          } else if (file.name.endsWith('.scss')) {
            this.validationForm.controls.scssCode.setValue(content);
          } else if (file.name.endsWith('.html')) {
            this.validationForm.controls.htmlCode.setValue(content);
          }
          this.cdr.markForCheck(); // Update view after file read
        };

        reader.onerror = (e) => {
          console.error('Error reading file:', file.name, e);
          // TODO: Add user-facing error handling (e.g., snackbar)
        };

        reader.readAsText(file); // Read the file as text
      }

      // Reset the file input so the same file(s) can be selected again if needed
      element.value = '';
    }
  }

  validateComponentCode(): void {
    const componentCode = {
      ts: this.validationForm.value.tsCode || '',
      scss: this.validationForm.value.scssCode || '',
      html: this.validationForm.value.htmlCode || '',
    };

    if (
      (componentCode.ts || componentCode.scss || componentCode.html) &&
      !this.isLoading
    ) {
      console.log('Sending component code for validation:', componentCode);
      this.isLoading = true;
      this.validationResult = null; // Clear previous results
      this.websocketService.emit$('validateComponent', componentCode); // Fix: Change emit to emit$
      this.cdr.markForCheck();
    }
  }

  // --- D3 Chart Methods --- 

  private setupCharts(): void {
    if (!this.cpuChartContainer || !this.memoryChartContainer) return;

    // Select the tooltip div
    const closestElement =
      this.cpuChartContainer.nativeElement.closest('mat-card-content');
    if (closestElement) {
      this.tooltip = d3
        .select<HTMLDivElement, unknown>(closestElement)
        .select<HTMLDivElement>('.chart-tooltip');
    } else {
      console.warn('Closest mat-card-content not found.');
    }

    const cpuElement = this.cpuChartContainer.nativeElement;
    const memoryElement = this.memoryChartContainer.nativeElement;

    this.chartWidth =
      cpuElement.offsetWidth - this.chartMargin.left - this.chartMargin.right;
    this.chartHeight = 200 - this.chartMargin.top - this.chartMargin.bottom; // Fixed height for simplicity

    // --- Shared X Scale --- 
    this.xScale = d3.scaleTime().range([0, this.chartWidth]);

    // --- CPU Chart Setup --- 
    this.yCpuScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([this.chartHeight, 0]); // CPU 0-1
    this.svgCpu = d3
      .select<HTMLElement, unknown>(cpuElement)
      .append('svg')
      .attr('width', cpuElement.offsetWidth)
      .attr('height', 200)
      .append('g')
      .attr(
        'transform',
        `translate(${this.chartMargin.left},${this.chartMargin.top})`
      );

    this.cpuLine = d3
      .line<DataPoint>()
      .x((d) => (this.xScale ? this.xScale(d.timestamp) : 0))
      .y((d) => (this.yCpuScale ? this.yCpuScale(d.value) : 0));

    this.svgCpu
      ?.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.chartHeight})`);
    this.svgCpu?.append('g').attr('class', 'y-axis');
    this.svgCpu?.append('path').attr('class', 'line cpu-line');

    // --- Memory Chart Setup --- 
    // Initial domain, will adapt later
    this.yMemoryScale = d3
      .scaleLinear()
      .domain([0, 1024])
      .range([this.chartHeight, 0]);
    this.svgMemory = d3
      .select<HTMLElement, unknown>(memoryElement)
      .append('svg')
      .attr('width', memoryElement.offsetWidth)
      .attr('height', 200)
      .append('g')
      .attr(
        'transform',
        `translate(${this.chartMargin.left},${this.chartMargin.top})`
      );

    this.memoryLine = d3
      .line<DataPoint>()
      .x((d) => (this.xScale ? this.xScale(d.timestamp) : 0))
      .y((d) => (this.yMemoryScale ? this.yMemoryScale(d.value) : 0));

    this.svgMemory
      ?.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${this.chartHeight})`);
    this.svgMemory?.append('g').attr('class', 'y-axis');
    this.svgMemory?.append('path').attr('class', 'line memory-line');

    this.cdr.markForCheck();
    
    // Store the timeout reference
    const timeoutId = window.setTimeout(() => {
      // ...existing code...
    }, 0);
    this.timeoutSubscriptions.push(timeoutId);
  }

  private handleMetricsUpdate(metrics: ServerMetrics): void {
    if (!metrics) return;

    // Check which metrics are real vs simulated
    const isUsingMockData = metrics.metricsSource && 
      Object.values(metrics.metricsSource).some(source => source === 'simulated');
    
    // Store diagnostics if available
    const dataSourceDiagnostics = metrics.dataSourceDiagnostics || {};
    
    // If we have any simulated data, log the details
    if (isUsingMockData && this.isLiveData) {  // Only log warning if in live mode but getting simulated data
      console.log('Some metrics are using simulated data:', metrics.metricsSource);
      console.log('Data source diagnostics:', dataSourceDiagnostics);
      
      // Add to diagnostics events if enabled
      if (this.diagnosticsEnabled) {
        this.diagnostics.addEvent({
          type: 'data-source',
          message: 'Using simulated data for some metrics even in LIVE mode. See details in diagnostics panel.',
          timestamp: Date.now()
        });
        
        // Store which data sources are unavailable
        this.missingDataSources = dataSourceDiagnostics;
      }
    }

    const timestamp = metrics.timestamp;
    const cpuValue = metrics.cpu;
    const memoryValue = metrics.memory.used;
    const memoryTotal = metrics.memory.total;
    
    // Update current values for display
    this.currentCpuUsage = cpuValue * 100; // Convert to percentage
    this.currentMemoryUsed = memoryValue;
    this.totalMemory = memoryTotal;
    this.memoryPercentage = (memoryValue / memoryTotal) * 100;
  
    // Add to data arrays for charts
    this.cpuData.push({ timestamp, value: cpuValue });
    this.memoryData.push({ timestamp, value: memoryValue });
    
    // Check if additional metrics are available from server (used in live mode)
    if (metrics.activeSessions !== undefined && 
        metrics.cacheHitRatio !== undefined &&
        metrics.taskQueue !== undefined &&
        metrics.dbResponseTime !== undefined) {
      
      // Use server data if available
      this.activeSessionsData.push({ timestamp, value: metrics.activeSessions });
      this.cacheHitRatioData.push({ timestamp, value: metrics.cacheHitRatio });
      this.taskQueueData.push({ timestamp, value: metrics.taskQueue });
      this.dbResponseTimeData.push({ timestamp, value: metrics.dbResponseTime });
      
      // Update secondary metrics from server data
      this.avgResponseTime = metrics.dbResponseTime;
      this.requestsPerSecond = Math.round(metrics.activeSessions / 2); // Estimate requests from sessions
    } else if (!this.isLiveData) {
      // Generate mock data only in mock mode
      const mockLatencyValue = 35 + (Math.cos(Date.now() / 12000) * 20) + (Math.random() * 30);
      const mockRequestsValue = 25 + (Math.sin(Date.now() / 6000) * 10) + (Math.random() * 15);
      
      this.networkLatencyData.push({ timestamp, value: mockLatencyValue });
      this.httpRequestsData.push({ timestamp, value: mockRequestsValue });
      
      // Keep data array size limited
      if (this.networkLatencyData.length > this.maxDataPoints) this.networkLatencyData.shift();
      if (this.httpRequestsData.length > this.maxDataPoints) this.httpRequestsData.shift();
      
      // Update secondary metrics
      this.avgResponseTime = mockLatencyValue;
      this.requestsPerSecond = Math.round(mockRequestsValue);
    }
    
    // Always keep data array size limited
    if (this.cpuData.length > this.maxDataPoints) this.cpuData.shift();
    if (this.memoryData.length > this.maxDataPoints) this.memoryData.shift();
    if (this.activeSessionsData.length > this.maxDataPoints) this.activeSessionsData.shift();
    if (this.cacheHitRatioData.length > this.maxDataPoints) this.cacheHitRatioData.shift();
    if (this.taskQueueData.length > this.maxDataPoints) this.taskQueueData.shift();
    if (this.dbResponseTimeData.length > this.maxDataPoints) this.dbResponseTimeData.shift();
    
    // Update the performance chart series
    this.updatePerformanceChartSeries();
    
    // Example update for detailed metrics - adapt based on your data structure
    const detailedUpdates: {[key: string]: number} = {
      'disk-usage': this.currentMemoryUsed * 0.9, // Just an example
      'network-throughput': this.requestsPerSecond * 0.1,
      'thread-count': Math.round(this.currentCpuUsage * 1.5),
      'gc-time': Math.round(this.currentMemoryUsed * 0.3),
      'heap-usage': this.currentMemoryUsed * 0.8,
      'open-files': Math.round(this.currentCpuUsage * 10)
    };
    
    // Update detailed metrics with animation
    this.updateDetailedMetrics(detailedUpdates);
  }

  // Add method to toggle between live and mock data
  toggleDataSource(): void {
    this.isLiveData = !this.isLiveData;
    console.log(`Switched to ${this.isLiveData ? 'LIVE' : 'MOCK'} data`);
    
    // Add diagnostics event for tracking
    this.diagnostics.addEvent({
      type: 'connection-change',
      message: `Switched to ${this.isLiveData ? 'LIVE' : 'MOCK'} data mode`,
      timestamp: Date.now()
    });
    
    // When switching to live mode, ensure connection is established
    if (this.isLiveData) {
      // Attempt to connect or reconnect to the WebSocket
      console.log('Live mode enabled, ensuring WebSocket connection...');
      this.websocketService.connect();
      
      this.diagnostics.addEvent({
        type: 'connection-change',
        message: 'Attempting to establish WebSocket connection',
        timestamp: Date.now()
      });
      
      // Add a check after a short delay to verify connection
      setTimeout(() => {
        if (!this.isConnected) {
          console.log('Connection still not established after timeout');
          this.diagnostics.addEvent({
            type: 'connection-change',
            message: 'Connection attempt timed out, check server availability',
            timestamp: Date.now()
          });
        }
      }, 3000);
    }
    
    // When switching to mock data, clear previous data
    if (!this.isLiveData) {
      // When switching to mock data, clear previous data
      this.activeSessionsData = [];
      this.cacheHitRatioData = [];
      this.taskQueueData = [];
      this.dbResponseTimeData = [];
      
      // Generate initial mock data when switching to mock mode
      this.generateInitialMockData();
    } else {
      // When switching back to live, clear mock data
      this.networkLatencyData = [];
      this.httpRequestsData = [];
    }
    
    this.cdr.markForCheck();
  }

  private updateCharts(memoryTotal: number): void {
    if (
      !this.svgCpu ||
      !this.svgMemory ||
      !this.cpuData.length ||
      !this.memoryData.length
    ) {
      // console.warn('Chart update called before setup or without data.'); // Reduce console noise
      return;
    }

    // --- Update Scales --- 
    const timeDomain = d3.extent(this.cpuData, (d) => d.timestamp) as [
      number,
      number
    ];
    if (!timeDomain[0] || !timeDomain[1]) {
      console.warn('Invalid time domain for charts:', timeDomain);
      return; // Don't proceed if time domain is invalid
    }
    this.xScale?.domain(timeDomain);
    this.yMemoryScale?.domain([0, memoryTotal]);

    // *** DEBUG LOGS START *** 
    console.log('Updating charts...');
    console.log(
      'Time Domain:',
      timeDomain.map((t) => new Date(t).toLocaleTimeString())
    );
    console.log('CPU Data Points:', this.cpuData.length);
    console.log('Memory Data Points:', this.memoryData.length);
    console.log('Memory Y Domain:', this.yMemoryScale?.domain());
    // *** DEBUG LOGS END *** 

    // --- Update Axes --- 
    const xAxis = this.xScale && d3
      .axisBottom(this.xScale)
      .ticks(5)
      .tickFormat((domainValue: NumberValue | Date) => {
        const date =
          domainValue instanceof Date
            ? domainValue
            : new Date(domainValue.valueOf());
        return d3.timeFormat('%H:%M:%S')(date);
      });

    const yCpuAxis = this.yCpuScale && d3
      .axisLeft(this.yCpuScale)
      .ticks(5)
      .tickFormat((domainValue: NumberValue) => d3.format('.0%')(domainValue.valueOf()));

    const yMemoryAxis = this.yMemoryScale && d3
      .axisLeft(this.yMemoryScale)
      .ticks(5)
      .tickFormat((domainValue: NumberValue) => `${domainValue.valueOf()} MB`);

    // Safe type handling for axis calls
    if (this.svgCpu && xAxis) {
      this.svgCpu.select<SVGGElement>('.x-axis').call(xAxis);
    }
    if (this.svgCpu && yCpuAxis) {
      this.svgCpu.select<SVGGElement>('.y-axis').call(yCpuAxis);
    }
    if (this.svgMemory && xAxis) {
      this.svgMemory.select<SVGGElement>('.x-axis').call(xAxis);
    }
    if (this.svgMemory && yMemoryAxis) {
      this.svgMemory.select<SVGGElement>('.y-axis').call(yMemoryAxis);
    }

    // --- Update Lines --- 
    if (this.cpuLine) {
      this.svgCpu
        .select('.cpu-line')
        .datum(this.cpuData)
        .attr('d', this.cpuLine);
    }
    if (this.memoryLine) {
      this.svgMemory
        .select('.memory-line')
        .datum(this.memoryData)
        .attr('d', this.memoryLine);
    }

    // === Add Tooltip Interaction === 
    const addTooltipEvents = (
      svgSelection: d3.Selection<SVGGElement, unknown, HTMLElement, unknown>,
      data: DataPoint[],
      lineClass: string,
      yValueFormatter: (d: number) => string
    ) => {
      const focusPoints = svgSelection
        .selectAll<SVGCircleElement, DataPoint>('.focus-point.' + lineClass)
        .data(data);

      focusPoints
        .enter()
        .append('circle')
        .attr('class', 'focus-point ' + lineClass)
        .attr('r', 4) // Radius of the invisible point
        .merge(focusPoints)
        .attr('cx', (d: DataPoint) => this.xScale ? this.xScale(d.timestamp) : 0)
        .attr('cy', (d: DataPoint) =>
          lineClass === 'cpu-point'
            ? (this.yCpuScale ? this.yCpuScale(d.value) : 0)
            : (this.yMemoryScale ? this.yMemoryScale(d.value) : 0)
        )
        .on('mouseover', (event: MouseEvent, d: DataPoint) => {
          // Set class immediately, then transition opacity
          this.tooltip.classed('visible', true);
          this.tooltip.transition().duration(100).style('opacity', 1);

          let changeHtml = '';
          const index = data.findIndex((point) => point === d);
          if (index > 0) {
            const previousValue = data[index - 1].value;
            if (previousValue !== 0 && previousValue != null) {
              // Avoid division by zero
              const change = ((d.value - previousValue) / previousValue) * 100;
              const sign = change >= 0 ? '+' : '';
              changeHtml = `<br/>Change: ${sign}${change.toFixed(1)}%`;
            } else if (d.value !== 0) {
              changeHtml = `<br/>Change: N/A (prev 0)`;
            } else {
              changeHtml = `<br/>Change: 0.0%`;
            }
          } else {
            changeHtml = '<br/>Change: N/A'; // No change for the first point
          }

          this.tooltip.html(
            `Time: ${d3.timeFormat('%H:%M:%S')(new Date(d.timestamp))}<br/>
                     Value: ${yValueFormatter(d.value)}
                     ${changeHtml}` // Add the change HTML
          );
        })
        .on('mousemove', (event: MouseEvent) => {
          // Position tooltip relative to the overall page
          // Adjust offsets as needed for better placement
          this.tooltip
            .style('left', event.pageX + 15 + 'px')
            .style('top', event.pageY - 28 + 'px');
        })
        .on('mouseout', () => {
          // Just transition opacity out, rely on base style for hidden state
          this.tooltip.transition().duration(200).style('opacity', 0);
          // Optionally remove class after delay if needed for other reasons
          // setTimeout(() => this.tooltip.classed('visible', false), 200);
        });

      focusPoints.exit().remove();
    };

    // Apply tooltip logic to both charts
    addTooltipEvents(this.svgCpu, this.cpuData, 'cpu-point', (d) =>
      d3.format('.1%')(d)
    );
    addTooltipEvents(
      this.svgMemory,
      this.memoryData,
      'memory-point',
      (d) => `${Math.round(d)} MB`
    );

    this.cdr.markForCheck();
  }

  private updatePerformanceChartSeries(): void {
    // Create series objects for all metrics
    const cpuSeries: ChartSeries = {
      id: 'cpu',
      name: 'CPU Usage',
      color: '#ff4081',
      data: this.cpuData.map(d => ({
        timestamp: d.timestamp,
        value: d.value * 100 // Convert to percentage
      })),
      visible: this.filteredMetrics.has('cpu'),
      unit: '%'
    };
    
    const memorySeries: ChartSeries = {
      id: 'memory',
      name: 'Memory Usage',
      color: '#3f51b5',
      data: this.memoryData.map(d => ({ ...d })),
      visible: this.filteredMetrics.has('memory'),
      unit: 'MB'
    };
    
    const latencySeries: ChartSeries = {
      id: 'latency',
      name: 'Network Latency',
      color: '#4caf50',
      data: this.networkLatencyData.map(d => ({ ...d })),
      visible: this.filteredMetrics.has('latency'),
      unit: 'ms'
    };
    
    const requestsSeries: ChartSeries = {
      id: 'requests',
      name: 'HTTP Requests',
      color: '#ff9800',
      data: this.httpRequestsData.map(d => ({ ...d })),
      visible: this.filteredMetrics.has('requests'),
      unit: '/s'
    };
    
    // Add the missing metrics
    const sessionsSeries: ChartSeries = {
      id: 'sessions',
      name: 'Active Sessions',
      color: '#9c27b0', // Using the color from metricFilters
      data: this.activeSessionsData.map(d => ({ ...d })),
      visible: this.filteredMetrics.has('sessions'),
      unit: ''
    };
    
    const cacheSeries: ChartSeries = {
      id: 'cache',
      name: 'Cache Hit Ratio',
      color: '#00bcd4', // Using the color from metricFilters
      data: this.cacheHitRatioData.map(d => ({ ...d })),
      visible: this.filteredMetrics.has('cache'),
      unit: '%'
    };
    
    const queueSeries: ChartSeries = {
      id: 'queue',
      name: 'Task Queue',
      color: '#8bc34a', // Using the color from metricFilters
      data: this.taskQueueData.map(d => ({ ...d })),
      visible: this.filteredMetrics.has('queue'),
      unit: ''
    };
    
    const dbSeries: ChartSeries = {
      id: 'db',
      name: 'DB Response Time',
      color: '#e91e63', // Using the color from metricFilters
      data: this.dbResponseTimeData.map(d => ({ ...d })),
      visible: this.filteredMetrics.has('db'),
      unit: 'ms'
    };
    
    // Create a completely new array to ensure Angular's change detection recognizes the update
    this.performanceChartSeries = [
      cpuSeries, 
      memorySeries,
      latencySeries,
      requestsSeries,
      sessionsSeries,
      cacheSeries,
      queueSeries,
      dbSeries
    ];
    
    // Log for debugging
    console.log(`Updated chart series, visible metrics: ${Array.from(this.filteredMetrics).join(', ')}`);
    
    // Ensure change detection runs
    this.cdr.markForCheck();
  }

  // --- System Info Template --- 
  getSystemInfoTemplate(): string {
    if (!this.lastHeartbeat) return '';
    
    return `
      <div class="system-info">
        <div class="system-name ${this.getSystemStatusClass()}">
          ${this.lastHeartbeat?.hostname || 'System'} 
          <span class="status-badge">${this.lastHeartbeat?.status || 'Unknown'}</span>
        </div>
        <div class="system-details">
          <div class="detail-item">
            <span class="item-label">Uptime:</span> 
            <span class="item-value">${this.lastHeartbeat?.uptime || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="item-label">OS:</span> 
            <span class="item-value">${this.lastHeartbeat?.os || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="item-label">Version:</span> 
            <span class="item-value">${this.lastHeartbeat?.version || 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
  }

  // --- Status Handling Methods --- 
  getSystemStatusClass(): string {
    const status = this.lastHeartbeat?.status?.toLowerCase();
    if (status === 'healthy') return 'status-healthy';
    if (status === 'warning') return 'status-warning';
    if (status === 'critical') return 'status-critical';
    return 'status-unknown';
  }

  // --- Gauge Methods --- 
  getCpuDashArray(): string {
    return getCpuDashArrayHelper(this.currentCpuUsage);
  }

  getMemoryDashArray(): string {
    return getMemoryDashArrayHelper(this.memoryPercentage);
  }

  getMetricStatusClass(metric: DetailedMetric): string {
    return getMetricStatusClassHelper(metric);
  }

  getTrendIcon(trend: string): string {
    return getTrendIconHelper(trend);
  }

  // --- Chart Control Methods --- 
  toggleChartType(chartType: 'cpu' | 'memory'): void {
    // Implementation would toggle between line and area charts
    if (chartType === 'cpu') {
      this.svgCpu?.select('.cpu-line')
        .classed('area-chart', !this.svgCpu.select('.cpu-line').classed('area-chart'));
    } else {
      this.svgMemory?.select('.memory-line')
        .classed('area-chart', !this.svgMemory.select('.memory-line').classed('area-chart'));
    }
    this.cdr.markForCheck();
  }

  resetZoom(chartType: 'cpu' | 'memory'): void {
    // Implementation would reset the zoom level
    if (chartType === 'cpu') {
      this.zoomedCpuXScale = this.xScale?.copy();
      this.updateCharts(this.totalMemory);
    } else {
      this.zoomedMemoryXScale = this.xScale?.copy();
      this.updateCharts(this.totalMemory);
    }
  }

  // --- Brush Event Handler --- 
  private brushended(event: d3.D3BrushEvent<unknown>, chartType: 'cpu' | 'memory'): void {
    const updateCallback = () => this.updateCharts(this.totalMemory);
    if (chartType === 'cpu') {
      if (this.brushX && event.selection) {
        // Handle CPU chart brush
        updateCallback();
      }
    } else {
      if (event.selection) {
        // Handle memory chart brush
        updateCallback();
      }
    }
  }

  // --- Tooltip Handler --- 
  private handleMemoryChartTooltip(event: MouseEvent, d: DataPoint): void {
    try {
      const tooltipContent = `
        <div class="tooltip-content">
          <div class="tooltip-title">Memory Usage</div>
          <div class="tooltip-row">
            <span class="label">Time:</span>
            <span class="value">${new Date(d.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="tooltip-row">
            <span class="label">Used:</span>
            <span class="value">${d.value.toFixed(2)} MB</span>
          </div>
          <div class="tooltip-row">
            <span class="label">Total:</span>
            <span class="value">${this.totalMemory} MB</span>
          </div>
          <div class="tooltip-row">
            <span class="label">Percentage:</span>
            <span class="value">${((d.value / this.totalMemory) * 100).toFixed(1)}%</span>
          </div>
        </div>
      `;

      this.tooltip.html(tooltipContent);
      
      // Position the tooltip
      this.tooltip
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 30) + 'px')
        .style('opacity', 1);
    } catch (err) {
      console.error('Error showing tooltip:', err);
    }
  }

  // --- Filter Methods --- 
  toggleMetricFilter(filterId: string): void {
    const filterIndex = this.metricFilters.findIndex(f => f.id === filterId);
    if (filterIndex >= 0) {
      // Toggle the active state
      this.metricFilters[filterIndex].active = !this.metricFilters[filterIndex].active;
      
      // Update filtered metrics set
      this.updateFilteredMetrics();
      
      // Immediately update the performance chart series
      this.updatePerformanceChartSeries();
      
      // Log toggle for debugging
      console.log(`Toggled ${filterId} to ${this.metricFilters[filterIndex].active}`);
      console.log('Current filtered metrics:', Array.from(this.filteredMetrics));
      
      this.cdr.markForCheck();
    }
  }

  updateFilteredMetrics(): void {
    this.filteredMetrics.clear();
    
    this.metricFilters.forEach(filter => {
      if (filter.active) {
        this.filteredMetrics.add(filter.id);
      }
    });
    
    // Update visibility in combined metrics
    this.combinedMetrics.forEach((metric: CombinedMetric) => {
      metric.visible = this.filteredMetrics.has(metric.id);
    });
    
    // No need for D3 specific updates as we're using the PerformanceChartComponent now
  }

  handleFilterSelection(filterId: string, selected: boolean): void {
    console.log(`Filter ${filterId} selection changed to: ${selected}`);
    
    const filterIndex = this.metricFilters.findIndex(f => f.id === filterId);
    if (filterIndex >= 0) {
      // Update filter state based on the chip selection
      this.metricFilters[filterIndex].active = selected;
      
      // Update filtered metrics set
      if (selected) {
        this.filteredMetrics.add(filterId);
      } else {
        this.filteredMetrics.delete(filterId);
      }
      
      // Log the current state for debugging
      console.log('Current visible metrics:', Array.from(this.filteredMetrics));
      
      // Update chart series with new filter state
      this.updatePerformanceChartSeries();
      
      // Ensure change detection runs
      this.cdr.markForCheck();
    }
  }

  // --- Sparkline Methods --- 
  private updateSparklines(): void {
    // Implementation would update the sparkline charts
    if (this.responseSparklineSvg && this.responseLine) {
      // Update response time sparkline
    }
    
    if (this.requestsSparklineSvg && this.requestsLine) {
      // Update requests sparkline
    }
  }

  // --- Chart Legend --- 
  private createChartLegend(svg: d3.Selection<SVGGElement, unknown, HTMLElement, unknown> | undefined, width: number): void {
    // Implementation of chart legend
    if (!svg) return;
    
    const visibleMetrics = this.combinedMetrics.filter((m: CombinedMetric) => m.visible);
    const legendItemWidth = 80;
    const legendSpacing = 10;
    const legendX = width - (legendItemWidth * Math.min(visibleMetrics.length, 4)) - 20;
    const legendY = 10;
    
    // Create legend group
    const legendGroup = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);
    
    // Add legend items as type-safe implementation
    visibleMetrics.forEach((metric: CombinedMetric, i: number) => {
      const itemX = i * (legendItemWidth + legendSpacing);
      
      // Add color swatch
      legendGroup.append('rect')
        .attr('x', itemX)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', metric.color);
        
      // Add label
      legendGroup.append('text')
        .attr('x', itemX + 16)
        .attr('y', 10)
        .attr('font-size', '12px')
        .text(metric.name);
    });
  }

  // --- Initialization Methods --- 
  private initializeDetailedMetrics(): void {
    this.detailedMetrics = [
      { 
        id: 'disk-usage', 
        name: 'Disk Usage', 
        value: 67.5, 
        unit: 'GB', 
        status: 'normal', 
        trend: 'up', 
        changePercent: 2.3 
      },
      { 
        id: 'network-throughput', 
        name: 'Network Throughput', 
        value: 1.2, 
        unit: 'MB/s', 
        status: 'normal', 
        trend: 'stable', 
        changePercent: 0.1 
      },
      { 
        id: 'thread-count', 
        name: 'Thread Count', 
        value: 124, 
        unit: '', 
        status: 'normal', 
        trend: 'up', 
        changePercent: 5.2 
      },
      { 
        id: 'gc-time', 
        name: 'GC Time', 
        value: 235, 
        unit: 'ms', 
        status: 'warning', 
        trend: 'up', 
        changePercent: 12.8 
      },
      { 
        id: 'heap-usage', 
        name: 'Heap Usage', 
        value: 512, 
        unit: 'MB', 
        status: 'normal', 
        trend: 'stable', 
        changePercent: 0.5 
      },
      { 
        id: 'open-files', 
        name: 'Open File Descriptors', 
        value: 438, 
        unit: '', 
        status: 'normal', 
        trend: 'down', 
        changePercent: -3.1 
      },
    ];
    
    // Initialize previous values
    this.detailedMetrics.forEach(metric => {
      this.previousDetailedMetricValues[metric.id] = metric.value;
    });
  }

  private initializeCombinedMetrics(): void {
    // Implementation would initialize the combined metrics array
    this.combinedMetrics = this.metricFilters.map(filter => ({
      id: filter.id,
      name: filter.name,
      color: filter.color,
      visible: this.filteredMetrics.has(filter.id),
      data: []
    }));
  }

  // --- Updates Array Accessor --- 
  updates(): GeneralUpdate[] {
    return this.generalUpdates;
  }

  // Handle series toggling from the performance chart
  handleSeriesToggle(seriesId: string): void {
    const filterIndex = this.metricFilters.findIndex(f => f.id === seriesId);
    if (filterIndex >= 0) {
      // Toggle the filter state
      this.metricFilters[filterIndex].active = !this.metricFilters[filterIndex].active;
      
      // Update filtered metrics
      this.updateFilteredMetrics();
      
      // Force UI update since we're coming from an external event
      this.cdr.markForCheck();
    }
  }

  // Add method to generate mock data for initial chart rendering
  private generateInitialMockData(): void {
    console.log('Generating initial mock data');
    // Generate data points for the last 30 minutes at 30-second intervals
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    const interval = 30 * 1000; // 30 seconds
    
    for (let i = 0; i < 60; i++) { // 60 points = 30 minutes of data
      const timestamp = now - thirtyMinutes + (i * interval);
      
      // Generate random but somewhat realistic looking data
      const cpuValue = 0.1 + (Math.sin(i / 10) * 0.2) + (Math.random() * 0.3); // between 0.1 and 0.6
      const memoryValue = 400 + (Math.sin(i / 8) * 200) + (Math.random() * 100); // between 300MB and 700MB
      const latencyValue = 35 + (Math.cos(i / 12) * 20) + (Math.random() * 30); // between 15ms and 85ms
      const requestsValue = 25 + (Math.sin(i / 6) * 10) + (Math.random() * 15); // between 15 and 50 req/s
      
      // Generate data for additional metrics
      const sessionsValue = 50 + (Math.sin(i / 7) * 20) + (Math.random() * 10); // between 30 and 80 active sessions
      const cacheRatioValue = 75 + (Math.sin(i / 9) * 15) + (Math.random() * 10); // between 60% and 100%
      const queueValue = 5 + (Math.cos(i / 5) * 3) + (Math.random() * 5); // between 2 and 13 tasks
      const dbRespValue = 15 + (Math.sin(i / 8) * 5) + (Math.random() * 10); // between 10ms and 30ms
      
      // Add to our data arrays
      this.cpuData.push({ timestamp, value: cpuValue });
      this.memoryData.push({ timestamp, value: memoryValue });
      this.networkLatencyData.push({ timestamp, value: latencyValue });
      this.httpRequestsData.push({ timestamp, value: requestsValue });
      this.activeSessionsData.push({ timestamp, value: sessionsValue });
      this.cacheHitRatioData.push({ timestamp, value: cacheRatioValue });
      this.taskQueueData.push({ timestamp, value: queueValue });
      this.dbResponseTimeData.push({ timestamp, value: dbRespValue });
      
      // Update current values with the latest data point
      if (i === 59) {
        this.currentCpuUsage = cpuValue * 100;
        this.currentMemoryUsed = memoryValue;
        this.memoryPercentage = (memoryValue / this.totalMemory) * 100;
        this.avgResponseTime = latencyValue;
        this.requestsPerSecond = Math.round(requestsValue);
      }
    }
    
    // Explicitly call update performance chart
    this.updatePerformanceChartSeries();
    console.log('Performance chart series updated with mock data:', this.performanceChartSeries);
    
    // Generate mock health status
    this.healthStatus = {
      status: 'healthy',
      timestamp: now
    };
  }

  // Method to set update frequency from slider - update to handle any event type
  updateFrequency(event: any): void {
    // Handle both MatSliderChange and standard DOM events
    const value = event.value || (event.target?.value);
    
    if (value !== undefined && value !== null) {
      this.updateFrequencyMs = value;
      this.updateFrequency$.next(value);
      console.log(`Update frequency changed to ${value}ms`);
      this.cdr.markForCheck();
    }
  }

  // Setup metrics update interval that responds to frequency changes
  private setupMetricsUpdateInterval(): void {
    // Generate initial mock data
    this.generateInitialMockData();
    
    // Subscribe to frequency changes and create dynamic interval
    this.mockDataSubscription = this.updateFrequency$
      .pipe(
        switchMap(frequency => interval(frequency))
      )
      .subscribe(() => {
        // Generate a single data point update
        this.generateMetricsUpdate();
        this.cdr.markForCheck();
      });
  }

  // Generate a single metrics update point
  private generateMetricsUpdate(): void {
    const timestamp = Date.now();
    
    // Generate random but somewhat realistic looking data
    const cpuValue = 0.1 + (Math.sin(Date.now() / 10000) * 0.2) + (Math.random() * 0.3);
    
    // Ensure memory doesn't drop unrealistically
    let previousMemory = 400;
    if (this.memoryData.length > 0) {
      previousMemory = this.memoryData[this.memoryData.length - 1].value;
    }
    
    // Memory should fluctuate but not drop suddenly or reach zero
    const memoryDelta = (Math.sin(Date.now() / 8000) * 30) + (Math.random() * 20 - 10);
    let memoryValue = Math.max(previousMemory + memoryDelta, previousMemory * 0.95);
    
    // Ensure memory is never zero or unrealistically low
    memoryValue = Math.max(memoryValue, 100);
    
    // Create a mock metrics update
    const metrics: ServerMetrics = {
      timestamp,
      cpu: cpuValue,
      memory: {
        used: memoryValue,
        total: this.totalMemory
      }
    };
    
    if (!this.isLiveData) {
      // Add mock additional metrics only in mock mode
      const sessionsValue = 50 + (Math.sin(Date.now() / 7000) * 20) + (Math.random() * 10);
      const cacheRatioValue = 75 + (Math.sin(Date.now() / 9000) * 15) + (Math.random() * 10);
      const queueValue = 5 + (Math.cos(Date.now() / 5000) * 3) + (Math.random() * 5);
      const dbRespValue = 15 + (Math.sin(Date.now() / 8000) * 5) + (Math.random() * 10);
      
      // Use proper type casting with an extended interface
      (metrics as ServerMetricsWithMock).activeSessions = sessionsValue;
      (metrics as ServerMetricsWithMock).cacheHitRatio = cacheRatioValue;
      (metrics as ServerMetricsWithMock).taskQueue = queueValue;
      (metrics as ServerMetricsWithMock).dbResponseTime = dbRespValue;
    }
    
    // Process the metrics update
    this.handleMetricsUpdate(metrics);
  }

  showServerStats(event: MouseEvent): void {
    if (!this.lastHeartbeat) return;
    
    // Calculate a realistic ping (10-100ms)
    this.serverPing = Math.round(15 + Math.random() * 35);
    
    // Show tooltip with server stats
    const overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position()
        .flexibleConnectedTo({ x: event.clientX, y: event.clientY })
        .withPositions([{
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: 10
        }]),
      scrollStrategy: this.overlay.scrollStrategies.close(),
      hasBackdrop: false
    });

    // Create portal from template
    const portal = new TemplatePortal(this.serverStatsTemplate, this.viewContainerRef);
    overlayRef.attach(portal);
    
    // Store subscription for cleanup
    this.mouseLeaveSubscription = fromEvent(event.target as HTMLElement, 'mouseleave').subscribe(() => {
      overlayRef.dispose();
      this.mouseLeaveSubscription?.unsubscribe();
      this.mouseLeaveSubscription = undefined;
    });
    
    // Auto close after 3 seconds as fallback - store timeout ID
    const timeoutId = window.setTimeout(() => {
      if (overlayRef.hasAttached()) {
        overlayRef.dispose();
      }
    }, 3000);
    this.timeoutSubscriptions.push(timeoutId);
  }

  getConnectionStatusText(): string {
    if (!this.isConnected) {
      return 'Disconnected';
    }
    
    if (this.lastHeartbeat?.status === 'healthy') {
      return 'Active';
    }
    
    return 'Connected';
  }

  // Add methods for diagnostics functionality
  toggleDiagnostics(): void {
    this.diagnosticsEnabled = this.diagnostics.toggleDebugMode();
    this.cdr.markForCheck();
  }

  clearDiagnostics(): void {
    this.diagnostics.clearEvents();
    this.memoryValueDrops = 0;
    this.cdr.markForCheck();
  }
  
  // Add method to update detailed metrics with animation
  updateDetailedMetrics(metrics: MetricUpdates): void {
    // Example: update metrics with new values
    this.detailedMetrics.forEach(metric => {
      // Check for updated metrics here
      if (metrics[metric.id] !== undefined && metrics[metric.id] !== this.previousDetailedMetricValues[metric.id]) {
        // Update the value
        const oldValue = metric.value;
        metric.value = metrics[metric.id];
        
        // Calculate change percent
        if (oldValue !== 0) {
          metric.changePercent = ((metric.value - oldValue) / oldValue) * 100;
        }
        
        // Set trend based on change
        if (Math.abs(metric.changePercent) < 0.5) {
          metric.trend = 'stable';
        } else if (metric.changePercent > 0) {
          metric.trend = 'up';
        } else {
          metric.trend = 'down';
        }
        
        // Mark tile for animation
        this.updatingTiles.add(metric.id);
        
        // Remove animation class after timeout - store timeout ID
        const timeoutId = window.setTimeout(() => {
          this.updatingTiles.delete(metric.id);
          this.previousDetailedMetricValues[metric.id] = metric.value;
          this.cdr.markForCheck();
        }, 300);
        this.timeoutSubscriptions.push(timeoutId);
      }
    });
    
    this.cdr.markForCheck();
  }
  
  // Method to check if a tile should animate
  isTileUpdating(metricId: string): boolean {
    return this.updatingTiles.has(metricId);
  }

  // Method to check if a specific data source is available
  isDataSourceAvailable(sourceId: string): boolean {
    if (!this.missingDataSources || !this.missingDataSources[sourceId]) {
      return true;
    }
    return false;
  }

  // Get reason why data source is unavailable
  getDataSourceUnavailableReason(sourceId: string): string {
    return this.missingDataSources?.[sourceId] || 'Unknown reason';
  }

  // Add getObjectEntries method for use in the template
  getObjectEntries(obj: Record<string, unknown>): [string, unknown][] {
    return obj ? Object.entries(obj) : [];
  }

  // Add helper method for checking if an object has keys
  hasKeys(obj: Record<string, unknown>): boolean {
    return obj && Object.keys(obj).length > 0;
  }
}

// Add interface for mock metrics
interface ServerMetricsWithMock extends ServerMetrics {
  activeSessions?: number;
  cacheHitRatio?: number;
  taskQueue?: number;
  dbResponseTime?: number;
}
