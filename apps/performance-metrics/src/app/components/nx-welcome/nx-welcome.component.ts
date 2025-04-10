import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { LineController, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-nx-welcome',
  templateUrl: './nx-welcome.component.html',
  styleUrls: ['./nx-welcome.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressBarModule
  ]
})
export class NxWelcomeComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  chart?: Chart;

  title = 'Performance Metrics';

  metrics = [
    { label: 'Build Speed', value: '2.5s', progress: 90, color: 'primary' },
    { label: 'Test Coverage', value: '94%', progress: 94, color: 'accent' },
    { label: 'Performance Score', value: '98/100', progress: 98, color: 'warn' },
    { label: 'Bundle Size', value: '156KB', progress: 85, color: 'primary' }
  ];

  features = [
    {
      title: 'Fast Builds',
      description: 'Lightning-fast build times with smart caching and incremental compilation',
      icon: 'speed',
      iconColor: 'primary'
    },
    {
      title: 'Modern Testing',
      description: 'Comprehensive testing suite with Jest and Cypress integration',
      icon: 'science',
      iconColor: 'accent'
    },
    {
      title: 'Smart Analytics',
      description: 'Real-time performance metrics and insights',
      icon: 'insights',
      iconColor: 'warn'
    }
  ];

  chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Build Performance',
        data: [65, 59, 80, 81, 56, 55],
        fill: false,
        borderColor: '#6366f1',
        tension: 0.4
      },
      {
        label: 'Test Coverage',
        data: [28, 48, 40, 69, 86, 92],
        fill: false,
        borderColor: '#8b5cf6',
        tension: 0.4
      }
    ]
  };

  chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Performance Trends'
      }
    }
  };

  ngOnInit() {
    Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale);
  }

  ngAfterViewInit() {
    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: this.chartData,
      options: this.chartOptions
    });
  }
} 