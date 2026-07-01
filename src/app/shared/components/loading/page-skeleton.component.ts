import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-skeleton" [ngClass]="customClass">
      <!-- Header Skeleton -->
      <div class="header-section">
        <div class="shimmer badge-line" *ngIf="showBadge"></div>
        <div class="shimmer title-line"></div>
        <div class="shimmer subtitle-line"></div>
      </div>

      <!-- Content grid/layout -->
      <div class="content-section">
        <!-- Top statistics cards block (optional) -->
        <div class="stats-grid" *ngIf="showStats">
          <div class="shimmer stat-card" *ngFor="let i of [1, 2, 3]"></div>
        </div>

        <!-- Main section skeleton -->
        <div class="main-block">
          <div class="shimmer bar-header mb-4"></div>
          <div class="flex flex-col gap-4">
            <div class="shimmer row-item" *ngFor="let item of [1, 2, 3, 4]"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-skeleton {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 32px;
      padding: 16px 0;
    }
    .shimmer {
      background: linear-gradient(90deg, #F5F3FF 25%, #EDE9FE 50%, #F5F3FF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
      border-radius: 8px;
    }
    .header-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 600px;
    }
    .badge-line {
      height: 20px;
      width: 120px;
      border-radius: 12px;
    }
    .title-line {
      height: 32px;
      width: 50%;
      min-width: 200px;
    }
    .subtitle-line {
      height: 16px;
      width: 75%;
    }
    .content-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
      gap: 16px;
    }
    @media (min-width: 768px) {
      .stats-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    .stat-card {
      height: 100px;
      border-radius: 16px;
    }
    .main-block {
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      background: #ffffff;
    }
    .bar-header {
      height: 24px;
      width: 150px;
    }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-4 { gap: 16px; }
    .mb-4 { margin-bottom: 16px; }
    .row-item {
      height: 48px;
      border-radius: 12px;
    }
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
  `]
})
export class PageSkeletonComponent {
  @Input() showBadge: boolean = true;
  @Input() showStats: boolean = true;
  @Input() customClass: string = '';
}
