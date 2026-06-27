import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="avatar-skeleton" 
      [ngClass]="customClass"
      [style.width]="size"
      [style.height]="size"
      [style.border-radius]="circular ? '50%' : '8px'"
    ></div>
  `,
  styles: [`
    .avatar-skeleton {
      background: linear-gradient(90deg, #F5F3FF 25%, #EDE9FE 50%, #F5F3FF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
      display: inline-block;
      flex-shrink: 0;
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
export class AvatarSkeletonComponent {
  @Input() size: string = '40px';
  @Input() circular: boolean = true;
  @Input() customClass: string = '';
}
