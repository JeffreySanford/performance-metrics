import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Subject, Subscription, takeUntil } from 'rxjs';
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

// D3 Imports
import * as d3 from 'd3';
import { NumberValue } from 'd3';

// Interface for incoming server metrics data
interface ServerMetrics {
  timestamp: number;
  cpu: number; // Example: 0.0 to 1.0
  memory: {
    used: number; // Example: MB
    total: number; // Example: MB
  };
}

// Interface for processed data points for charts
interface DataPoint {
  timestamp: number;
  value: number;
}

// Define a type for the general update message for clarity
type GeneralUpdate = { type: string; payload?: unknown; timestamp?: number };

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
  ],
  templateUrl: './mcp-metrics.component.html',
  styleUrls: ['./mcp-metrics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McpMetricsComponent implements OnInit, AfterViewInit, OnDestroy {
  // --- Visibility State ---
  areInputsVisible = false;

  // --- Validation Properties ---
  validationForm = new FormGroup({
    tsCode: new FormControl(''),
    scssCode: new FormControl(''),
    htmlCode: new FormControl(''),
  });
  validationResult: ValidationResponse | null = null; // Ensure this is not callable
  isLoading = false; // Ensure this is a boolean, not a callable
  generalUpdates: GeneralUpdate[] = [];

  // --- D3 Chart Properties ---
  @ViewChild('cpuChart') private cpuChartContainer!: ElementRef;
  @ViewChild('memoryChart') private memoryChartContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;

  private cpuData: DataPoint[] = [];
  private memoryData: DataPoint[] = [];
  private svgCpu:
    | d3.Selection<SVGGElement, unknown, HTMLElement, unknown>
    | undefined;
  private svgMemory:
    | d3.Selection<SVGGElement, unknown, HTMLElement, unknown>
    | undefined;
  private xScale: d3.ScaleTime<number, number> | undefined;
  private yCpuScale: d3.ScaleLinear<number, number> | undefined;
  private yMemoryScale: d3.ScaleLinear<number, number> | undefined;
  private cpuLine: d3.Line<DataPoint> | undefined;
  private memoryLine: d3.Line<DataPoint> | undefined;
  private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>;
  private readonly maxDataPoints = 50; // Keep N data points
  private readonly chartMargin = { top: 20, right: 20, bottom: 30, left: 50 };
  private chartWidth = 0;
  private chartHeight = 0;

  // --- Utility Properties ---
  private destroySubject$ = new Subject<void>();
  private validationSubscription: Subscription | undefined;
  private updateSubscription: Subscription | undefined;

  constructor(
    private websocketService: WebsocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscribeToUpdates();
  }

  ngAfterViewInit(): void {
    // Defer chart setup slightly to ensure containers are fully rendered
    setTimeout(() => this.setupCharts(), 0);
  }

  ngOnDestroy(): void {
    this.destroySubject$.next();
    this.destroySubject$.complete();
    // Although takeUntil handles this, explicit unsubscribe is good practice
    this.validationSubscription?.unsubscribe();
    this.updateSubscription?.unsubscribe();
  }

  private subscribeToUpdates(): void {
    // Subscribe to validation results
    this.validationSubscription = this.websocketService
      .listen<ValidationResponse>('validationResult')
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((result: ValidationResponse) => {
        console.log('Validation Result Received:', result);
        this.validationResult = result;
        this.isLoading = false;
        this.cdr.markForCheck(); // Trigger change detection
      });

    // Subscribe to general updates (heartbeat, metrics, etc.)
    this.updateSubscription = this.websocketService
      .listen<GeneralUpdate>('update')
      .pipe(takeUntil(this.destroySubject$))
      .subscribe((update: GeneralUpdate) => {
        console.log('General Update Received:', update);
        if (update?.type === 'serverMetrics') {
          this.handleMetricsUpdate(update.payload as ServerMetrics);
        } else {
          // Handle other updates like heartbeat (optional display)
          this.generalUpdates.push(update);
          if (this.generalUpdates.length > 10) {
            // Keep list manageable
            this.generalUpdates.shift();
          }
        }
        this.cdr.markForCheck(); // Trigger change detection
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
      this.websocketService.emit('validateComponent', componentCode);
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
  }

  private handleMetricsUpdate(metrics: ServerMetrics): void {
    if (!metrics) return;

    const timestamp = metrics.timestamp; // Assuming backend sends epoch ms
    const cpuValue = metrics.cpu;
    const memoryValue = metrics.memory.used;
    const memoryTotal = metrics.memory.total;

    this.cpuData.push({ timestamp, value: cpuValue });
    this.memoryData.push({ timestamp, value: memoryValue });

    // Keep data array size limited
    if (this.cpuData.length > this.maxDataPoints) {
      this.cpuData.shift();
    }
    if (this.memoryData.length > this.maxDataPoints) {
      this.memoryData.shift();
    }

    this.updateCharts(memoryTotal); // Pass total memory for scale update
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

  updates(): GeneralUpdate[] {
    return this.generalUpdates; // Add missing updates method
  }
}
