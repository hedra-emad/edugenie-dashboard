import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card-skeleton" [ngClass]="customClass">
      <!-- Media/Image block if enabled -->
      <div *ngIf="showImage" class="shimmer media-block"></div>
      
      <!-- Content container -->
      <div class="card-content">
        <!-- Title line -->
        <div class="shimmer title-line"></div>
        
        <!-- Multi-line body lines -->
        <div class="body-lines">
          <div class="shimmer body-line w-full"></div>
          <div class="shimmer body-line w-5/6"></div>
          <div class="shimmer body-line w-2/3"></div>
        </div>
        
        <!-- Footer action/meta block -->
        <div *ngIf="showFooter" class="footer-block mt-4 flex items-center justify-between">
          <div class="shimmer footer-item w-1/4"></div>
          <div class="shimmer footer-item w-1/3"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-skeleton {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .shimmer {
      background: linear-gradient(90deg, #F5F3FF 25%, #EDE9FE 50%, #F5F3FF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
      border-radius: 8px;
    }
    .media-block {
      width: 100%;
      aspect-ratio: 16 / 9;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .title-line {
      height: 20px;
      width: 60%;
      border-radius: 6px;
    }
    .body-lines {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .body-line {
      height: 12px;
      border-radius: 4px;
    }
    .footer-block {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .footer-item {
      height: 14px;
      border-radius: 4px;
    }
    /* Fractional widths (w-5/6, w-2/3, w-1/2, w-1/3, w-1/4) come from Tailwind's
       global utilities — defining them here duplicated them and the unescaped
       "/" in the selector was invalid CSS. */
    .w-full { width: 100%; }
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
export class CardSkeletonComponent {
  @Input() showImage = true;
  @Input() showFooter = true;
  @Input() customClass = '';
}
