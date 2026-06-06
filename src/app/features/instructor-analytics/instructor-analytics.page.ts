import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';


import { StatsCardsComponent } from './components/stats-cards/stats-cards.component';
import { SalesTableComponent } from './components/sales-table/sales-table.component';
import { RevenueChartComponent } from './components/revenue-chart/revenue-chart.component';

@Component({
  selector: 'app-instructor-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    StatsCardsComponent,
    SalesTableComponent,
    RevenueChartComponent
  ],
  templateUrl: './instructor-analytics.page.html',
  styleUrl: './instructor-analytics.page.css'
})
export class InstructorAnalyticsPageComponent { }