import { Component, OnInit, OnDestroy, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { filter, take, finalize, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
export class InstructorAnalyticsPageComponent implements OnInit, OnDestroy {
  private analyticsService = inject(InstructorAnalyticsService);
  private authService = inject(AuthService);

  analyticsData = signal<InstructorAnalyticsResponse | null>(null);
  isLoading = signal(true);
  hasError = signal(false);
  errorMsg = signal('');

  isAdmin = false;

  private userSub?: Subscription;
  private destroyRef = inject(DestroyRef);

  flaggedContent = [
    { contentName: 'Advanced Physics Lecture 4', type: 'Video', flagReason: 'Copyright Violation', reporter: 'Inst_Admin_A' },
    { contentName: 'User comment on "Intro to Bio"', type: 'Comment', flagReason: 'Inappropriate Language', reporter: 'Student_User_99' },
    { contentName: 'Data Structures 101', type: 'Course', flagReason: 'Spam/Misleading', reporter: 'System_Auto_Flag' }
  ];

  ngOnInit() {
    this.userSub = this.authService.currentUser$
      .pipe(
        filter(user => user !== null),
        take(1)
      )
      .subscribe(user => {
        this.isAdmin = user?.role === 'admin';

        if (this.isAdmin) {
          this.isLoading.set(false);
        } else {
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
      });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }
}