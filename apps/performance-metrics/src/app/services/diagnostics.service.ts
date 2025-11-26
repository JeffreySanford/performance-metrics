import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface MetricsDataPoint {
  timestamp: number;
  value: number;
  source: string;
}

export interface DiagnosticsEvent {
  type: string;
  message: string;
  timestamp: number;
  data?: unknown; // Replace 'any' with 'unknown'
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticsService {
  private memoryValueHistory: MetricsDataPoint[] = [];
  private events: DiagnosticsEvent[] = [];
  // Apply Finnish notation (add $ suffix)
  private events$ = new BehaviorSubject<DiagnosticsEvent[]>([]);
  private debugMode = false;
  
  constructor() {
    // Check for debug mode in localStorage or URL params
    this.debugMode = localStorage.getItem('metrics_debug') === 'true' || 
                     window.location.search.includes('debug=true');
    
    if (this.debugMode) {
      console.log('🔍 Metrics diagnostics mode ENABLED');
    }
  }
  
  // Track memory value changes
  trackMemoryValue(value: number, source: string): void {
    const timestamp = Date.now();
    
    // Get the previous value to check for drops
    const previousPoint = this.memoryValueHistory.length > 0 
      ? this.memoryValueHistory[this.memoryValueHistory.length - 1] 
      : null;
    
    // Record the new value
    const dataPoint: MetricsDataPoint = { timestamp, value, source };
    this.memoryValueHistory.push(dataPoint);
    
    // Keep history size manageable (last 100 points)
    if (this.memoryValueHistory.length > 100) {
      this.memoryValueHistory.shift();
    }
    
    // Check for significant drops (more than 50%)
    if (previousPoint && previousPoint.value > 0 && value < previousPoint.value * 0.5) {
      this.logEvent('memory-drop', 
        `Memory value dropped significantly from ${previousPoint.value} to ${value}`,
        { previous: previousPoint, current: dataPoint }
      );
    }
    
    // Check for zero values
    if (value === 0) {
      this.logEvent('memory-drop', 
        `Memory value is ZERO from source: ${source}`,
        { previous: previousPoint, current: dataPoint }
      );
    }
    
    // Debug logging if enabled
    if (this.debugMode) {
      console.log(`🧠 Memory: ${value} MB (source: ${source})`);
    }
  }
  
  // Log diagnostic events
  logEvent(type: string, message: string, data?: unknown): void {
    const event: DiagnosticsEvent = {
      type,
      timestamp: Date.now(),
      message,
      data
    };
    
    this.addEvent(event);
    
    // Console log if debugging is enabled
    if (this.debugMode) {
      console.log(`📊 [${type}] ${message}`, data || '');
    }
  }
  
  // Add missing method for adding events
  addEvent(event: DiagnosticsEvent): void {
    this.events.push(event);
    // Keep only the last 100 events
    if (this.events.length > 100) {
      this.events.shift();
    }
    this.events$.next([...this.events]);
  }
  
  // Track WebSocket events
  trackWebSocketEvent(eventType: string, data?: unknown): void {
    this.logEvent('websocket-event', `WebSocket ${eventType}`, data);
  }
  
  // Remove this method as we already have getEvents$() below
  // getEvents(): Observable<DiagnosticsEvent[]> {
  //   return this.events$.asObservable();
  // }

  // Keep this properly named method with Finnish notation
  getEvents$(): Observable<DiagnosticsEvent[]> {
    return this.events$.asObservable();
  }
  
  // Get memory value history
  getMemoryHistory(): MetricsDataPoint[] {
    return [...this.memoryValueHistory];
  }
  
  // Enable or disable debug mode
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    localStorage.setItem('metrics_debug', enabled ? 'true' : 'false');
    this.logEvent('info', `Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Check if debug mode is enabled
  isDebugMode(): boolean {
    return this.debugMode;
  }
  
  // Clear diagnostic history
  clearHistory(): void {
    this.memoryValueHistory = [];
    this.clearEvents();
  }

  /**
   * Toggle debug mode
   */
  toggleDebugMode(): boolean {
    this.setDebugMode(!this.debugMode);
    return this.debugMode;
  }

  /**
   * Clear all diagnostic events
   */
  clearEvents(): void {
    this.events = [];
    this.events$.next([]);
  }
}
