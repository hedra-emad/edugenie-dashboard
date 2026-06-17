import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { StatsCardsComponent } from './components/stats-cards/stats-cards.component';
import { SalesTableComponent } from './components/sales-table/sales-table.component';
import { RevenueChartComponent } from './components/revenue-chart/revenue-chart.component';
import { InstructorAnalyticsService } from './services/instructor-analytics.service';
import { InstructorAnalyticsResponse } from './models/instructor-analytics.model';
import { AuthService } from '../../core/services/auth.service';

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
  private authService = inject(AuthService);

  analyticsData: InstructorAnalyticsResponse | null = null;
  isLoading = true;
  error = false;
  isAdmin = false;

  flaggedContent = [
    { contentName: 'Advanced Physics Lecture 4', type: 'Video', flagReason: 'Copyright Violation', reporter: 'Inst_Admin_A' },
    { contentName: 'User comment on "Intro to Bio"', type: 'Comment', flagReason: 'Inappropriate Language', reporter: 'Student_User_99' },
    { contentName: 'Data Structures 101', type: 'Course', flagReason: 'Spam/Misleading', reporter: 'System_Auto_Flag' }
  ];

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.isAdmin = user?.role === 'admin';

    if (this.isAdmin) {
      this.isLoading = false;
    } else {
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
}