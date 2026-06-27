import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay-container" *ngIf="show">
      <div class="spinner"></div>
      <div class="overlay-text" *ngIf="text">{{ text }}</div>
    </div>
  `,
  styles: [`
    .overlay-container {
      position: absolute;
      inset: 0;
      background-color: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(2px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 50;
      transition: opacity 0.3s ease;
      border-radius: inherit;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #F5F3FF;
      border-bottom-color: #8B5CF6; /* slightly darker for visibility, but matching theme */
      border-radius: 50%;
      animation: rotation 1s linear infinite;
    }
    .overlay-text {
      margin-top: 1rem;
      font-size: 0.875rem;
      color: #4B5563;
      font-weight: 500;
    }
    @keyframes rotation {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LoadingOverlayComponent {
  @Input() show: boolean = false;
  @Input() text: string = '';
}
