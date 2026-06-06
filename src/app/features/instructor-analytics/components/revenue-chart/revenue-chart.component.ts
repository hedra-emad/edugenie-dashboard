import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, TooltipItem } from 'chart.js';

@Component({
  selector: 'app-revenue-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './revenue-chart.component.html',
  styleUrl: './revenue-chart.component.css',
})
export class RevenueChartComponent {

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Sep 15', 'Sep 22', 'Sep 29', 'Oct 06', 'Oct 13', 'Today'],
    datasets: [
      {
        data: [30, 110, 165, 265, 210, 480],
        borderColor: '#00B0FF',
        borderWidth: 2.5,
        pointBackgroundColor: 'white',
        pointBorderColor: '#00B0FF',
        pointBorderWidth: 2.5,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.45,
        fill: true,
        backgroundColor: (context: { chart: any }) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(0, 176, 255, 0.18)');
          gradient.addColorStop(1, 'rgba(0, 176, 255, 0.01)');
          return gradient;
        },
      },
    ],
  };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
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
          maxRotation: 30,
          minRotation: 0,
        },
      },
      y: {
        min: 0,
        max: 500,
        grid: { color: '#F1F5F9' },
        border: { display: false },
        ticks: {
          color: '#94A3B8',
          font: { size: 10 },
          stepSize: 250,
          callback: (value: number | string) => '$' + value,
        },
      },
    },
  };
}