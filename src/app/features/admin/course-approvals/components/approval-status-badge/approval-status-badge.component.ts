import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApprovalStatus } from '../../models/course-approval.model';

@Component({
  selector: 'app-approval-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="statusClass">
      <span class="status-dot"></span>
      {{ label }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    /* Pending styling */
    .status-badge.pending {
      background-color: rgba(245, 158, 11, 0.1);
      color: #d97706;
    }
    .status-badge.pending .status-dot {
      background-color: #f59e0b;
    }

    /* Approved styling */
    .status-badge.approved {
      background-color: rgba(34, 197, 94, 0.1);
      color: #15803d;
    }
    .status-badge.approved .status-dot {
      background-color: #22c55e;
    }

    /* Rejected styling */
    .status-badge.rejected {
      background-color: rgba(239, 68, 68, 0.1);
      color: #b91c1c;
    }
    .status-badge.rejected .status-dot {
      background-color: #ef4444;
    }
  `]
})
export class ApprovalStatusBadgeComponent {
  @Input() status: ApprovalStatus = 'pending';

  get label(): string {
    return this.status;
  }

  get statusClass(): string {
    return this.status;
  }
}
