import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, filter, take, finalize } from 'rxjs';
import { PageSkeletonComponent, ButtonLoadingComponent } from '../../shared/components/loading';
import { StatsCardsComponent } from './components/stats-cards/stats-cards.component';
import { SalesTableComponent } from './components/sales-table/sales-table.component';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
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
    BaseChartDirective,
    PageSkeletonComponent,
    ButtonLoadingComponent
  ],
  templateUrl: './instructor-analytics.page.html',
  styleUrl: './instructor-analytics.page.css'
})
export class InstructorAnalyticsPageComponent implements OnInit, OnDestroy {
  private analyticsService = inject(InstructorAnalyticsService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  // Instructor view
  analyticsData: InstructorAnalyticsResponse | null = null;
  recentSalesData: any[] = [];
  isLoading = true;
  error = false;

  // Admin view
  isAdmin = false;
  adminStatsData: any = null;
  platformData: any = null;
  adminStatsLoading = true;
  adminStatsError = false;

  adminCoursesChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  adminCoursesChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#3B1892',
        titleFont: { size: 14, family: "'Inter', sans-serif", weight: 'bold' },
        bodyFont: { size: 13, family: "'Inter', sans-serif" },
        padding: 14,
        cornerRadius: 12,
        displayColors: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: true, color: 'rgba(226, 232, 240, 0.6)' },
        border: { display: false, dash: [5, 5] },
        ticks: { color: '#94a3b8', font: { family: "'Inter', sans-serif", size: 11 }, padding: 10 }
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#64748b',
          font: { family: "'Inter', sans-serif", weight: 'bold', size: 10 },
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false
        }
      }
    }
  };

  private sub?: Subscription;

  // Instructor charts
  instructorPayoutDonutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  instructorStudentsBarData: ChartData<'bar'> = { labels: [], datasets: [] };
  instructorEarningsLineData: ChartData<'line'> = { labels: [], datasets: [] };
  instructorEarningsChangeData: ChartData<'bar'> = { labels: [], datasets: [] };

  instructorEarningsChangeOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(59,24,146,0.95)',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(226,232,240,0.6)' },
        border: { display: false }
      },
      x: {
        ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } },
        grid: { display: false },
        border: { display: false }
      }
    }
  };

  instructorPayoutHasData = false;

  instructorStudentsOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'x',
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(59,24,146,0.95)',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#64748b' }, grid: { color: 'rgba(226,232,240,0.6)' } },
      x: { ticks: { color: '#64748b' }, grid: { display: false } }
    }
  };

  instructorChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  flaggedContent: any[] = [];
  openReportsLoading = true;

  ngOnInit() {
    // If auth is already initialized, use getCurrentUser() directly — no need to wait
    if (this.authService.getCurrentUser() !== null) {
      this.initWithUser();
      return;
    }

    // Otherwise wait for auth to finish initializing
    this.sub = this.authService.authInitialized$
      .pipe(
        filter(initialized => initialized === true),
        take(1)
      )
      .subscribe(() => {
        this.initWithUser();
        this.cdr.detectChanges();
      });
  }

  // Public refresh for manual re-fetching
  refreshData(): void {
    // Reset loading flags appropriately and re-run initWithUser
    this.isLoading = true;
    this.adminStatsLoading = true;
    this.initWithUser();
  }

  exportCsv(): void {
    if (!this.analyticsData) return;

    const rows: string[][] = [];
    rows.push(['Metric', 'Value']);
    rows.push(['Total Earnings', String(this.analyticsData.totalEarnings ?? '')]);
    rows.push(['Earnings Change Percent', String(this.analyticsData.earningsChangePercent ?? '')]);
    rows.push(['Total Students', String(this.analyticsData.totalStudents ?? '')]);
    rows.push(['New Students This Week', String(this.analyticsData.newStudentsThisWeek ?? '')]);
    rows.push(['Average Rating', String(this.analyticsData.averageRating ?? '')]);
    rows.push(['Total Courses', String(this.analyticsData.totalCourses ?? '')]);
    rows.push(['Pending Payouts', String(this.analyticsData.pendingPayouts ?? '')]);
    rows.push(['Next Payout Date', String(this.analyticsData.nextPayoutDate ?? '')]);

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `instructor-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private initWithUser(): void {
    const user = this.authService.getCurrentUser();
    this.isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    if (this.isAdmin) {
      this.isLoading = false;
      this.analyticsService.getAdminStats()
        .pipe(finalize(() => {
          this.adminStatsLoading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (data) => {
            this.adminStatsData = data;
            this.cdr.detectChanges();
          },
          error: () => {
            this.adminStatsError = true;
            this.adminStatsLoading = false;
            this.cdr.detectChanges();
          }
        });

      this.analyticsService.getPlatformAnalytics('30d')
        .subscribe({
          next: (data) => {
            if (!data) {
              this.platformData = { error: true, topCourses: [], topInstructors: [], totalUsers: 0, totalStudents: 0, totalInstructors: 0 };
            } else {
              this.platformData = data;

              // Map top courses data for the bar chart
              if (data.topCourses && data.topCourses.length > 0) {
                const topItems = data.topCourses.slice(0, 4);
                this.adminCoursesChartData = {
                  labels: topItems.map((c: any) => {
                    const title = c.title;
                    if (title.length > 15) {
                      const splitIndex = title.lastIndexOf(' ', 15);
                      const breakPoint = splitIndex > 0 ? splitIndex : 15;
                      return [title.substring(0, breakPoint), title.substring(breakPoint).trim().substring(0, 15) + (title.length > 30 ? '...' : '')];
                    }
                    return title;
                  }),
                  datasets: [{
                    label: 'Enrollments',
                    data: topItems.map((c: any) => c.enrollments),
                    backgroundColor: (ctx) => {
                      const canvas = ctx.chart.ctx;
                      const gradient = canvas.createLinearGradient(0, 0, 0, 300);
                      gradient.addColorStop(0, '#3B1892');
                      gradient.addColorStop(1, 'rgba(124, 58, 237, 0.2)');
                      return gradient;
                    },
                    hoverBackgroundColor: '#2d1170',
                    borderRadius: 12,
                    barPercentage: 0.5,
                    borderSkipped: false
                  }]
                };
              } else {
                this.adminCoursesChartData = { labels: [], datasets: [] };
              }
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Failed to fetch platform analytics:', err);
            // Set empty object or specific error state so the spinner stops
            this.platformData = { error: true, topCourses: [], topInstructors: [], totalUsers: 0, totalStudents: 0, totalInstructors: 0 };
            this.cdr.detectChanges();
          }
        });

      this.analyticsService.getOpenReports()
        .pipe(finalize(() => {
          this.openReportsLoading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (data) => {
            this.flaggedContent = data?.reports || data || [];
            this.cdr.detectChanges();
          },
          error: () => {
            this.openReportsLoading = false;
            this.cdr.detectChanges();
          }
        });
    } else {
      this.adminStatsLoading = false;
      this.analyticsService.getStats()
        .pipe(finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: (data) => {
            this.analyticsData = data;
            this.analyticsService.getRecentSales().subscribe({
              next: (sales) => {
                this.recentSalesData = sales;
                this.cdr.detectChanges();
              },
              error: () => {
                this.recentSalesData = [];
                this.cdr.detectChanges();
              }
            });
            // Build instructor charts from backend data
            const pending = data.pendingPayouts ?? 0;
            const total = data.totalEarnings ?? 0;
            const available = Math.max(0, total - pending);
            this.instructorPayoutHasData = (pending > 0 || available > 0);
            if (this.instructorPayoutHasData) {
              this.instructorPayoutDonutData = {
                labels: ['Pending', 'Available'],
                datasets: [{ data: [pending, available], backgroundColor: ['#f43f5e', '#10b981'] }]
              };
            } else {
              // show neutral slice when no data
              this.instructorPayoutDonutData = {
                labels: ['No Data'],
                datasets: [{ data: [1], backgroundColor: ['#e6e9ee'] }]
              };
            }

            this.instructorStudentsBarData = {
              labels: ['Total Students', 'New This Week'],
              datasets: [{ data: [data.totalStudents ?? 0, data.newStudentsThisWeek ?? 0], backgroundColor: ['#3B1892', '#00B0FF'], borderRadius: 8, barThickness: 20 }]
            };

            // Build a small previous vs current earnings chart from total + change percent
            const pct = data.earningsChangePercent ?? 0;
            let previous = 0;
            if (pct === -100) {
              previous = 0;
            } else {
              previous = total / (1 + (pct / 100));
            }
            // guard NaN / infinite
            if (!isFinite(previous) || isNaN(previous)) previous = 0;

            this.instructorEarningsChangeData = {
              labels: ['Previous', 'Current'],
              datasets: [{ data: [Math.round(previous), Math.round(total)], backgroundColor: ['#94a3b8', '#4F46E5'], borderRadius: 6 }]
            };
            // also keep a lightweight line dataset for future use
            this.instructorEarningsLineData = {
              labels: ['Change'],
              datasets: [{ data: [pct], borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.2)', fill: true }]
            };
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = true;
            this.cdr.detectChanges();
          }
        });
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
