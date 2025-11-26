// File: /c:/repos/performance-metrics/apps/performance-metrics/src/app/helpers/mcp-helpers.ts

/**
 * Helper functions for MCP Metrics Component
 */

/**
 * Formats a number to a fixed decimal place.
 * @param value - The number to format.
 * @param decimals - The number of decimal places.
 * @returns The formatted number as a string.
 */
export function formatNumber(value: number, decimals: number): string {
    return value.toFixed(decimals);
}

/**
 * Calculates the percentage change between two numbers.
 * @param oldValue - The initial value.
 * @param newValue - The new value.
 * @returns The percentage change as a number.
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
        return newValue > 0 ? 100 : 0;
    }
    return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Converts a timestamp to a human-readable date string.
 * @param timestamp - The timestamp to convert.
 * @returns The formatted date string.
 */
export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

/**
 * Calculates the stroke-dasharray value for a CPU gauge.
 * The circumference of the circle is 2πr (with r=50, that's ~314.16).
 * We calculate the filled part based on the CPU percentage.
 * 
 * @param cpuUsage - CPU usage percentage (0-100)
 * @returns The stroke-dasharray value as a string
 */
export function getCpuDashArrayHelper(cpuUsage: number): string {
    const circumference = 2 * Math.PI * 50;
    const filledPercent = cpuUsage / 100;
    const filled = circumference * filledPercent;
    const empty = circumference - filled;
    return `${filled} ${empty}`;
}

/**
 * Calculates the stroke-dasharray value for a Memory gauge.
 * Similar to CPU gauge but for memory usage percentage.
 * 
 * @param memoryPercentage - Memory usage percentage (0-100)
 * @returns The stroke-dasharray value as a string
 */
export function getMemoryDashArrayHelper(memoryPercentage: number): string {
    const circumference = 2 * Math.PI * 50;
    const filledPercent = memoryPercentage / 100;
    const filled = circumference * filledPercent;
    const empty = circumference - filled;
    return `${filled} ${empty}`;
}

/**
 * Returns the CSS class based on a detailed metric's status.
 * 
 * @param metric - The detailed metric object with a status property
 * @returns The CSS class name for the metric's status
 */
export function getMetricStatusClassHelper(metric: { status: string } | undefined | null): string {
    if (!metric) return 'status-unknown';
    
    switch(metric.status.toLowerCase()) {
        case 'normal':
            return 'status-normal';
        case 'warning':
            return 'status-warning';
        case 'critical':
            return 'status-critical';
        default:
            return 'status-unknown';
    }
}

/**
 * Returns the Material icon name based on the trend string.
 * 
 * @param trend - The trend direction ('up', 'down', or 'stable')
 * @returns The Material icon name
 */
export function getTrendIconHelper(trend: string): string {
    switch(trend.toLowerCase()) {
        case 'up':
            return 'trending_up';
        case 'down':
            return 'trending_down';
        case 'stable':
            return 'trending_flat';
        default:
            return 'help_outline';
    }
}