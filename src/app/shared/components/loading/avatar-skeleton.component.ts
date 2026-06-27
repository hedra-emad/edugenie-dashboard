import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  selector: 'app-avatar-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="skeleton-avatar" 
      [style.width]="size + 'px'" 
      [style.height]="size + 'px'"
      [style.border-radius]="rounded ? '50%' : '8px'">
    </div>
  `,
  styles: [`
    .skeleton-avatar {
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
export class AvatarSkeletonComponent {
  @Input() size: number = 40;
  @Input() rounded: boolean = true;
}
