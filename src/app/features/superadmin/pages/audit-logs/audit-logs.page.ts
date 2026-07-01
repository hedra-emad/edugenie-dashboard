import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SuperadminService } from '../../services/superadmin.service';
import { AuditLogItem } from '../../models/superadmin.models';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule, MatSnackBarModule, PaginationComponent],
  providers: [DatePipe],
  templateUrl: './audit-logs.page.html',
  styleUrl: './audit-logs.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogsPageComponent implements OnInit, OnDestroy {
  private readonly superadminService = inject(SuperadminService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly datePipe = inject(DatePipe);

  Math = Math;

  isLoading = true;
  logs: AuditLogItem[] = [];
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  limit = 10;
  totalItems = 0;
  pageSizeOptions = [10, 25, 50];

  // Filters
  filterUserId = '';
  filterAction = '';
  filterStartDate = '';
  filterEndDate = '';

  private filterSubject = new Subject<void>();
  private sub?: Subscription;

  ngOnInit() {
    this.loadLogs();

    this.sub = this.filterSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadLogs();
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  onFilterChange() {
    this.filterSubject.next();
  }

  setActionFilter(action: string) {
    this.filterAction = action;
    this.currentPage = 1;
    this.loadLogs();
  }

  loadLogs() {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.superadminService.getAuditLogs(this.filterUserId, this.filterAction, this.filterStartDate, this.filterEndDate, this.currentPage, this.limit).subscribe({
      next: (res) => {
        this.logs = res.data || [];
        this.totalPages = res.meta?.totalPages || 1;
        this.totalItems = res.meta?.total || 0;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load audit logs', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Failed to load audit logs', 'Close', { duration: 3000 });
      }
    });
  }

  get pageNumbers(): number[] {
    return Array.from({length: this.totalPages}, (_, i) => i + 1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadLogs();
    }
  }

  setPageSize(size: number) {
    this.limit = size;
    this.currentPage = 1;
    this.loadLogs();
  }

  exportCSV() {
    if (this.logs.length === 0) {
      this.snackBar.open('No logs to export', 'Close', { duration: 3000 });
      return;
    }

    const headers = ['Timestamp', 'Performed By', 'Action', 'Target User', 'Details'];
    const rows = this.logs.map(log => {
      const detailsStr = log.details ? JSON.stringify(log.details) : '{}';
      return [
        this.datePipe.transform(log.createdAt, 'yyyy-MM-dd HH:mm:ss') || '',
        `"${log.performedBy.name.replace(/"/g, '""')}"`,
        `"${log.action.replace(/"/g, '""')}"`,
        `"${log.targetUser.name.replace(/"/g, '""')}"`,
        `"${detailsStr.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
