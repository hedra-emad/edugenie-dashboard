import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CourseApproval, ApprovalStatus } from '../../models/course-approval.model';
import { ApprovalRowComponent } from '../approval-row/approval-row.component';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-approvals-table',
  standalone: true,
  imports: [CommonModule, MatIconModule, ApprovalRowComponent],
  templateUrl: './approvals-table.component.html',
  styles: [`
    .approvals-card {
      background-color: var(--color-surface, #ffffff);
      border-radius: var(--radius-md, 12px);
      box-shadow: var(--shadow-card, 0 4px 20px rgba(0, 0, 0, 0.08));
      border: 1px solid var(--color-border, #e5e7eb);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .card-header {
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--color-border, #e5e7eb);
    }

    .header-title-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-title-section h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text-primary, #1f2937);
    }

    .pending-badge {
      background-color: var(--color-primary-light, #5b3db8);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      min-width: 20px;
      text-align: center;
      box-shadow: 0 2px 5px rgba(91, 61, 184, 0.3);
    }

    .filter-wrapper {
      position: relative;
    }

    .filter-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      background-color: #ffffff;
      color: var(--color-text-secondary, #6b7280);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background-color: #f9fafb;
      color: var(--color-text-primary, #1f2937);
      border-color: #d1d5db;
    }

    .filter-btn.active {
      background-color: #ede9fe;
      color: var(--color-primary, #3b1892);
      border-color: var(--color-primary-light, #5b3db8);
    }

    .filter-dropdown {
      position: absolute;
      top: 44px;
      right: 0;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
      border: 1px solid var(--color-border, #e5e7eb);
      z-index: 50;
      width: 160px;
      padding: 4px;
      animation: slideDown 0.15s ease-out;
    }

    .filter-option {
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      text-align: left;
      font-size: 0.8125rem;
      color: var(--color-text-secondary, #6b7280);
      cursor: pointer;
      border-radius: 6px;
      transition: background-color 0.2s, color 0.2s;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .filter-option:hover {
      background-color: #f3f4f6;
      color: var(--color-text-primary, #1f2937);
    }

    .filter-option.selected {
      background-color: #f5f3ff;
      color: var(--color-primary, #3b1892);
      font-weight: 600;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      padding: 12px 20px;
      background-color: #f9fafb;
      color: var(--color-text-secondary, #6b7280);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--color-border, #e5e7eb);
    }

    th:last-child {
      text-align: right;
    }

    .empty-state {
      padding: 48px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      color: var(--color-text-secondary, #6b7280);
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--color-border, #e5e7eb);
    }

    .empty-text {
      font-size: 0.9375rem;
      font-weight: 500;
      margin: 0;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Mobile Responsive Layout */
    @media (max-width: 767px) {
      .table-container {
        overflow-x: visible;
        padding: 16px;
        background: #f9fafb;
      }
      
      table, thead, tbody, th, td, tr {
        display: block;
      }
      
      thead tr {
        display: none;
      }
      
      table { border: none; }
      
      .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      
      .filter-wrapper {
        width: 100%;
      }
      
      .filter-btn {
        width: 100%;
        justify-content: space-between;
      }
      
      .filter-dropdown {
        width: 100%;
      }
    }
  `]
})
export class ApprovalsTableComponent {
  @Input() courses: CourseApproval[] = [];
  @Input() actionLoading: Record<string, boolean> = {};

  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();

  currentFilter: FilterType = 'pending';
  showFilterDropdown = false;

  get pendingCount(): number {
    return this.courses.filter(c => c.status === 'pending').length;
  }

  get filteredCourses(): CourseApproval[] {
    if (this.currentFilter === 'all') {
      return this.courses;
    }
    return this.courses.filter(c => c.status === this.currentFilter);
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
    this.showFilterDropdown = false;
  }

  trackByCourseId(index: number, course: CourseApproval): string {
    return course.id;
  }
}
