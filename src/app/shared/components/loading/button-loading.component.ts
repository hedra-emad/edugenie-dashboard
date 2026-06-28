import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-loading',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="btn-loading-wrapper" [class.is-loading]="loading">
      <span class="spinner" *ngIf="loading" [style.border-top-color]="spinnerColor"></span>
      <span class="btn-content">
        <ng-content></ng-content>
      </span>
    </span>
  `,
  styles: [`
    .btn-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-loading-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    :host-context(.btn-primary) .spinner,
    :host-context(button[style*="background"]) .spinner,
    :host-context(.bg-violet-600) .spinner,
    :host-context(.bg-red-600) .spinner,
    :host-context(.bg-rose-600) .spinner,
    :host-context(.bg-emerald-600) .spinner {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ButtonLoadingComponent {
  @Input() loading: boolean = false;
  @Input() spinnerColor: string = 'inherit';
}
