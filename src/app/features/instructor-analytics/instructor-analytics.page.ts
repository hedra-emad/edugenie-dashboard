import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';


import { StatsCardsComponent } from './components/stats-cards/stats-cards.component';
import { SalesTableComponent } from './components/sales-table/sales-table.component';
import { RevenueChartComponent } from './components/revenue-chart/revenue-chart.component';
import { InstructorAnalyticsService } from './services/instructor-analytics.service';
import { InstructorAnalyticsResponse } from './models/instructor-analytics.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-instructor-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    StatsCardsComponent,
    SalesTableComponent,
    RevenueChartComponent
  ],
  templateUrl: './instructor-analytics.page.html',
  styleUrl: './instructor-analytics.page.css'
})
export class InstructorAnalyticsPageComponent implements OnInit {
  private analyticsService = inject(InstructorAnalyticsService);

  analyticsData: InstructorAnalyticsResponse | null = null;
  isLoading = true;
  error = false;

  ngOnInit() {
    this.analyticsService.getStats()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => {
          this.analyticsData = data;
        },
        error: () => {
          this.error = true;
        }
      });
  }
}