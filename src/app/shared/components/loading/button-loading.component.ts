import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button-loading',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="button-loading-container">
      <ng-container *ngIf="loading">
        <span class="loader"></span>
      </ng-container>
      <span [class.invisible]="loading" class="content">
        <ng-content></ng-content>
      </span>
    </span>
  `,
  styles: [`
    .button-loading-container {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .invisible {
      visibility: hidden;
      opacity: 0;
    }
    .content {
      transition: opacity 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .loader {
      position: absolute;
      width: 1em;
      height: 1em;
      border: 2px solid #F5F3FF;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
    }
    @keyframes rotation {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class ButtonLoadingComponent {
  @Input() loading: boolean = false;
}
