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
import { OnInit, inject, signal, DestroyRef } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  analyticsData = signal<InstructorAnalyticsResponse | null>(null);
  isLoading = signal(true);
  hasError = signal(false);
  errorMsg = signal('');

  private destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.isLoading.set(true);
    this.analyticsService.getStats()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (data) => {
          this.analyticsData.set(data);
        },
        error: (err) => {
          this.hasError.set(true);
          this.errorMsg.set(err?.error?.message ?? 'Failed to load data');
        }
      });
  }
}