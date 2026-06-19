import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, TooltipItem } from 'chart.js';

@Component({
  selector: 'app-revenue-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './revenue-chart.component.html',
  styleUrl: './revenue-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RevenueChartComponent implements OnChanges {
  @Input() revenueChart: { labels: string[]; data: number[] } | undefined;

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        borderColor: '#4F46E5',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) {
            return 'rgba(79, 70, 229, 0.1)';
          }
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
          gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#4F46E5',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#94A3B8',
        bodyColor: '#FFFFFF',
        bodyFont: { size: 13 },
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          label: (context: TooltipItem<'line'>) => ' $' + context.parsed.y,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#94A3B8',
          font: { size: 10 },
        },
      },
      y: {
        min: 0,
        grid: { color: '#F1F5F9' },
        border: { display: false },
        ticks: {
          color: '#94A3B8',
          font: { size: 10 },
          callback: (value: number | string) => '$' + value,
        },
      },
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['revenueChart'] && this.revenueChart) {
      this.chartData = {
        labels: this.revenueChart.labels,
        datasets: [
          {
            data: this.revenueChart.data,
            borderColor: '#4F46E5',
            backgroundColor: (context: any) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;
              if (!chartArea) {
                return 'rgba(79, 70, 229, 0.1)';
              }
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
              gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#4F46E5',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          }
        ]
      };
    }
  }
}