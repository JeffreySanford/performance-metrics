import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

export interface ChartDataPoint {
  timestamp: number;
  value: number;
}

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  data: ChartDataPoint[];
  visible?: boolean;
  unit?: string;
}

@Component({
  selector: 'app-performance-chart',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule
  ],
  templateUrl: './performance-chart.component.html',
  styleUrls: ['./performance-chart.component.scss']
})
export class PerformanceChartComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('chartContainer') chartContainer!: ElementRef;
  
  @Input() series: ChartSeries[] = [];
  @Input() width = 800;
  @Input() height = 300;
  @Input() title = 'Performance Chart';
  @Input() yAxisLabel = 'Value';
  @Input() showLegend = true;
  @Input() brushEnabled = false;
  @Input() healthStatus: { status: string; timestamp: number } | null = null;
  
  @Output() seriesToggled = new EventEmitter<string>();
  
  private svg: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
  private xScale: d3.ScaleTime<number, number> | undefined;
  private yScale: d3.ScaleLinear<number, number> | undefined;
  private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | undefined;
  private line: d3.Line<ChartDataPoint> | undefined;
  private margin = { top: 30, right: 30, bottom: 50, left: 60 };
  private innerWidth = 0;
  private innerHeight = 0;
  private healthIndicator: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
  isInfoCardVisible = false;
  infoCardPosition = { x: 0, y: 0 };
  
  constructor() {}
  
  ngOnInit() {
    console.log('Performance Chart Component initialized');
    console.log('Initial series data:', this.series?.length || 0, 'series');
    // Don't initialize the chart here, wait for AfterViewInit
  }
  
  ngAfterViewInit() {
    console.log('Chart View initialized, creating chart');
    setTimeout(() => {
      this.initializeChart();
    });
  }
  
  ngOnChanges(changes: SimpleChanges) {
    // Log all changes for debugging
    if (changes['series'] && !changes['series'].firstChange) {
      console.log('Performance chart received new series data:', 
        changes['series'].currentValue?.map((s: ChartSeries) => `${s.id}: ${s.visible}`));
    }
    
    if (
      (changes['series'] && !changes['series'].firstChange) || 
      (changes['width'] && !changes['width'].firstChange) || 
      (changes['height'] && !changes['height'].firstChange)
    ) {
      // Force full redraw whenever series data changes
      this.updateChart();
    }
    
    if (changes['healthStatus'] && !changes['healthStatus'].firstChange) {
      this.updateHealthStatus();
    }
  }
  
  private initializeChart() {
    if (!this.chartContainer?.nativeElement) {
      console.error('Chart container not found');
      return;
    }
    
    console.log('Initializing chart with container size:', 
               this.chartContainer.nativeElement.clientWidth, 'x',
               this.chartContainer.nativeElement.clientHeight);
    
    // Use actual container width if possible
    this.width = this.chartContainer.nativeElement.clientWidth || this.width;
    this.height = this.chartContainer.nativeElement.clientHeight || this.height;
    
    // Calculate dimensions
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;
    
    // Create SVG
    const container = d3.select(this.chartContainer.nativeElement);
    container.selectAll('*').remove();
    
    const svg = container.append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
      
    this.svg = svg;
    
    // Scales
    this.xScale = d3.scaleTime().range([0, this.innerWidth]);
    this.yScale = d3.scaleLinear().range([this.innerHeight, 0]);
    
    // Line generator
    this.line = d3.line<ChartDataPoint>()
      .x(d => this.xScale!(d.timestamp))
      .y(d => this.yScale!(d.value))
      .curve(d3.curveMonotoneX);
    
    // Create axes
    svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${this.innerHeight})`)
      .call(d3.axisBottom(this.xScale!));
      
    svg.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(this.yScale!));
      
    // Add grid lines
    svg.append('g')
      .attr('class', 'x-grid')
      .attr('transform', `translate(0, ${this.innerHeight})`)
      .call(d3.axisBottom(this.xScale!)
        .tickSize(-this.innerHeight)
        .tickFormat(() => '')
      );
      
    svg.append('g')
      .attr('class', 'y-grid')
      .call(d3.axisLeft(this.yScale!)
        .tickSize(-this.innerWidth)
        .tickFormat(() => '')
      );
      
    // Title
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', this.innerWidth / 2)
      .attr('y', -this.margin.top / 2)
      .attr('text-anchor', 'middle')
      .text(this.title);
      
    // Y-axis label
    svg.append('text')
      .attr('class', 'y-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', -this.margin.left + 20)
      .attr('x', -this.innerHeight / 2)
      .attr('text-anchor', 'middle')
      .text(this.yAxisLabel);
      
    // Add clip path
    svg.append('defs')
      .append('clipPath')
      .attr('id', 'clip-' + this.title.replace(/\s+/g, '-').toLowerCase())
      .append('rect')
      .attr('width', this.innerWidth)
      .attr('height', this.innerHeight);
      
    // Create group for lines and points with clip path
    svg.append('g')
      .attr('class', 'chart-content')
      .attr('clip-path', `url(#clip-${this.title.replace(/\s+/g, '-').toLowerCase()})`);
      
    // Create tooltip
    this.tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('pointer-events', 'none');
      
    // Health status indicator
    if (this.healthStatus) {
      this.createHealthIndicator();
    }
    
    // Update chart with data after initializing
    if (this.series && this.series.length > 0) {
      console.log('Chart initialized, updating with existing data');
      setTimeout(() => this.updateChart(), 0);
    } else {
      console.warn('No chart series data available yet');
    }
  }
  
  private updateChart() {
    // Remove debugger statement
    console.log('Updating chart...');
    if (!this.svg || !this.xScale || !this.yScale || !this.line) return;
    console.log('Chart SVG and scales are initialized');
    
    // Detailed logging of series state before filtering
    console.log('Series before filtering:', this.series.map(s => ({
      id: s.id, 
      name: s.name,
      visible: s.visible,
      dataPoints: s.data?.length || 0
    })));
    
    // Ensure series exists and has proper defaults
    if (!this.series || this.series.length === 0) {
      console.warn('No series data provided to chart');
      return;
    }
    
    // Get visible series - consider all series visible by default if not explicitly set to false
    const visibleSeries = this.series.filter(s => s.visible !== false);
    
    // If no visible series after filtering, use all series as fallback
    if (visibleSeries.length === 0) {
      console.warn('No visible series to display - using all series as fallback');
      // Make all series visible by default
      this.series.forEach(s => s.visible = true);
      
      // Try filtering again after setting visibility
      const allSeries = this.series.filter(s => s.visible !== false);
      
      // If still no visible series, something is wrong with the data
      if (allSeries.length === 0) {
        console.error('Cannot display chart: all series are hidden');
        return;
      }
    }
    
    // Use visible series or all series as fallback
    const seriesToRender = visibleSeries.length > 0 ? visibleSeries : this.series;
    console.log(`Rendering chart with ${seriesToRender.length} series`);
    
    // Get all data points to calculate domains
    const allData = seriesToRender.flatMap(s => s.data || []);
    
    if (allData.length === 0) {
      console.warn('No data points available for chart');
      return;
    }
    
    // Log chart data for debugging - add detailed series logging
    console.log(`Updating chart with ${seriesToRender.length} visible series, total points: ${allData.length}`);
    seriesToRender.forEach(series => {
      console.log(`Series ${series.id}: ${series.data.length} points, last value: ${
        series.data.length > 0 ? series.data[series.data.length-1].value : 'N/A'
      }`);
    });
    
    // Update domains with better validation
    const xExtent = d3.extent(allData, d => d.timestamp) as [number, number];
    if (!xExtent[0] || !xExtent[1]) {
      console.warn('Invalid time domain:', xExtent);
      return;
    }
    
    this.xScale.domain(xExtent);
    
    // Improve y domain calculation with series-specific minimums
    // This prevents the chart from rescaling to zero when there are temporary drops
    let yMin = 0;
    const yMaxes = seriesToRender.map(s => {
      const values = s.data.map(d => d.value).filter(v => !isNaN(v) && v !== null);
      // For memory, use a minimum threshold based on data
      if (s.id === 'memory' && values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        yMin = Math.min(avg * 0.5, d3.min(values) || 0); // Use at most 50% of average as min
      }
      return d3.max(values) || 0;
    });
    
    const yMax = Math.max(...yMaxes) * 1.1; // Add 10% padding
    this.yScale.domain([yMin, yMax]);
    console.log(`Y domain set to [${yMin}, ${yMax}]`);
    
    // Update axes
    this.svg.select<SVGGElement>('.x-axis')
      .transition().duration(300)
      .call(d3.axisBottom(this.xScale)
        .ticks(5)
        .tickFormat(d => d3.timeFormat('%H:%M:%S')(d as Date))
      );
      
    this.svg.select<SVGGElement>('.y-axis')
      .transition().duration(300)
      .call(d3.axisLeft(this.yScale)
        .ticks(5)
      );
      
    // Update grid
    this.svg.select<SVGGElement>('.x-grid')
      .transition().duration(300)
      .call(d3.axisBottom(this.xScale)
        .tickSize(-this.innerHeight)
        .tickFormat(() => '')
      );
      
    this.svg.select<SVGGElement>('.y-grid')
      .transition().duration(300)
      .call(d3.axisLeft(this.yScale)
        .tickSize(-this.innerWidth)
        .tickFormat(() => '')
      );
      
    // Get chart content group
    const chartContent = this.svg.select('.chart-content');
    
    // Update lines and points for each series
    seriesToRender.forEach(series => {
      // Skip if no data
      if (!series.data || series.data.length === 0) return;
      
      // Filter out any invalid data points to prevent rendering issues
      const validData = series.data.filter(d => 
        d.timestamp != null && !isNaN(d.timestamp) && 
        d.value != null && !isNaN(d.value)
      );
      
      if (validData.length === 0) {
        console.warn(`Series ${series.id} has no valid data points after filtering`);
        return;
      }
      
      // Line
      const lineSelection = chartContent.select<SVGPathElement>(`.line-${series.id}`);
      
      if (lineSelection.empty()) {
        // Create new line
        chartContent.append('path')
          .datum(validData) // Use filtered valid data
          .attr('class', `line line-${series.id}`)
          .attr('fill', 'none')
          .attr('stroke', series.color)
          .attr('stroke-width', 2)
          .attr('d', this.line!)
          .style('opacity', 0)
          .transition().duration(500)
          .style('opacity', 1);
      } else {
        // Update existing line
        lineSelection.datum(validData) // Use filtered valid data
          .transition().duration(300)
          .attr('d', this.line!);
      }
      
      // Points - also use filtered valid data
      const points = chartContent.selectAll<SVGCircleElement, ChartDataPoint>(`.point-${series.id}`)
        .data(validData);
        
      // Remove old points
      points.exit().remove();
      
      // Add new points
      points.enter()
        .append('circle')
        .attr('class', `point point-${series.id}`)
        .attr('r', 4)
        .attr('fill', series.color)
        .attr('cx', d => this.xScale!(d.timestamp))
        .attr('cy', d => this.yScale!(d.value))
        .on('mouseover', (event, d) => this.showTooltip(event, d, series))
        .on('mouseout', () => this.hideTooltip())
        .merge(points)
        .transition().duration(300)
        .attr('cx', d => this.xScale!(d.timestamp))
        .attr('cy', d => this.yScale!(d.value));
    });
    
    // Remove series that are no longer visible
    this.series.filter(s => s.visible === false).forEach(series => {
      chartContent.selectAll(`.line-${series.id}, .point-${series.id}`)
        .transition().duration(300)
        .style('opacity', 0)
        .remove();
    });
    
    // Update legend
    if (this.showLegend) {
      this.updateLegend();
    }
    
    // Update health indicator position
    if (this.healthStatus && this.healthIndicator) {
      this.updateHealthIndicator();
    }
  }
  
  private updateLegend() {
    if (!this.svg) return;
    
    // Remove existing legend
    this.svg.selectAll('.legend').remove();
    
    // Create legend group
    const legend = this.svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.innerWidth - 200}, 10)`);
    
    // Only show active/visible series in the legend
    const visibleSeries = this.series.filter(s => s.visible);
    
    // Add legend items for visible series
    visibleSeries.forEach((series, i) => {
      const g = legend.append('g')
        .attr('class', `legend-item legend-item-${series.id}`)
        .attr('transform', `translate(0, ${i * 20})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          this.seriesToggled.emit(series.id);
        });
        
      // Add color box
      g.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', series.color);
        
      // Add series name
      g.append('text')
        .attr('x', 20)
        .attr('y', 10)
        .text(series.name);
    });

    // Display "None" when no metrics are selected
    if (!this.hasVisibleMetrics()) {
      legend.append('text')
        .attr('class', 'no-metrics-legend')
        .attr('x', this.innerWidth / 2)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .text('None');
      return;
    }
  }

  private showTooltip(event: MouseEvent, d: ChartDataPoint, series: ChartSeries) {
    if (!this.tooltip) return;
    
    const formatTime = d3.timeFormat('%H:%M:%S');
    const time = formatTime(new Date(d.timestamp));
    const value = d.value.toFixed(2);
    const unit = series.unit || '';
    
    this.tooltip.html(`
      <div class="tooltip-header">${series.name}</div>
      <div class="tooltip-content">
        <div class="tooltip-row">
          <span class="tooltip-label">Time:</span>
          <span class="tooltip-value">${time}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Value:</span>
          <span class="tooltip-value">${value}${unit}</span>
        </div>
      </div>
    `)
    .style('left', (event.pageX + 10) + 'px')
    .style('top', (event.pageY - 20) + 'px')
    .transition()
    .duration(200)
    .style('opacity', 0.9);
  }
  
  private hideTooltip() {
    if (!this.tooltip) return;
    
    this.tooltip
      .transition()
      .duration(300)
      .style('opacity', 0);
  }
  
  private createHealthIndicator() {
    if (!this.svg || !this.healthStatus || !this.xScale) return;
    
    // Fixed position container at top right corner with 1em margin
    this.healthIndicator = this.svg.append('g')
      .attr('class', 'health-indicator-container')
      .attr('transform', `translate(${this.innerWidth - 16}, 16)`) // 1em from top right
      .style('cursor', 'pointer');
    
    // Add filter definitions for glow effect
    const defs = this.svg.select('defs');
    if (!defs.select('#glow-effect').empty()) {
      defs.select('#glow-effect').remove();
    }
    
    const filter = defs.append('filter')
      .attr('id', 'glow-effect')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
      
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'blur');
      
    filter.append('feFlood')
      .attr('flood-color', '#f44336')
      .attr('result', 'color');
      
    filter.append('feComposite')
      .attr('in', 'color')
      .attr('in2', 'blur')
      .attr('operator', 'in')
      .attr('result', 'glow');
      
    filter.append('feMerge')
      .selectAll('feMergeNode')
      .data(['glow', 'SourceGraphic'])
      .enter()
      .append('feMergeNode')
      .attr('in', d => d);
    
    // Create a fixed position group that never moves
    const heartGroup = this.healthIndicator.append('g')
      .attr('class', 'heart-scale-group')
      // Set explicit transform-origin in the center for proper scaling
      .style('transform-box', 'fill-box')
      .style('transform-origin', 'center');
    
    // Add heart icon - perfectly centered
    heartGroup.append('path')
      .attr('d', 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z')
      // Position the heart so its center is at (0,0) relative to its container
      .attr('transform', 'translate(-12, -12)')
      .attr('fill', '#f44336') // Always red
      .attr('class', 'heart-icon');
    
    // ...existing code for hover behavior...
    this.healthIndicator
      .on('mouseover', (event) => {
        const { clientX, clientY } = event;
        this.infoCardPosition = { x: clientX, y: clientY };
        this.isInfoCardVisible = true;
        // Force Angular change detection
        setTimeout(() => {
          document.querySelector('.health-info-card')?.classList.add('visible');
        }, 0);
      })
      .on('mouseout', () => {
        document.querySelector('.health-info-card')?.classList.remove('visible');
        setTimeout(() => {
          this.isInfoCardVisible = false;
        }, 300); // Wait for transition to complete
      });
  }
  
  private updateHealthIndicator() {
    if (!this.healthIndicator || !this.healthStatus) return;
    
    // Get the heart group and icon
    const heartGroup = this.healthIndicator.select('.heart-scale-group');
    
    // First apply the class and filter before transitioning size
    heartGroup
      .attr('class', 'heart-scale-group pulsating')
      .attr('filter', 'url(#glow-effect)')
      .style('transform', 'scale(1)')
      .transition().duration(200) // Faster growth (200ms instead of 300ms)
      .style('transform', 'scale(1.5)');
    
    // Update the glow intensity
    const filter = this.svg?.select('defs').select('#glow-effect');
    filter?.select('feFlood')
      .attr('flood-opacity', this.getHealthStatus() === 'healthy' ? 0.7 : 
                            this.getHealthStatus() === 'warning' ? 0.9 : 1.0);
      
    // Return to normal after longer duration (2000ms instead of 1000ms)
    setTimeout(() => {
      heartGroup
        .transition().duration(500) // Slower return to normal size
        .style('transform', 'scale(1)') // Reset to normal size
        .attr('filter', null);       // Remove glow
        
      // Apply class change after transition completes
      setTimeout(() => {
        heartGroup.attr('class', 'heart-scale-group'); // Remove pulsating class
      }, 500);
    }, 2000); // 2 seconds glow duration
  }
  
  // Helper method to get just the status string in lowercase
  private getHealthStatus(): string {
    if (!this.healthStatus) return 'unknown';
    return this.healthStatus.status.toLowerCase();
  }

  public getHealthColor(): string {
    if (!this.healthStatus) return '#999';
    
    switch(this.healthStatus.status.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return '#4caf50'; // Green
      case 'warning':
        return '#ff9800'; // Orange
      case 'critical':
      case 'error':
        return '#f44336'; // Red
      default:
        return '#999'; // Gray
    }
  }
  
  getHealthDescription(): string {
    if (!this.healthStatus) return 'No health data available';
    
    switch(this.healthStatus.status.toLowerCase()) {
      case 'healthy':
      case 'ok':
        return 'System is running optimally with no detected issues.';
      case 'warning':
        return 'System is experiencing minor issues that may require attention.';
      case 'critical':
      case 'error':
        return 'System is experiencing critical problems that require immediate attention.';
      default:
        return 'System health status is unknown.';
    }
  }
  
  // Public method to refresh the chart (e.g., on resize)
  public refresh() {
    if (this.chartContainer?.nativeElement) {
      this.width = this.chartContainer.nativeElement.clientWidth || this.width;
      this.initializeChart();
      this.updateChart();
    }
  }

  /**
   * Check if there are any visible metrics (for legend display)
   */
  private hasVisibleMetrics(): boolean {
    return this.series.some(s => s.visible);
  }

  private updateHealthStatus(): void {
    if (!this.svg || !this.healthStatus) return;
    
    const statusGroup = this.svg.select('.health-status');
    statusGroup.selectAll('*').remove();
    
    // Create the health indicator circle
    statusGroup.append('circle')
      .attr('r', 8)
      .attr('fill', this.getHealthStatusColor())
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);
  }
  
  private getHealthStatusColor(): string {
    if (!this.healthStatus) return '#999999'; // Gray for no status
    
    switch (this.healthStatus.status.toLowerCase()) {
      case 'healthy':
        return '#4caf50'; // Green
      case 'warning':
        return '#ff9800'; // Orange
      case 'critical':
        return '#f44336'; // Red
      default:
        return '#999999'; // Gray for unknown
    }
  }
}
