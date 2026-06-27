import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-card" [style.height]="height">
      <div class="skeleton-shimmer skeleton-img" *ngIf="hasImage"></div>
      <div class="skeleton-content">
        <div class="skeleton-shimmer skeleton-title"></div>
        <div class="skeleton-shimmer skeleton-text"></div>
        <div class="skeleton-shimmer skeleton-text short"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-card {
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      background-color: #fff;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .skeleton-content {
      padding: 1.25rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .skeleton-shimmer {
      background: linear-gradient(90deg, #F5F3FF 25%, #EDE9FE 50%, #F5F3FF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }
    .skeleton-img {
      height: 160px;
      width: 100%;
      border-radius: 0;
    }
    .skeleton-title {
      height: 1.25rem;
      width: 60%;
      margin-bottom: 0.5rem;
    }
    .skeleton-text {
      height: 1rem;
      width: 100%;
    }
    .skeleton-text.short {
      width: 80%;
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `]
})
export class CardSkeletonComponent {
  @Input() height: string = 'auto';
  @Input() hasImage: boolean = true;
}
