import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-page-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-page">
      <div class="skeleton-header">
        <div class="skeleton-shimmer skeleton-title"></div>
        <div class="skeleton-shimmer skeleton-subtitle"></div>
      </div>
      <div class="skeleton-content">
        <div class="skeleton-shimmer skeleton-block"></div>
        <div class="skeleton-shimmer skeleton-block"></div>
        <div class="skeleton-shimmer skeleton-block"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-page {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 1.5rem;
    }
    .skeleton-header {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .skeleton-title {
      height: 2rem;
      width: 40%;
      border-radius: 8px;
    }
    .skeleton-subtitle {
      height: 1.25rem;
      width: 25%;
      border-radius: 6px;
    }
    .skeleton-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .skeleton-block {
      height: 150px;
      width: 100%;
      border-radius: 12px;
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
export class PageSkeletonComponent {}
