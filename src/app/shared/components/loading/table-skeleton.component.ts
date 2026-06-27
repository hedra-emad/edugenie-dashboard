import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-table">
      <div class="skeleton-header">
        <div class="skeleton-shimmer skeleton-cell" *ngFor="let c of colsArray"></div>
      </div>
      <div class="skeleton-row" *ngFor="let r of rowsArray">
        <div class="skeleton-shimmer skeleton-cell" *ngFor="let c of colsArray"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-table {
      width: 100%;
      display: flex;
      flex-direction: column;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #f3f4f6;
    }
    .skeleton-header, .skeleton-row {
      display: flex;
      padding: 1rem;
      border-bottom: 1px solid #f3f4f6;
      gap: 1rem;
    }
    .skeleton-header {
      background-color: #f9fafb;
    }
    .skeleton-row:last-child {
      border-bottom: none;
    }
    .skeleton-cell {
      flex: 1;
      height: 1.25rem;
      border-radius: 4px;
    }
    .skeleton-shimmer {
      background: linear-gradient(90deg, #F5F3FF 25%, #EDE9FE 50%, #F5F3FF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `]
})
export class TableSkeletonComponent {
  @Input() rows: number = 5;
  @Input() columns: number = 4;

  get rowsArray() { return Array(this.rows).fill(0); }
  get colsArray() { return Array(this.columns).fill(0); }
}
